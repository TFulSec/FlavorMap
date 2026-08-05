const crypto = require('crypto');
const { getPool, sql } = require('../../config/db');
const httpError = require('../../utils/httpError');
const mockStore = require('./voteRooms.mockStore');

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_CODE_ATTEMPTS = 8;

const makeRoomCode = () => {
  const bytes = crypto.randomBytes(6);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
};

const isDuplicateKey = (error) => error?.number === 2601 || error?.number === 2627;
const isGuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const mapRoom = (room, restaurants, myVoteRestaurantId = null) => ({
  id: room.Id,
  code: room.Code,
  status: room.Status,
  createdAtUtc: room.CreatedAtUtc,
  createdByUserId: room.CreatedByUserId,
  myVoteRestaurantId: myVoteRestaurantId ? String(myVoteRestaurantId) : null,
  restaurants: restaurants.map((item) => ({
    id: item.Id,
    name: item.Name,
    slug: item.Slug,
    address: item.Address,
    bannerUrl: item.BannerUrl,
    rating: item.Rating,
    voteCount: Number(item.VoteCount || 0),
  })),
});

const createRoom = async ({ creatorUserId, restaurantIds }) => {
  const pool = await getPool();

  if (pool.__isMock) {
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
      const code = makeRoomCode();
      if (!mockStore.rooms.has(code)) {
        const room = mockStore.createRoom({ code, creatorUserId, restaurantIds });
        return { id: room.Id, code: room.Code, status: room.Status, createdAtUtc: room.CreatedAtUtc };
      }
    }
    throw httpError(503, 'Không thể tạo mã phòng duy nhất. Vui lòng thử lại.');
  }

  if (!restaurantIds.every(isGuid)) {
    throw httpError(400, 'restaurantIds phải là UUID hợp lệ khi dùng SQL Server.');
  }

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const code = makeRoomCode();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin(sql.ISOLATION_LEVEL.READ_COMMITTED);

      const validRestaurants = await transaction.request()
        .input('RestaurantIdsJson', sql.NVarChar(sql.MAX), JSON.stringify(restaurantIds))
        .query(`
          SELECT r.Id
          FROM Restaurants r
          INNER JOIN OPENJSON(@RestaurantIdsJson)
            WITH (Id UNIQUEIDENTIFIER '$') ids ON ids.Id = r.Id
          WHERE r.PublicationStatus = N'Published'
            AND r.VerificationStatus = N'Verified';
        `);

      if (validRestaurants.recordset.length !== restaurantIds.length) {
        throw httpError(400, 'Danh sách quán ăn chứa ID không tồn tại hoặc bị trùng.');
      }

      const roomResult = await transaction.request()
        .input('Code', sql.Char(6), code)
        .input('CreatedByUserId', sql.UniqueIdentifier, creatorUserId)
        .query(`
          INSERT INTO VoteRooms (Code, CreatedByUserId)
          OUTPUT INSERTED.Id, INSERTED.Code, INSERTED.Status, INSERTED.CreatedAtUtc
          VALUES (@Code, @CreatedByUserId);
        `);

      const room = roomResult.recordset[0];

      await transaction.request()
        .input('RoomId', sql.UniqueIdentifier, room.Id)
        .input('RestaurantIdsJson', sql.NVarChar(sql.MAX), JSON.stringify(restaurantIds))
        .query(`
          INSERT INTO VoteRoomRestaurants (RoomId, RestaurantId)
          SELECT @RoomId, ids.Id
          FROM OPENJSON(@RestaurantIdsJson)
            WITH (Id UNIQUEIDENTIFIER '$') ids;
        `);

      await transaction.commit();
      return {
        id: room.Id,
        code: room.Code.trim(),
        status: room.Status,
        createdAtUtc: room.CreatedAtUtc,
  createdByUserId: room.CreatedByUserId,
      };
    } catch (error) {
      try {
        await transaction.rollback();
      } catch {
        // Ignore rollback errors; original error is more useful.
      }

      if (isDuplicateKey(error)) continue;
      throw error;
    }
  }

  throw httpError(503, 'Không thể tạo mã phòng duy nhất. Vui lòng thử lại.');
};

const getRoomByCode = async (code, userIdentifier = null) => {
  const pool = await getPool();

  if (pool.__isMock) {
    const room = mockStore.rooms.get(code);
    if (!room) throw httpError(404, 'Không tìm thấy phòng bình chọn.');

    const restaurants = room.restaurants.map((item) => ({
      Id: item.RestaurantId,
      Name: `Mock Restaurant ${item.RestaurantId}`,
      Slug: `mock-${item.RestaurantId}`,
      Address: '',
      BannerUrl: null,
      Rating: 0,
      VoteCount: item.VoteCount,
    }));
    return mapRoom(room, restaurants, userIdentifier ? room.votes.get(userIdentifier) : null);
  }

  const result = await pool.request()
    .input('Code', sql.Char(6), code)
    .input('UserIdentifier', sql.NVarChar(128), userIdentifier || null)
    .query(`
      SELECT Id, Code, Status, CreatedAtUtc, CreatedByUserId
      FROM VoteRooms
      WHERE Code = @Code;

      SELECT
        r.Id,
        r.Name,
        r.Slug,
        r.Address,
        r.BannerUrl,
        r.Rating,
        vrr.VoteCount
      FROM VoteRoomRestaurants vrr
      INNER JOIN VoteRooms vr ON vr.Id = vrr.RoomId
      INNER JOIN Restaurants r ON r.Id = vrr.RestaurantId
      WHERE vr.Code = @Code
        AND r.PublicationStatus = N'Published'
        AND r.VerificationStatus = N'Verified'
      ORDER BY vrr.VoteCount DESC, r.Rating DESC, r.Name ASC;

      SELECT TOP (1) v.RestaurantId
      FROM Votes v
      INNER JOIN VoteRooms vr ON vr.Id = v.RoomId
      WHERE vr.Code = @Code
        AND @UserIdentifier IS NOT NULL
        AND v.UserIdentifier = @UserIdentifier;
    `);

  const room = result.recordsets?.[0]?.[0];
  if (!room) throw httpError(404, 'Không tìm thấy phòng bình chọn.');

  const myVoteRestaurantId = result.recordsets?.[2]?.[0]?.RestaurantId || null;
  return mapRoom(room, result.recordsets?.[1] || [], myVoteRestaurantId);
};

const vote = async ({ code, restaurantId, userIdentifier }) => {
  const pool = await getPool();

  if (pool.__isMock) {
    const room = mockStore.rooms.get(code);
    if (!room) throw httpError(404, 'Không tìm thấy phòng bình chọn.');
    if (room.Status !== 'open') throw httpError(409, 'Phòng bình chọn đã đóng.');

    const targetRestaurant = room.restaurants.find(
      (item) => item.RestaurantId === String(restaurantId)
    );
    if (!targetRestaurant) throw httpError(400, 'Quán ăn không thuộc phòng bình chọn này.');

    const previousRestaurantId = room.votes.get(userIdentifier) || null;

    // Bấm lại đúng quán đã chọn: bỏ phiếu hiện tại.
    if (previousRestaurantId === String(restaurantId)) {
      room.votes.delete(userIdentifier);
      targetRestaurant.VoteCount = Math.max(0, targetRestaurant.VoteCount - 1);
      return {
        action: 'removed',
        previousRestaurantId,
        selectedRestaurantId: null,
        restaurantId: String(restaurantId),
        voteCount: targetRestaurant.VoteCount,
      };
    }

    // Chọn quán khác: chuyển phiếu trong cùng một thao tác.
    if (previousRestaurantId) {
      const previousRestaurant = room.restaurants.find(
        (item) => item.RestaurantId === String(previousRestaurantId)
      );
      if (previousRestaurant) {
        previousRestaurant.VoteCount = Math.max(0, previousRestaurant.VoteCount - 1);
      }
      room.votes.set(userIdentifier, String(restaurantId));
      targetRestaurant.VoteCount += 1;
      return {
        action: 'changed',
        previousRestaurantId,
        selectedRestaurantId: String(restaurantId),
        restaurantId: String(restaurantId),
        voteCount: targetRestaurant.VoteCount,
      };
    }

    // Chưa có phiếu: tạo bình chọn mới.
    room.votes.set(userIdentifier, String(restaurantId));
    targetRestaurant.VoteCount += 1;
    return {
      action: 'created',
      previousRestaurantId: null,
      selectedRestaurantId: String(restaurantId),
      restaurantId: String(restaurantId),
      voteCount: targetRestaurant.VoteCount,
    };
  }

  if (!isGuid(restaurantId)) {
    throw httpError(400, 'restaurantId phải là UUID hợp lệ khi dùng SQL Server.');
  }

  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin(sql.ISOLATION_LEVEL.READ_COMMITTED);

    // Khóa phòng trong transaction để việc thêm, bỏ hoặc đổi phiếu luôn nhất quán.
    const roomResult = await transaction.request()
      .input('Code', sql.Char(6), code)
      .query(`
        SELECT Id, Status
        FROM VoteRooms WITH (UPDLOCK, HOLDLOCK)
        WHERE Code = @Code;
      `);

    const room = roomResult.recordset[0];
    if (!room) throw httpError(404, 'Không tìm thấy phòng bình chọn.');
    if (room.Status !== 'open') throw httpError(409, 'Phòng bình chọn đã đóng.');

    const targetResult = await transaction.request()
      .input('RoomId', sql.UniqueIdentifier, room.Id)
      .input('RestaurantId', sql.UniqueIdentifier, restaurantId)
      .query(`
        SELECT VoteCount
        FROM VoteRoomRestaurants WITH (UPDLOCK, HOLDLOCK)
        WHERE RoomId = @RoomId AND RestaurantId = @RestaurantId;
      `);

    if (targetResult.recordset.length === 0) {
      throw httpError(400, 'Quán ăn không thuộc phòng bình chọn này.');
    }

    const existingVoteResult = await transaction.request()
      .input('RoomId', sql.UniqueIdentifier, room.Id)
      .input('UserIdentifier', sql.NVarChar(128), userIdentifier)
      .query(`
        SELECT TOP (1) RestaurantId
        FROM Votes WITH (UPDLOCK, HOLDLOCK)
        WHERE RoomId = @RoomId AND UserIdentifier = @UserIdentifier;
      `);

    const previousRestaurantId = existingVoteResult.recordset[0]?.RestaurantId || null;
    let action;
    let selectedRestaurantId;
    let voteCount;

    if (!previousRestaurantId) {
      await transaction.request()
        .input('RoomId', sql.UniqueIdentifier, room.Id)
        .input('RestaurantId', sql.UniqueIdentifier, restaurantId)
        .input('UserIdentifier', sql.NVarChar(128), userIdentifier)
        .query(`
          INSERT INTO Votes (RoomId, RestaurantId, UserIdentifier)
          VALUES (@RoomId, @RestaurantId, @UserIdentifier);
        `);

      const incrementResult = await transaction.request()
        .input('RoomId', sql.UniqueIdentifier, room.Id)
        .input('RestaurantId', sql.UniqueIdentifier, restaurantId)
        .query(`
          UPDATE VoteRoomRestaurants
          SET VoteCount = VoteCount + 1
          OUTPUT INSERTED.VoteCount
          WHERE RoomId = @RoomId AND RestaurantId = @RestaurantId;
        `);

      action = 'created';
      selectedRestaurantId = restaurantId;
      voteCount = Number(incrementResult.recordset[0].VoteCount);
    } else if (String(previousRestaurantId) === String(restaurantId)) {
      await transaction.request()
        .input('RoomId', sql.UniqueIdentifier, room.Id)
        .input('UserIdentifier', sql.NVarChar(128), userIdentifier)
        .query(`
          DELETE FROM Votes
          WHERE RoomId = @RoomId AND UserIdentifier = @UserIdentifier;
        `);

      const decrementResult = await transaction.request()
        .input('RoomId', sql.UniqueIdentifier, room.Id)
        .input('RestaurantId', sql.UniqueIdentifier, restaurantId)
        .query(`
          UPDATE VoteRoomRestaurants
          SET VoteCount = CASE WHEN VoteCount > 0 THEN VoteCount - 1 ELSE 0 END
          OUTPUT INSERTED.VoteCount
          WHERE RoomId = @RoomId AND RestaurantId = @RestaurantId;
        `);

      action = 'removed';
      selectedRestaurantId = null;
      voteCount = Number(decrementResult.recordset[0].VoteCount);
    } else {
      await transaction.request()
        .input('RoomId', sql.UniqueIdentifier, room.Id)
        .input('UserIdentifier', sql.NVarChar(128), userIdentifier)
        .input('RestaurantId', sql.UniqueIdentifier, restaurantId)
        .query(`
          UPDATE Votes
          SET RestaurantId = @RestaurantId
          WHERE RoomId = @RoomId AND UserIdentifier = @UserIdentifier;
        `);

      await transaction.request()
        .input('RoomId', sql.UniqueIdentifier, room.Id)
        .input('PreviousRestaurantId', sql.UniqueIdentifier, previousRestaurantId)
        .query(`
          UPDATE VoteRoomRestaurants
          SET VoteCount = CASE WHEN VoteCount > 0 THEN VoteCount - 1 ELSE 0 END
          WHERE RoomId = @RoomId AND RestaurantId = @PreviousRestaurantId;
        `);

      const incrementResult = await transaction.request()
        .input('RoomId', sql.UniqueIdentifier, room.Id)
        .input('RestaurantId', sql.UniqueIdentifier, restaurantId)
        .query(`
          UPDATE VoteRoomRestaurants
          SET VoteCount = VoteCount + 1
          OUTPUT INSERTED.VoteCount
          WHERE RoomId = @RoomId AND RestaurantId = @RestaurantId;
        `);

      action = 'changed';
      selectedRestaurantId = restaurantId;
      voteCount = Number(incrementResult.recordset[0].VoteCount);
    }

    await transaction.commit();
    return {
      action,
      previousRestaurantId: previousRestaurantId ? String(previousRestaurantId) : null,
      selectedRestaurantId: selectedRestaurantId ? String(selectedRestaurantId) : null,
      restaurantId,
      voteCount,
    };
  } catch (error) {
    try {
      if (transaction._aborted !== true) await transaction.rollback();
    } catch {
      // Ignore rollback errors; the original error is more useful.
    }

    if (isDuplicateKey(error)) {
      throw httpError(409, 'Bình chọn đang được cập nhật. Vui lòng thử lại.');
    }
    throw error;
  }
};

const updateRoomStatus = async ({ code, requesterUserId, requesterRole, status }) => {
  const pool = await getPool();

  if (pool.__isMock) {
    const room = mockStore.rooms.get(code);
    if (!room) throw httpError(404, 'Không tìm thấy phòng bình chọn.');
    const privileged = ['Admin', 'Manager'].includes(requesterRole);
    if (!privileged && room.CreatedByUserId !== requesterUserId) {
      throw httpError(403, 'Bạn không phải người tạo phòng này.');
    }
    room.Status = status;
    return { code, status };
  }

  const privileged = ['Admin', 'Manager'].includes(requesterRole);
  const result = await pool.request()
    .input('Code', sql.Char(6), code)
    .input('RequesterUserId', sql.UniqueIdentifier, requesterUserId)
    .input('Status', sql.NVarChar(20), status)
    .input('Privileged', sql.Bit, privileged)
    .query(`
      UPDATE VoteRooms
      SET Status = @Status
      OUTPUT INSERTED.Code, INSERTED.Status
      WHERE Code = @Code
        AND (@Privileged = 1 OR CreatedByUserId = @RequesterUserId);
    `);

  if (result.recordset.length === 0) {
    throw httpError(404, 'Không tìm thấy phòng hoặc bạn không có quyền cập nhật.');
  }

  return {
    code: result.recordset[0].Code.trim(),
    status: result.recordset[0].Status,
  };
};

module.exports = { createRoom, getRoomByCode, vote, updateRoomStatus };
