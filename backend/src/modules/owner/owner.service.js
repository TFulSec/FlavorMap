const crypto = require('crypto');
const JSZip = require('jszip');
const { getPool, sql, getMockState } = require('../../config/db');
const { getMockDailyStats } = require('../restaurantViews/restaurantViews.service');
const { parseIsoDateOnly } = require('../../utils/date');
const httpError = require('../../utils/httpError');

const isAdmin = (role) => role === 'Admin';
const mockOpeningHours = new Map();
const mockMenuCategories = [];
const mockReviewReplies = new Map();

const normalizeRange = ({ from, to, defaultDays = 30 }) => {
  const now = new Date();
  const defaultTo = now.toISOString().slice(0, 10);
  const defaultFromDate = new Date(now);
  defaultFromDate.setUTCDate(defaultFromDate.getUTCDate() - (defaultDays - 1));
  const defaultFrom = defaultFromDate.toISOString().slice(0, 10);

  const normalizedFrom = from || defaultFrom;
  const normalizedTo = to || defaultTo;
  const fromDate = parseIsoDateOnly(normalizedFrom, 'from');
  const toDate = parseIsoDateOnly(normalizedTo, 'to');

  if (fromDate > toDate) throw httpError(400, 'from không được lớn hơn to.');
  const days = Math.floor((toDate - fromDate) / 86400000) + 1;
  if (days > 366) throw httpError(400, 'Khoảng thời gian tối đa là 366 ngày.');

  const toExclusiveUtc = new Date(toDate);
  toExclusiveUtc.setUTCDate(toExclusiveUtc.getUTCDate() + 1);

  return {
    from: normalizedFrom,
    to: normalizedTo,
    fromDate,
    toDate,
    fromUtc: fromDate,
    toExclusiveUtc,
  };
};

const canAccessMockRestaurant = (restaurant, userId, role) => (
  isAdmin(role) || String(restaurant.OwnerUserId || '') === String(userId)
);

const getMockRestaurantOrThrow = (restaurantId, userId, role) => {
  const state = getMockState();
  const restaurant = state.restaurants.find((item) => String(item.Id) === String(restaurantId));
  if (!restaurant) throw httpError(404, 'Không tìm thấy quán ăn.');
  if (!canAccessMockRestaurant(restaurant, userId, role)) {
    throw httpError(403, 'Bạn không sở hữu quán ăn này.');
  }
  return { state, restaurant };
};

const normalizeNullable = (value) => {
  if (value === undefined || value === null || value === '') return null;
  return value;
};

const getDefaultMockHours = (restaurant) => Array.from({ length: 7 }, (_, dayOfWeek) => ({
  Id: `${restaurant.Id}-day-${dayOfWeek}`,
  RestaurantId: restaurant.Id,
  DayOfWeek: dayOfWeek,
  OpeningTime: restaurant.OpeningTime || null,
  ClosingTime: restaurant.ClosingTime || null,
  IsClosed: !restaurant.OpeningTime || !restaurant.ClosingTime,
}));

const getMockHours = (restaurant) => {
  const key = String(restaurant.Id);
  if (!mockOpeningHours.has(key)) mockOpeningHours.set(key, getDefaultMockHours(restaurant));
  return mockOpeningHours.get(key);
};

const getOwnedRestaurants = async ({ userId, role }) => {
  const pool = await getPool();

  if (pool.__isMock) {
    const { restaurants, bookmarks, reviews, menuItems } = getMockState();
    return restaurants
      .filter((restaurant) => canAccessMockRestaurant(restaurant, userId, role))
      .map((restaurant) => ({
        ...restaurant,
        Phone: restaurant.Phone || null,
        WebsiteUrl: restaurant.WebsiteUrl || null,
        FacebookUrl: restaurant.FacebookUrl || null,
        ZaloPhone: restaurant.ZaloPhone || null,
        IsTemporarilyClosed: Boolean(restaurant.IsTemporarilyClosed),
        TemporaryCloseReason: restaurant.TemporaryCloseReason || null,
        TemporaryClosedUntilUtc: restaurant.TemporaryClosedUntilUtc || null,
        OperatingNote: restaurant.OperatingNote || null,
        TotalBookmarks: bookmarks.filter((item) => String(item.RestaurantId) === String(restaurant.Id)).length,
        ReviewCount: reviews.filter((item) => String(item.RestaurantId) === String(restaurant.Id)).length,
        MenuItemCount: menuItems.filter((item) => String(item.RestaurantId) === String(restaurant.Id)).length,
      }));
  }

  const result = await pool.request()
    .input('UserId', sql.UniqueIdentifier, userId)
    .input('IsAdmin', sql.Bit, isAdmin(role) ? 1 : 0)
    .query(`
      SELECT
        r.Id, r.Name, r.Slug, r.Description, r.Address, r.City, r.District,
        r.Latitude, r.Longitude, r.Category, r.PriceMin, r.PriceMax,
        r.BannerUrl, r.Rating, r.OwnerUserId,
        r.Phone, r.WebsiteUrl, r.FacebookUrl, r.ZaloPhone,
        r.IsTemporarilyClosed, r.TemporaryCloseReason,
        r.TemporaryClosedUntilUtc, r.OperatingNote,
        r.CrowdStatus, r.CrowdUpdatedAtUtc,
        CONVERT(VARCHAR(5), r.OpeningTime, 108) AS OpeningTime,
        CONVERT(VARCHAR(5), r.ClosingTime, 108) AS ClosingTime,
        COUNT_BIG(DISTINCT b.Id) AS TotalBookmarks,
        COUNT_BIG(DISTINCT rv.Id) AS ReviewCount,
        COUNT_BIG(DISTINCT m.Id) AS MenuItemCount
      FROM dbo.Restaurants r
      LEFT JOIN dbo.Bookmarks b ON b.RestaurantId = r.Id
      LEFT JOIN dbo.Reviews rv ON rv.RestaurantId = r.Id
      LEFT JOIN dbo.MenuItems m ON m.RestaurantId = r.Id
      WHERE @IsAdmin = 1 OR r.OwnerUserId = @UserId
      GROUP BY
        r.Id, r.Name, r.Slug, r.Description, r.Address, r.City, r.District,
        r.Latitude, r.Longitude, r.Category, r.PriceMin, r.PriceMax,
        r.BannerUrl, r.Rating, r.OwnerUserId,
        r.Phone, r.WebsiteUrl, r.FacebookUrl, r.ZaloPhone,
        r.IsTemporarilyClosed, r.TemporaryCloseReason,
        r.TemporaryClosedUntilUtc, r.OperatingNote,
        r.CrowdStatus, r.CrowdUpdatedAtUtc, r.OpeningTime, r.ClosingTime
      ORDER BY r.Name;
    `);

  return result.recordset || [];
};

const getDashboard = async ({ userId, role, from, to }) => {
  const range = normalizeRange({ from, to });
  const pool = await getPool();

  if (pool.__isMock) {
    const state = getMockState();
    const dailyStats = getMockDailyStats();
    const rows = state.restaurants
      .filter((restaurant) => canAccessMockRestaurant(restaurant, userId, role))
      .map((restaurant) => {
        let totalViews = 0;
        for (const [key, value] of dailyStats.entries()) {
          const separator = key.lastIndexOf(':');
          const id = key.slice(0, separator);
          const date = key.slice(separator + 1);
          if (String(id) === String(restaurant.Id) && date >= range.from && date <= range.to) {
            totalViews += Number(value || 0);
          }
        }
        const restaurantReviews = state.reviews.filter((item) => String(item.RestaurantId) === String(restaurant.Id));
        const restaurantMenu = state.menuItems.filter((item) => String(item.RestaurantId) === String(restaurant.Id));
        return {
          RestaurantId: restaurant.Id,
          RestaurantName: restaurant.Name,
          Slug: restaurant.Slug,
          Rating: Number(restaurant.Rating || 0),
          CrowdStatus: restaurant.CrowdStatus || 'moderate',
          CrowdUpdatedAtUtc: restaurant.CrowdUpdatedAtUtc || null,
          IsTemporarilyClosed: Boolean(restaurant.IsTemporarilyClosed),
          TotalViews: totalViews,
          TotalBookmarks: state.bookmarks.filter((item) => String(item.RestaurantId) === String(restaurant.Id)).length,
          ReviewCount: restaurantReviews.length,
          AvailableMenuItems: restaurantMenu.filter((item) => item.IsAvailable !== false).length,
          UnavailableMenuItems: restaurantMenu.filter((item) => item.IsAvailable === false).length,
        };
      });

    return {
      range: { from: range.from, to: range.to },
      summary: {
        RestaurantCount: rows.length,
        TotalViews: rows.reduce((sum, row) => sum + Number(row.TotalViews || 0), 0),
        TotalBookmarks: rows.reduce((sum, row) => sum + Number(row.TotalBookmarks || 0), 0),
        TotalReviews: rows.reduce((sum, row) => sum + Number(row.ReviewCount || 0), 0),
        AvailableMenuItems: rows.reduce((sum, row) => sum + Number(row.AvailableMenuItems || 0), 0),
        UnavailableMenuItems: rows.reduce((sum, row) => sum + Number(row.UnavailableMenuItems || 0), 0),
      },
      restaurants: rows,
    };
  }

  const result = await pool.request()
    .input('UserId', sql.UniqueIdentifier, userId)
    .input('IsAdmin', sql.Bit, isAdmin(role) ? 1 : 0)
    .input('FromDate', sql.Date, range.fromDate)
    .input('ToDate', sql.Date, range.toDate)
    .input('FromUtc', sql.DateTime2(3), range.fromUtc)
    .input('ToExclusiveUtc', sql.DateTime2(3), range.toExclusiveUtc)
    .query(`
      ;WITH AllViews AS (
        SELECT RestaurantId, SUM(TotalViews) AS TotalViews
        FROM dbo.RestaurantDailyStats
        WHERE StatDate BETWEEN @FromDate AND @ToDate
        GROUP BY RestaurantId
        UNION ALL
        SELECT RestaurantId, COUNT_BIG(*) AS TotalViews
        FROM dbo.RestaurantViews
        WHERE ViewedAtUtc >= @FromUtc AND ViewedAtUtc < @ToExclusiveUtc
        GROUP BY RestaurantId
      ), ViewTotals AS (
        SELECT RestaurantId, SUM(TotalViews) AS TotalViews
        FROM AllViews GROUP BY RestaurantId
      ), BookmarkTotals AS (
        SELECT RestaurantId, COUNT_BIG(*) AS TotalBookmarks
        FROM dbo.Bookmarks GROUP BY RestaurantId
      ), ReviewTotals AS (
        SELECT RestaurantId, COUNT_BIG(*) AS ReviewCount
        FROM dbo.Reviews GROUP BY RestaurantId
      ), MenuTotals AS (
        SELECT RestaurantId,
          SUM(CASE WHEN IsAvailable = 1 THEN 1 ELSE 0 END) AS AvailableMenuItems,
          SUM(CASE WHEN IsAvailable = 0 THEN 1 ELSE 0 END) AS UnavailableMenuItems
        FROM dbo.MenuItems GROUP BY RestaurantId
      )
      SELECT
        r.Id AS RestaurantId,
        r.Name AS RestaurantName,
        r.Slug,
        r.Rating,
        r.CrowdStatus,
        r.CrowdUpdatedAtUtc,
        r.IsTemporarilyClosed,
        COALESCE(v.TotalViews, 0) AS TotalViews,
        COALESCE(b.TotalBookmarks, 0) AS TotalBookmarks,
        COALESCE(rv.ReviewCount, 0) AS ReviewCount,
        COALESCE(m.AvailableMenuItems, 0) AS AvailableMenuItems,
        COALESCE(m.UnavailableMenuItems, 0) AS UnavailableMenuItems
      FROM dbo.Restaurants r
      LEFT JOIN ViewTotals v ON v.RestaurantId = r.Id
      LEFT JOIN BookmarkTotals b ON b.RestaurantId = r.Id
      LEFT JOIN ReviewTotals rv ON rv.RestaurantId = r.Id
      LEFT JOIN MenuTotals m ON m.RestaurantId = r.Id
      WHERE @IsAdmin = 1 OR r.OwnerUserId = @UserId
      ORDER BY r.Name;
    `);

  const rows = result.recordset || [];
  return {
    range: { from: range.from, to: range.to },
    summary: {
      RestaurantCount: rows.length,
      TotalViews: rows.reduce((sum, row) => sum + Number(row.TotalViews || 0), 0),
      TotalBookmarks: rows.reduce((sum, row) => sum + Number(row.TotalBookmarks || 0), 0),
      TotalReviews: rows.reduce((sum, row) => sum + Number(row.ReviewCount || 0), 0),
      AvailableMenuItems: rows.reduce((sum, row) => sum + Number(row.AvailableMenuItems || 0), 0),
      UnavailableMenuItems: rows.reduce((sum, row) => sum + Number(row.UnavailableMenuItems || 0), 0),
    },
    restaurants: rows,
  };
};

const getRestaurantDetails = async ({ userId, role, restaurantId }) => {
  const pool = await getPool();
  if (pool.__isMock) {
    const { restaurant } = getMockRestaurantOrThrow(restaurantId, userId, role);
    return {
      restaurant: { ...restaurant },
      openingHours: getMockHours(restaurant),
      menuCategories: mockMenuCategories
        .filter((item) => String(item.RestaurantId) === String(restaurantId))
        .sort((a, b) => a.SortOrder - b.SortOrder || a.Name.localeCompare(b.Name)),
    };
  }

  const result = await pool.request()
    .input('RestaurantId', sql.UniqueIdentifier, restaurantId)
    .input('UserId', sql.UniqueIdentifier, userId)
    .input('IsAdmin', sql.Bit, isAdmin(role) ? 1 : 0)
    .query(`
      SELECT
        r.Id, r.Name, r.Slug, r.Description, r.Address, r.City, r.District,
        r.Latitude, r.Longitude, r.Category, r.PriceMin, r.PriceMax,
        CONVERT(VARCHAR(5), r.OpeningTime, 108) AS OpeningTime,
        CONVERT(VARCHAR(5), r.ClosingTime, 108) AS ClosingTime,
        r.BannerUrl, r.Rating, r.CrowdStatus, r.CrowdUpdatedAtUtc,
        r.Phone, r.WebsiteUrl, r.FacebookUrl, r.ZaloPhone,
        r.IsTemporarilyClosed, r.TemporaryCloseReason,
        r.TemporaryClosedUntilUtc, r.OperatingNote
      FROM dbo.Restaurants r
      WHERE r.Id = @RestaurantId
        AND (@IsAdmin = 1 OR r.OwnerUserId = @UserId);

      SELECT Id, RestaurantId, DayOfWeek,
        CONVERT(VARCHAR(5), OpeningTime, 108) AS OpeningTime,
        CONVERT(VARCHAR(5), ClosingTime, 108) AS ClosingTime,
        IsClosed
      FROM dbo.RestaurantOpeningHours
      WHERE RestaurantId = @RestaurantId
      ORDER BY DayOfWeek;

      SELECT Id, RestaurantId, Name, SortOrder
      FROM dbo.MenuCategories
      WHERE RestaurantId = @RestaurantId
      ORDER BY SortOrder, Name;
    `);

  if (!result.recordsets?.[0]?.length) throw httpError(403, 'Không tìm thấy quán hoặc bạn không sở hữu quán này.');
  return {
    restaurant: result.recordsets[0][0],
    openingHours: result.recordsets[1] || [],
    menuCategories: result.recordsets[2] || [],
  };
};

const updateRestaurantInfo = async ({ userId, role, restaurantId, data }) => {
  const pool = await getPool();
  if (pool.__isMock) {
    const { restaurant } = getMockRestaurantOrThrow(restaurantId, userId, role);
    Object.assign(restaurant, {
      Name: data.name,
      Description: normalizeNullable(data.description),
      Address: data.address,
      City: data.city,
      District: normalizeNullable(data.district),
      Category: data.category,
      PriceMin: data.priceMin,
      PriceMax: data.priceMax,
      OpeningTime: normalizeNullable(data.openingTime),
      ClosingTime: normalizeNullable(data.closingTime),
      Latitude: data.latitude ?? null,
      Longitude: data.longitude ?? null,
      BannerUrl: normalizeNullable(data.bannerUrl),
      Phone: normalizeNullable(data.phone),
      WebsiteUrl: normalizeNullable(data.websiteUrl),
      FacebookUrl: normalizeNullable(data.facebookUrl),
      ZaloPhone: normalizeNullable(data.zaloPhone),
      UpdatedAt: new Date(),
    });
    return restaurant;
  }

  const result = await pool.request()
    .input('RestaurantId', sql.UniqueIdentifier, restaurantId)
    .input('UserId', sql.UniqueIdentifier, userId)
    .input('IsAdmin', sql.Bit, isAdmin(role) ? 1 : 0)
    .input('Name', sql.NVarChar(200), data.name)
    .input('Description', sql.NVarChar(sql.MAX), normalizeNullable(data.description))
    .input('Address', sql.NVarChar(300), data.address)
    .input('City', sql.NVarChar(100), data.city)
    .input('District', sql.NVarChar(100), normalizeNullable(data.district))
    .input('Category', sql.NVarChar(50), data.category)
    .input('PriceMin', sql.Int, data.priceMin)
    .input('PriceMax', sql.Int, data.priceMax)
    .input('OpeningTime', sql.VarChar(5), normalizeNullable(data.openingTime))
    .input('ClosingTime', sql.VarChar(5), normalizeNullable(data.closingTime))
    .input('Latitude', sql.Float, data.latitude ?? null)
    .input('Longitude', sql.Float, data.longitude ?? null)
    .input('BannerUrl', sql.NVarChar(500), normalizeNullable(data.bannerUrl))
    .input('Phone', sql.NVarChar(20), normalizeNullable(data.phone))
    .input('WebsiteUrl', sql.NVarChar(500), normalizeNullable(data.websiteUrl))
    .input('FacebookUrl', sql.NVarChar(500), normalizeNullable(data.facebookUrl))
    .input('ZaloPhone', sql.NVarChar(20), normalizeNullable(data.zaloPhone))
    .query(`
      UPDATE dbo.Restaurants
      SET Name = @Name,
          Description = @Description,
          Address = @Address,
          City = @City,
          District = @District,
          Category = @Category,
          PriceMin = @PriceMin,
          PriceMax = @PriceMax,
          OpeningTime = @OpeningTime,
          ClosingTime = @ClosingTime,
          Latitude = @Latitude,
          Longitude = @Longitude,
          BannerUrl = @BannerUrl,
          Phone = @Phone,
          WebsiteUrl = @WebsiteUrl,
          FacebookUrl = @FacebookUrl,
          ZaloPhone = @ZaloPhone,
          UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE Id = @RestaurantId
        AND (@IsAdmin = 1 OR OwnerUserId = @UserId);
    `);

  if (!result.recordset?.length) throw httpError(403, 'Không tìm thấy quán hoặc bạn không sở hữu quán này.');
  return result.recordset[0];
};

const updateOperations = async ({ userId, role, restaurantId, data }) => {
  const pool = await getPool();
  const closeReason = data.isTemporarilyClosed ? normalizeNullable(data.temporaryCloseReason) : null;
  const closedUntil = data.isTemporarilyClosed ? normalizeNullable(data.temporaryClosedUntilUtc) : null;

  if (pool.__isMock) {
    const { restaurant } = getMockRestaurantOrThrow(restaurantId, userId, role);
    Object.assign(restaurant, {
      IsTemporarilyClosed: data.isTemporarilyClosed,
      TemporaryCloseReason: closeReason,
      TemporaryClosedUntilUtc: closedUntil,
      OperatingNote: normalizeNullable(data.operatingNote),
    });
    return restaurant;
  }

  const result = await pool.request()
    .input('RestaurantId', sql.UniqueIdentifier, restaurantId)
    .input('UserId', sql.UniqueIdentifier, userId)
    .input('IsAdmin', sql.Bit, isAdmin(role) ? 1 : 0)
    .input('IsTemporarilyClosed', sql.Bit, data.isTemporarilyClosed ? 1 : 0)
    .input('TemporaryCloseReason', sql.NVarChar(300), closeReason)
    .input('TemporaryClosedUntilUtc', sql.DateTime2(3), closedUntil ? new Date(closedUntil) : null)
    .input('OperatingNote', sql.NVarChar(300), normalizeNullable(data.operatingNote))
    .query(`
      UPDATE dbo.Restaurants
      SET IsTemporarilyClosed = @IsTemporarilyClosed,
          TemporaryCloseReason = @TemporaryCloseReason,
          TemporaryClosedUntilUtc = @TemporaryClosedUntilUtc,
          OperatingNote = @OperatingNote,
          UpdatedAt = SYSUTCDATETIME()
      OUTPUT INSERTED.Id, INSERTED.IsTemporarilyClosed,
             INSERTED.TemporaryCloseReason, INSERTED.TemporaryClosedUntilUtc,
             INSERTED.OperatingNote
      WHERE Id = @RestaurantId
        AND (@IsAdmin = 1 OR OwnerUserId = @UserId);
    `);

  if (!result.recordset?.length) throw httpError(403, 'Không tìm thấy quán hoặc bạn không sở hữu quán này.');
  return result.recordset[0];
};

const getOpeningHours = async ({ userId, role, restaurantId }) => {
  const pool = await getPool();
  if (pool.__isMock) {
    const { restaurant } = getMockRestaurantOrThrow(restaurantId, userId, role);
    return getMockHours(restaurant);
  }

  const result = await pool.request()
    .input('RestaurantId', sql.UniqueIdentifier, restaurantId)
    .input('UserId', sql.UniqueIdentifier, userId)
    .input('IsAdmin', sql.Bit, isAdmin(role) ? 1 : 0)
    .query(`
      SELECT h.Id, h.RestaurantId, h.DayOfWeek,
        CONVERT(VARCHAR(5), h.OpeningTime, 108) AS OpeningTime,
        CONVERT(VARCHAR(5), h.ClosingTime, 108) AS ClosingTime,
        h.IsClosed
      FROM dbo.RestaurantOpeningHours h
      INNER JOIN dbo.Restaurants r ON r.Id = h.RestaurantId
      WHERE h.RestaurantId = @RestaurantId
        AND (@IsAdmin = 1 OR r.OwnerUserId = @UserId)
      ORDER BY h.DayOfWeek;

      SELECT COUNT(*) AS RestaurantAccess
      FROM dbo.Restaurants
      WHERE Id = @RestaurantId
        AND (@IsAdmin = 1 OR OwnerUserId = @UserId);
    `);

  if (!result.recordsets?.[1]?.[0]?.RestaurantAccess) throw httpError(403, 'Bạn không sở hữu quán ăn này.');
  return result.recordsets[0] || [];
};

const updateOpeningHours = async ({ userId, role, restaurantId, hours }) => {
  const pool = await getPool();
  const uniqueDays = new Set(hours.map((item) => item.dayOfWeek));
  if (uniqueDays.size !== 7) throw httpError(400, 'Lịch mở cửa phải có đủ 7 ngày khác nhau.');

  if (pool.__isMock) {
    const { restaurant } = getMockRestaurantOrThrow(restaurantId, userId, role);
    const normalized = hours
      .map((item) => ({
        Id: `${restaurant.Id}-day-${item.dayOfWeek}`,
        RestaurantId: restaurant.Id,
        DayOfWeek: item.dayOfWeek,
        OpeningTime: item.isClosed ? null : item.openingTime,
        ClosingTime: item.isClosed ? null : item.closingTime,
        IsClosed: item.isClosed,
      }))
      .sort((a, b) => a.DayOfWeek - b.DayOfWeek);
    mockOpeningHours.set(String(restaurant.Id), normalized);
    return normalized;
  }

  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const access = await new sql.Request(transaction)
      .input('RestaurantId', sql.UniqueIdentifier, restaurantId)
      .input('UserId', sql.UniqueIdentifier, userId)
      .input('IsAdmin', sql.Bit, isAdmin(role) ? 1 : 0)
      .query(`
        SELECT Id FROM dbo.Restaurants WITH (UPDLOCK, HOLDLOCK)
        WHERE Id = @RestaurantId
          AND (@IsAdmin = 1 OR OwnerUserId = @UserId);
      `);
    if (!access.recordset.length) throw httpError(403, 'Bạn không sở hữu quán ăn này.');

    for (const item of hours) {
      await new sql.Request(transaction)
        .input('RestaurantId', sql.UniqueIdentifier, restaurantId)
        .input('DayOfWeek', sql.TinyInt, item.dayOfWeek)
        .input('OpeningTime', sql.VarChar(5), item.isClosed ? null : item.openingTime)
        .input('ClosingTime', sql.VarChar(5), item.isClosed ? null : item.closingTime)
        .input('IsClosed', sql.Bit, item.isClosed ? 1 : 0)
        .query(`
          MERGE dbo.RestaurantOpeningHours AS target
          USING (SELECT @RestaurantId AS RestaurantId, @DayOfWeek AS DayOfWeek) AS source
          ON target.RestaurantId = source.RestaurantId
             AND target.DayOfWeek = source.DayOfWeek
          WHEN MATCHED THEN UPDATE SET
            OpeningTime = @OpeningTime,
            ClosingTime = @ClosingTime,
            IsClosed = @IsClosed,
            UpdatedAtUtc = SYSUTCDATETIME()
          WHEN NOT MATCHED THEN INSERT
            (RestaurantId, DayOfWeek, OpeningTime, ClosingTime, IsClosed)
            VALUES (@RestaurantId, @DayOfWeek, @OpeningTime, @ClosingTime, @IsClosed);
        `);
    }

    const monday = hours.find((item) => item.dayOfWeek === 1) || hours.find((item) => !item.isClosed);
    if (monday) {
      await new sql.Request(transaction)
        .input('RestaurantId', sql.UniqueIdentifier, restaurantId)
        .input('OpeningTime', sql.VarChar(5), monday.isClosed ? null : monday.openingTime)
        .input('ClosingTime', sql.VarChar(5), monday.isClosed ? null : monday.closingTime)
        .query(`
          UPDATE dbo.Restaurants
          SET OpeningTime = @OpeningTime,
              ClosingTime = @ClosingTime,
              UpdatedAt = SYSUTCDATETIME()
          WHERE Id = @RestaurantId;
        `);
    }

    await transaction.commit();
    return getOpeningHours({ userId, role, restaurantId });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const getMenuCategories = async ({ userId, role, restaurantId }) => {
  const pool = await getPool();
  if (pool.__isMock) {
    getMockRestaurantOrThrow(restaurantId, userId, role);
    return mockMenuCategories
      .filter((item) => String(item.RestaurantId) === String(restaurantId))
      .sort((a, b) => a.SortOrder - b.SortOrder || a.Name.localeCompare(b.Name));
  }

  const result = await pool.request()
    .input('RestaurantId', sql.UniqueIdentifier, restaurantId)
    .input('UserId', sql.UniqueIdentifier, userId)
    .input('IsAdmin', sql.Bit, isAdmin(role) ? 1 : 0)
    .query(`
      SELECT c.Id, c.RestaurantId, c.Name, c.SortOrder,
             COUNT_BIG(m.Id) AS MenuItemCount
      FROM dbo.MenuCategories c
      INNER JOIN dbo.Restaurants r ON r.Id = c.RestaurantId
      LEFT JOIN dbo.MenuItems m ON m.MenuCategoryId = c.Id
      WHERE c.RestaurantId = @RestaurantId
        AND (@IsAdmin = 1 OR r.OwnerUserId = @UserId)
      GROUP BY c.Id, c.RestaurantId, c.Name, c.SortOrder
      ORDER BY c.SortOrder, c.Name;

      SELECT COUNT(*) AS RestaurantAccess
      FROM dbo.Restaurants
      WHERE Id = @RestaurantId
        AND (@IsAdmin = 1 OR OwnerUserId = @UserId);
    `);
  if (!result.recordsets?.[1]?.[0]?.RestaurantAccess) throw httpError(403, 'Bạn không sở hữu quán ăn này.');
  return result.recordsets[0] || [];
};

const addMenuCategory = async ({ userId, role, restaurantId, data }) => {
  const pool = await getPool();
  if (pool.__isMock) {
    getMockRestaurantOrThrow(restaurantId, userId, role);
    if (mockMenuCategories.some((item) => String(item.RestaurantId) === String(restaurantId) && item.Name.toLowerCase() === data.name.toLowerCase())) {
      throw httpError(409, 'Nhóm món đã tồn tại.');
    }
    const category = { Id: crypto.randomUUID(), RestaurantId: restaurantId, Name: data.name, SortOrder: data.sortOrder };
    mockMenuCategories.push(category);
    return category;
  }

  try {
    const result = await pool.request()
      .input('RestaurantId', sql.UniqueIdentifier, restaurantId)
      .input('UserId', sql.UniqueIdentifier, userId)
      .input('IsAdmin', sql.Bit, isAdmin(role) ? 1 : 0)
      .input('Name', sql.NVarChar(100), data.name)
      .input('SortOrder', sql.Int, data.sortOrder)
      .query(`
        INSERT INTO dbo.MenuCategories (RestaurantId, Name, SortOrder)
        OUTPUT INSERTED.*
        SELECT @RestaurantId, @Name, @SortOrder
        WHERE EXISTS (
          SELECT 1 FROM dbo.Restaurants
          WHERE Id = @RestaurantId
            AND (@IsAdmin = 1 OR OwnerUserId = @UserId)
        );
      `);
    if (!result.recordset?.length) throw httpError(403, 'Bạn không sở hữu quán ăn này.');
    return result.recordset[0];
  } catch (error) {
    if (error.number === 2627 || error.number === 2601) throw httpError(409, 'Nhóm món đã tồn tại.');
    throw error;
  }
};

const updateMenuCategory = async ({ userId, role, categoryId, data }) => {
  const pool = await getPool();
  if (pool.__isMock) {
    const category = mockMenuCategories.find((item) => String(item.Id) === String(categoryId));
    if (!category) throw httpError(404, 'Không tìm thấy nhóm món.');
    getMockRestaurantOrThrow(category.RestaurantId, userId, role);
    category.Name = data.name;
    category.SortOrder = data.sortOrder;
    return category;
  }

  try {
    const result = await pool.request()
      .input('CategoryId', sql.UniqueIdentifier, categoryId)
      .input('UserId', sql.UniqueIdentifier, userId)
      .input('IsAdmin', sql.Bit, isAdmin(role) ? 1 : 0)
      .input('Name', sql.NVarChar(100), data.name)
      .input('SortOrder', sql.Int, data.sortOrder)
      .query(`
        UPDATE c
        SET c.Name = @Name,
            c.SortOrder = @SortOrder,
            c.UpdatedAtUtc = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        FROM dbo.MenuCategories c
        INNER JOIN dbo.Restaurants r ON r.Id = c.RestaurantId
        WHERE c.Id = @CategoryId
          AND (@IsAdmin = 1 OR r.OwnerUserId = @UserId);
      `);
    if (!result.recordset?.length) throw httpError(403, 'Không tìm thấy nhóm món hoặc bạn không có quyền sửa.');
    return result.recordset[0];
  } catch (error) {
    if (error.number === 2627 || error.number === 2601) throw httpError(409, 'Tên nhóm món đã tồn tại.');
    throw error;
  }
};

const deleteMenuCategory = async ({ userId, role, categoryId }) => {
  const pool = await getPool();
  if (pool.__isMock) {
    const index = mockMenuCategories.findIndex((item) => String(item.Id) === String(categoryId));
    if (index < 0) throw httpError(404, 'Không tìm thấy nhóm món.');
    const category = mockMenuCategories[index];
    const { state } = getMockRestaurantOrThrow(category.RestaurantId, userId, role);
    state.menuItems.forEach((item) => {
      if (String(item.MenuCategoryId || '') === String(categoryId)) item.MenuCategoryId = null;
    });
    mockMenuCategories.splice(index, 1);
    return;
  }

  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const result = await new sql.Request(transaction)
      .input('CategoryId', sql.UniqueIdentifier, categoryId)
      .input('UserId', sql.UniqueIdentifier, userId)
      .input('IsAdmin', sql.Bit, isAdmin(role) ? 1 : 0)
      .query(`
        SELECT c.Id
        FROM dbo.MenuCategories c WITH (UPDLOCK, HOLDLOCK)
        INNER JOIN dbo.Restaurants r ON r.Id = c.RestaurantId
        WHERE c.Id = @CategoryId
          AND (@IsAdmin = 1 OR r.OwnerUserId = @UserId);
      `);
    if (!result.recordset.length) throw httpError(403, 'Không tìm thấy nhóm món hoặc bạn không có quyền xóa.');

    await new sql.Request(transaction)
      .input('CategoryId', sql.UniqueIdentifier, categoryId)
      .query('UPDATE dbo.MenuItems SET MenuCategoryId = NULL WHERE MenuCategoryId = @CategoryId; DELETE FROM dbo.MenuCategories WHERE Id = @CategoryId;');
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const getMenu = async ({ userId, role, restaurantId }) => {
  const pool = await getPool();
  if (pool.__isMock) {
    const { state } = getMockRestaurantOrThrow(restaurantId, userId, role);
    return state.menuItems
      .filter((item) => String(item.RestaurantId) === String(restaurantId))
      .map((item) => ({
        ...item,
        MenuCategoryName: mockMenuCategories.find((category) => String(category.Id) === String(item.MenuCategoryId || ''))?.Name || null,
        DiscountPrice: item.DiscountPrice ?? null,
        IsFeatured: Boolean(item.IsFeatured),
        SortOrder: Number(item.SortOrder || 0),
      }))
      .sort((a, b) => a.SortOrder - b.SortOrder || a.Name.localeCompare(b.Name));
  }

  const result = await pool.request()
    .input('RestaurantId', sql.UniqueIdentifier, restaurantId)
    .input('UserId', sql.UniqueIdentifier, userId)
    .input('IsAdmin', sql.Bit, isAdmin(role) ? 1 : 0)
    .query(`
      SELECT m.Id, m.RestaurantId, m.Name, m.Description, m.Price,
             m.DiscountPrice, m.ImageUrl, m.IsAvailable, m.IsFeatured,
             m.SortOrder, m.MenuCategoryId, c.Name AS MenuCategoryName,
             m.CreatedAt, m.UpdatedAtUtc
      FROM dbo.MenuItems m
      INNER JOIN dbo.Restaurants r ON r.Id = m.RestaurantId
      LEFT JOIN dbo.MenuCategories c ON c.Id = m.MenuCategoryId
      WHERE m.RestaurantId = @RestaurantId
        AND (@IsAdmin = 1 OR r.OwnerUserId = @UserId)
      ORDER BY COALESCE(c.SortOrder, 2147483647), m.SortOrder, m.Name;

      SELECT COUNT(*) AS RestaurantAccess
      FROM dbo.Restaurants
      WHERE Id = @RestaurantId
        AND (@IsAdmin = 1 OR OwnerUserId = @UserId);
    `);
  if (!result.recordsets?.[1]?.[0]?.RestaurantAccess) throw httpError(403, 'Không tìm thấy quán hoặc bạn không sở hữu quán này.');
  return result.recordsets[0] || [];
};

const validateMockMenuCategory = (restaurantId, menuCategoryId) => {
  if (!menuCategoryId) return;
  const category = mockMenuCategories.find((item) => String(item.Id) === String(menuCategoryId));
  if (!category || String(category.RestaurantId) !== String(restaurantId)) {
    throw httpError(400, 'Nhóm món không thuộc quán này.');
  }
};

const addMenuItem = async ({ userId, role, restaurantId, data }) => {
  const pool = await getPool();
  if (pool.__isMock) {
    const { state } = getMockRestaurantOrThrow(restaurantId, userId, role);
    validateMockMenuCategory(restaurantId, data.menuCategoryId);
    const item = {
      Id: crypto.randomUUID(), RestaurantId: restaurantId,
      Name: data.name, Description: normalizeNullable(data.description), Price: data.price,
      DiscountPrice: data.discountPrice ?? null, ImageUrl: normalizeNullable(data.imageUrl),
      IsAvailable: data.isAvailable, IsFeatured: data.isFeatured,
      SortOrder: data.sortOrder, MenuCategoryId: normalizeNullable(data.menuCategoryId),
      CreatedAt: new Date(), UpdatedAtUtc: new Date(),
    };
    state.menuItems.push(item);
    return item;
  }

  const result = await pool.request()
    .input('RestaurantId', sql.UniqueIdentifier, restaurantId)
    .input('UserId', sql.UniqueIdentifier, userId)
    .input('IsAdmin', sql.Bit, isAdmin(role) ? 1 : 0)
    .input('Name', sql.NVarChar(200), data.name)
    .input('Description', sql.NVarChar(500), normalizeNullable(data.description))
    .input('Price', sql.Int, data.price)
    .input('DiscountPrice', sql.Int, data.discountPrice ?? null)
    .input('ImageUrl', sql.NVarChar(500), normalizeNullable(data.imageUrl))
    .input('IsAvailable', sql.Bit, data.isAvailable ? 1 : 0)
    .input('IsFeatured', sql.Bit, data.isFeatured ? 1 : 0)
    .input('SortOrder', sql.Int, data.sortOrder)
    .input('MenuCategoryId', sql.UniqueIdentifier, normalizeNullable(data.menuCategoryId))
    .query(`
      INSERT INTO dbo.MenuItems
        (RestaurantId, Name, Description, Price, DiscountPrice, ImageUrl,
         IsAvailable, IsFeatured, SortOrder, MenuCategoryId)
      OUTPUT INSERTED.*
      SELECT @RestaurantId, @Name, @Description, @Price, @DiscountPrice,
             @ImageUrl, @IsAvailable, @IsFeatured, @SortOrder, @MenuCategoryId
      WHERE EXISTS (
        SELECT 1 FROM dbo.Restaurants
        WHERE Id = @RestaurantId
          AND (@IsAdmin = 1 OR OwnerUserId = @UserId)
      )
      AND (
        @MenuCategoryId IS NULL OR EXISTS (
          SELECT 1 FROM dbo.MenuCategories
          WHERE Id = @MenuCategoryId AND RestaurantId = @RestaurantId
        )
      );
    `);
  if (!result.recordset?.length) throw httpError(403, 'Không tìm thấy quán, nhóm món không hợp lệ hoặc bạn không có quyền.');
  return result.recordset[0];
};

const updateMenuItem = async ({ userId, role, menuItemId, data }) => {
  const pool = await getPool();
  if (pool.__isMock) {
    const state = getMockState();
    const item = state.menuItems.find((entry) => String(entry.Id) === String(menuItemId));
    if (!item) throw httpError(404, 'Không tìm thấy món ăn.');
    getMockRestaurantOrThrow(item.RestaurantId, userId, role);
    validateMockMenuCategory(item.RestaurantId, data.menuCategoryId);
    Object.assign(item, {
      Name: data.name, Description: normalizeNullable(data.description), Price: data.price,
      DiscountPrice: data.discountPrice ?? null, ImageUrl: normalizeNullable(data.imageUrl),
      IsAvailable: data.isAvailable, IsFeatured: data.isFeatured,
      SortOrder: data.sortOrder, MenuCategoryId: normalizeNullable(data.menuCategoryId),
      UpdatedAtUtc: new Date(),
    });
    return item;
  }

  const result = await pool.request()
    .input('MenuItemId', sql.UniqueIdentifier, menuItemId)
    .input('UserId', sql.UniqueIdentifier, userId)
    .input('IsAdmin', sql.Bit, isAdmin(role) ? 1 : 0)
    .input('Name', sql.NVarChar(200), data.name)
    .input('Description', sql.NVarChar(500), normalizeNullable(data.description))
    .input('Price', sql.Int, data.price)
    .input('DiscountPrice', sql.Int, data.discountPrice ?? null)
    .input('ImageUrl', sql.NVarChar(500), normalizeNullable(data.imageUrl))
    .input('IsAvailable', sql.Bit, data.isAvailable ? 1 : 0)
    .input('IsFeatured', sql.Bit, data.isFeatured ? 1 : 0)
    .input('SortOrder', sql.Int, data.sortOrder)
    .input('MenuCategoryId', sql.UniqueIdentifier, normalizeNullable(data.menuCategoryId))
    .query(`
      UPDATE m
      SET m.Name = @Name,
          m.Description = @Description,
          m.Price = @Price,
          m.DiscountPrice = @DiscountPrice,
          m.ImageUrl = @ImageUrl,
          m.IsAvailable = @IsAvailable,
          m.IsFeatured = @IsFeatured,
          m.SortOrder = @SortOrder,
          m.MenuCategoryId = @MenuCategoryId,
          m.UpdatedAtUtc = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      FROM dbo.MenuItems m
      INNER JOIN dbo.Restaurants r ON r.Id = m.RestaurantId
      WHERE m.Id = @MenuItemId
        AND (@IsAdmin = 1 OR r.OwnerUserId = @UserId)
        AND (
          @MenuCategoryId IS NULL OR EXISTS (
            SELECT 1 FROM dbo.MenuCategories c
            WHERE c.Id = @MenuCategoryId AND c.RestaurantId = m.RestaurantId
          )
        );
    `);
  if (!result.recordset?.length) throw httpError(403, 'Không tìm thấy món, nhóm món không hợp lệ hoặc bạn không có quyền sửa.');
  return result.recordset[0];
};

const deleteMenuItem = async ({ userId, role, menuItemId }) => {
  const pool = await getPool();
  if (pool.__isMock) {
    const state = getMockState();
    const index = state.menuItems.findIndex((entry) => String(entry.Id) === String(menuItemId));
    if (index < 0) throw httpError(404, 'Không tìm thấy món ăn.');
    getMockRestaurantOrThrow(state.menuItems[index].RestaurantId, userId, role);
    state.menuItems.splice(index, 1);
    return;
  }

  const result = await pool.request()
    .input('MenuItemId', sql.UniqueIdentifier, menuItemId)
    .input('UserId', sql.UniqueIdentifier, userId)
    .input('IsAdmin', sql.Bit, isAdmin(role) ? 1 : 0)
    .query(`
      DELETE m
      FROM dbo.MenuItems m
      INNER JOIN dbo.Restaurants r ON r.Id = m.RestaurantId
      WHERE m.Id = @MenuItemId
        AND (@IsAdmin = 1 OR r.OwnerUserId = @UserId);
    `);
  if (!result.rowsAffected?.[0]) throw httpError(403, 'Không tìm thấy món hoặc bạn không có quyền xóa.');
};

const getOwnerReviews = async ({ userId, role, restaurantId, page = 1, limit = 10, rating }) => {
  const pool = await getPool();
  const offset = (page - 1) * limit;
  if (pool.__isMock) {
    const { state } = getMockRestaurantOrThrow(restaurantId, userId, role);
    let rows = state.reviews.filter((item) => String(item.RestaurantId) === String(restaurantId));
    if (rating) rows = rows.filter((item) => Number(item.Rating) === Number(rating));
    rows = rows.sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt));
    const data = rows.slice(offset, offset + limit).map((review) => {
      const reviewer = state.users.find((item) => String(item.Id) === String(review.UserId));
      const reply = mockReviewReplies.get(String(review.Id));
      return {
        ...review,
        FullName: reviewer?.FullName || 'Người dùng',
        AvatarUrl: reviewer?.AvatarUrl || null,
        ReplyContent: reply?.Content || null,
        ReplyCreatedAtUtc: reply?.CreatedAtUtc || null,
        ReplyUpdatedAtUtc: reply?.UpdatedAtUtc || null,
      };
    });
    return { data, total: rows.length, page, totalPages: Math.ceil(rows.length / limit) };
  }

  const request = pool.request()
    .input('RestaurantId', sql.UniqueIdentifier, restaurantId)
    .input('UserId', sql.UniqueIdentifier, userId)
    .input('IsAdmin', sql.Bit, isAdmin(role) ? 1 : 0)
    .input('Limit', sql.Int, limit)
    .input('Offset', sql.Int, offset);
  let ratingFilter = '';
  if (rating) {
    request.input('Rating', sql.Int, rating);
    ratingFilter = 'AND rv.Rating = @Rating';
  }
  const result = await request.query(`
    SELECT rv.Id, rv.RestaurantId, rv.Rating, rv.Comment, rv.CreatedAt, rv.UpdatedAt,
           u.Id AS UserId, u.FullName, u.AvatarUrl,
           rr.Content AS ReplyContent, rr.CreatedAtUtc AS ReplyCreatedAtUtc,
           rr.UpdatedAtUtc AS ReplyUpdatedAtUtc
    FROM dbo.Reviews rv
    INNER JOIN dbo.Restaurants r ON r.Id = rv.RestaurantId
    INNER JOIN dbo.Users u ON u.Id = rv.UserId
    LEFT JOIN dbo.ReviewReplies rr ON rr.ReviewId = rv.Id
    WHERE rv.RestaurantId = @RestaurantId
      AND (@IsAdmin = 1 OR r.OwnerUserId = @UserId)
      ${ratingFilter}
    ORDER BY rv.CreatedAt DESC
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;

    SELECT COUNT(*) AS Total
    FROM dbo.Reviews rv
    INNER JOIN dbo.Restaurants r ON r.Id = rv.RestaurantId
    WHERE rv.RestaurantId = @RestaurantId
      AND (@IsAdmin = 1 OR r.OwnerUserId = @UserId)
      ${ratingFilter};

    SELECT COUNT(*) AS RestaurantAccess
    FROM dbo.Restaurants
    WHERE Id = @RestaurantId
      AND (@IsAdmin = 1 OR OwnerUserId = @UserId);
  `);
  if (!result.recordsets?.[2]?.[0]?.RestaurantAccess) throw httpError(403, 'Bạn không sở hữu quán ăn này.');
  const total = Number(result.recordsets?.[1]?.[0]?.Total || 0);
  return { data: result.recordsets[0] || [], total, page, totalPages: Math.ceil(total / limit) };
};

const upsertReviewReply = async ({ userId, role, reviewId, content }) => {
  const pool = await getPool();
  if (pool.__isMock) {
    const state = getMockState();
    const review = state.reviews.find((item) => String(item.Id) === String(reviewId));
    if (!review) throw httpError(404, 'Không tìm thấy đánh giá.');
    getMockRestaurantOrThrow(review.RestaurantId, userId, role);
    const existing = mockReviewReplies.get(String(reviewId));
    const reply = {
      Id: existing?.Id || crypto.randomUUID(), ReviewId: reviewId, OwnerUserId: userId,
      Content: content, CreatedAtUtc: existing?.CreatedAtUtc || new Date(), UpdatedAtUtc: new Date(),
    };
    mockReviewReplies.set(String(reviewId), reply);
    return reply;
  }

  const result = await pool.request()
    .input('ReviewId', sql.UniqueIdentifier, reviewId)
    .input('UserId', sql.UniqueIdentifier, userId)
    .input('IsAdmin', sql.Bit, isAdmin(role) ? 1 : 0)
    .input('Content', sql.NVarChar(1000), content)
    .query(`
      IF NOT EXISTS (
        SELECT 1
        FROM dbo.Reviews rv
        INNER JOIN dbo.Restaurants r ON r.Id = rv.RestaurantId
        WHERE rv.Id = @ReviewId
          AND (@IsAdmin = 1 OR r.OwnerUserId = @UserId)
      )
        THROW 50001, N'Bạn không có quyền phản hồi đánh giá này.', 1;

      MERGE dbo.ReviewReplies AS target
      USING (SELECT @ReviewId AS ReviewId) AS source
      ON target.ReviewId = source.ReviewId
      WHEN MATCHED THEN UPDATE SET
        Content = @Content,
        OwnerUserId = @UserId,
        UpdatedAtUtc = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN INSERT (ReviewId, OwnerUserId, Content)
        VALUES (@ReviewId, @UserId, @Content)
      OUTPUT INSERTED.*;
    `);
  return result.recordset[0];
};

const deleteReviewReply = async ({ userId, role, reviewId }) => {
  const pool = await getPool();
  if (pool.__isMock) {
    const state = getMockState();
    const review = state.reviews.find((item) => String(item.Id) === String(reviewId));
    if (!review) throw httpError(404, 'Không tìm thấy đánh giá.');
    getMockRestaurantOrThrow(review.RestaurantId, userId, role);
    mockReviewReplies.delete(String(reviewId));
    return;
  }

  const result = await pool.request()
    .input('ReviewId', sql.UniqueIdentifier, reviewId)
    .input('UserId', sql.UniqueIdentifier, userId)
    .input('IsAdmin', sql.Bit, isAdmin(role) ? 1 : 0)
    .query(`
      DELETE rr
      FROM dbo.ReviewReplies rr
      INNER JOIN dbo.Reviews rv ON rv.Id = rr.ReviewId
      INNER JOIN dbo.Restaurants r ON r.Id = rv.RestaurantId
      WHERE rr.ReviewId = @ReviewId
        AND (@IsAdmin = 1 OR r.OwnerUserId = @UserId);
    `);
  if (!result.rowsAffected?.[0]) throw httpError(404, 'Không tìm thấy phản hồi hoặc bạn không có quyền xóa.');
};

const updateCrowdStatus = async ({ userId, role, restaurantId, crowdStatus }) => {
  const pool = await getPool();
  if (pool.__isMock) {
    const { restaurant } = getMockRestaurantOrThrow(restaurantId, userId, role);
    restaurant.CrowdStatus = crowdStatus;
    restaurant.CrowdUpdatedAtUtc = new Date();
    restaurant.CrowdUpdatedByUserId = userId;
    return restaurant;
  }

  const result = await pool.request()
    .input('RestaurantId', sql.UniqueIdentifier, restaurantId)
    .input('UserId', sql.UniqueIdentifier, userId)
    .input('IsAdmin', sql.Bit, isAdmin(role) ? 1 : 0)
    .input('CrowdStatus', sql.NVarChar(20), crowdStatus)
    .query(`
      UPDATE dbo.Restaurants
      SET CrowdStatus = @CrowdStatus,
          CrowdUpdatedAtUtc = SYSUTCDATETIME(),
          CrowdUpdatedByUserId = @UserId
      OUTPUT INSERTED.Id, INSERTED.Slug, INSERTED.CrowdStatus, INSERTED.CrowdUpdatedAtUtc
      WHERE Id = @RestaurantId
        AND (@IsAdmin = 1 OR OwnerUserId = @UserId);
    `);
  if (!result.recordset?.length) throw httpError(403, 'Không tìm thấy quán hoặc bạn không sở hữu quán này.');
  return result.recordset[0];
};

const getReportRows = async ({ userId, role, from, to, restaurantId }) => {
  const range = normalizeRange({ from, to, defaultDays: 31 });
  const pool = await getPool();

  if (pool.__isMock) {
    const state = getMockState();
    const dailyStats = getMockDailyStats();
    const rows = [];
    for (const restaurant of state.restaurants) {
      if (!canAccessMockRestaurant(restaurant, userId, role)) continue;
      if (restaurantId && String(restaurant.Id) !== String(restaurantId)) continue;
      const bookmarks = state.bookmarks.filter((entry) => String(entry.RestaurantId) === String(restaurant.Id)).length;
      const reviews = state.reviews.filter((entry) => String(entry.RestaurantId) === String(restaurant.Id)).length;
      const menu = state.menuItems.filter((entry) => String(entry.RestaurantId) === String(restaurant.Id));
      let added = false;
      for (const [key, totalViews] of dailyStats.entries()) {
        const separator = key.lastIndexOf(':');
        const id = key.slice(0, separator);
        const statDate = key.slice(separator + 1);
        if (String(id) !== String(restaurant.Id) || statDate < range.from || statDate > range.to) continue;
        rows.push({
          RestaurantId: restaurant.Id, RestaurantName: restaurant.Name, StatDate: statDate,
          TotalViews: Number(totalViews || 0), CurrentBookmarks: bookmarks,
          CurrentRating: Number(restaurant.Rating || 0), ReviewCount: reviews,
          AvailableItems: menu.filter((item) => item.IsAvailable !== false).length,
          OutOfStockItems: menu.filter((item) => item.IsAvailable === false).length,
        });
        added = true;
      }
      if (!added) rows.push({
        RestaurantId: restaurant.Id, RestaurantName: restaurant.Name, StatDate: '', TotalViews: 0,
        CurrentBookmarks: bookmarks, CurrentRating: Number(restaurant.Rating || 0), ReviewCount: reviews,
        AvailableItems: menu.filter((item) => item.IsAvailable !== false).length,
        OutOfStockItems: menu.filter((item) => item.IsAvailable === false).length,
      });
    }
    return { rows, range };
  }

  const request = pool.request()
    .input('UserId', sql.UniqueIdentifier, userId)
    .input('IsAdmin', sql.Bit, isAdmin(role) ? 1 : 0)
    .input('FromDate', sql.Date, range.fromDate)
    .input('ToDate', sql.Date, range.toDate)
    .input('FromUtc', sql.DateTime2(3), range.fromUtc)
    .input('ToExclusiveUtc', sql.DateTime2(3), range.toExclusiveUtc);

  let restaurantFilter = '';
  if (restaurantId) {
    request.input('RestaurantId', sql.UniqueIdentifier, restaurantId);
    restaurantFilter = 'AND r.Id = @RestaurantId';
  }

  const result = await request.query(`
    ;WITH DailyViews AS (
      SELECT RestaurantId, StatDate, SUM(TotalViews) AS TotalViews
      FROM (
        SELECT RestaurantId, StatDate, TotalViews
        FROM dbo.RestaurantDailyStats
        WHERE StatDate BETWEEN @FromDate AND @ToDate
        UNION ALL
        SELECT RestaurantId, CONVERT(DATE, ViewedAtUtc), COUNT_BIG(*)
        FROM dbo.RestaurantViews
        WHERE ViewedAtUtc >= @FromUtc AND ViewedAtUtc < @ToExclusiveUtc
        GROUP BY RestaurantId, CONVERT(DATE, ViewedAtUtc)
      ) source
      GROUP BY RestaurantId, StatDate
    ), BookmarkTotals AS (
      SELECT RestaurantId, COUNT_BIG(*) AS CurrentBookmarks
      FROM dbo.Bookmarks GROUP BY RestaurantId
    ), ReviewTotals AS (
      SELECT RestaurantId, COUNT_BIG(*) AS ReviewCount
      FROM dbo.Reviews GROUP BY RestaurantId
    ), MenuTotals AS (
      SELECT RestaurantId,
        SUM(CASE WHEN IsAvailable = 1 THEN 1 ELSE 0 END) AS AvailableItems,
        SUM(CASE WHEN IsAvailable = 0 THEN 1 ELSE 0 END) AS OutOfStockItems
      FROM dbo.MenuItems GROUP BY RestaurantId
    )
    SELECT r.Id AS RestaurantId, r.Name AS RestaurantName,
      CONVERT(VARCHAR(10), d.StatDate, 23) AS StatDate,
      COALESCE(d.TotalViews, 0) AS TotalViews,
      COALESCE(b.CurrentBookmarks, 0) AS CurrentBookmarks,
      r.Rating AS CurrentRating,
      COALESCE(rv.ReviewCount, 0) AS ReviewCount,
      COALESCE(m.AvailableItems, 0) AS AvailableItems,
      COALESCE(m.OutOfStockItems, 0) AS OutOfStockItems
    FROM dbo.Restaurants r
    LEFT JOIN DailyViews d ON d.RestaurantId = r.Id
    LEFT JOIN BookmarkTotals b ON b.RestaurantId = r.Id
    LEFT JOIN ReviewTotals rv ON rv.RestaurantId = r.Id
    LEFT JOIN MenuTotals m ON m.RestaurantId = r.Id
    WHERE (@IsAdmin = 1 OR r.OwnerUserId = @UserId)
      ${restaurantFilter}
    ORDER BY d.StatDate, r.Name;
  `);
  return { rows: result.recordset || [], range };
};

const preventSpreadsheetFormula = (value) => {
  const text = String(value ?? '');
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
};
const csvCell = (value) => `"${preventSpreadsheetFormula(value).replace(/"/g, '""')}"`;

const reportHeaders = [
  'RestaurantId', 'RestaurantName', 'DateUTC', 'TotalViews', 'CurrentBookmarks',
  'CurrentRating', 'ReviewCount', 'AvailableItems', 'OutOfStockItems',
];

const buildCsv = (rows) => {
  const lines = [reportHeaders.map(csvCell).join(',')];
  for (const row of rows) {
    lines.push([
      row.RestaurantId, row.RestaurantName, row.StatDate, row.TotalViews,
      row.CurrentBookmarks, row.CurrentRating, row.ReviewCount,
      row.AvailableItems, row.OutOfStockItems,
    ].map(csvCell).join(','));
  }
  return `\uFEFF${lines.join('\r\n')}`;
};

const xmlEscape = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const excelColumnName = (index) => {
  let value = index + 1;
  let name = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
};

const inlineStringCell = (reference, value, style = 0) => (
  `<c r="${reference}" t="inlineStr"${style ? ` s="${style}"` : ''}>` +
  `<is><t xml:space="preserve">${xmlEscape(preventSpreadsheetFormula(value))}</t></is></c>`
);

const numericCell = (reference, value, style = 0) => {
  const number = Number(value);
  const safe = Number.isFinite(number) ? number : 0;
  return `<c r="${reference}" t="n"${style ? ` s="${style}"` : ''}><v>${safe}</v></c>`;
};

const buildXlsx = async (rows) => {
  const zip = new JSZip();
  const createdAt = new Date().toISOString();
  const headers = [
    'Restaurant ID', 'Restaurant Name', 'Date (UTC)', 'Total Views',
    'Current Bookmarks', 'Current Rating', 'Review Count',
    'Available Items', 'Out of Stock Items',
  ];
  const columnWidths = [38, 32, 16, 14, 20, 15, 14, 16, 18];

  const sheetRows = [];
  sheetRows.push(
    `<row r="1">${headers.map((value, index) => inlineStringCell(`${excelColumnName(index)}1`, value, 1)).join('')}</row>`,
  );

  rows.forEach((row, rowIndex) => {
    const excelRow = rowIndex + 2;
    const values = [
      { value: row.RestaurantId, type: 'string' },
      { value: row.RestaurantName, type: 'string' },
      { value: row.StatDate instanceof Date ? row.StatDate.toISOString().slice(0, 10) : row.StatDate, type: 'string' },
      { value: row.TotalViews, type: 'number' },
      { value: row.CurrentBookmarks, type: 'number' },
      { value: row.CurrentRating, type: 'number' },
      { value: row.ReviewCount, type: 'number' },
      { value: row.AvailableItems, type: 'number' },
      { value: row.OutOfStockItems, type: 'number' },
    ];
    const cells = values.map((item, columnIndex) => {
      const ref = `${excelColumnName(columnIndex)}${excelRow}`;
      return item.type === 'number'
        ? numericCell(ref, item.value)
        : inlineStringCell(ref, item.value);
    }).join('');
    sheetRows.push(`<row r="${excelRow}">${cells}</row>`);
  });

  const columnsXml = columnWidths
    .map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`)
    .join('');

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`);

  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`);

  zip.file('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>FlavorMap</dc:creator>
  <cp:lastModifiedBy>FlavorMap</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:modified>
</cp:coreProperties>`);

  zip.file('docProps/app.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>FlavorMap</Application>
</Properties>`);

  zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Owner Report" sheetId="1" r:id="rId1"/></sheets>
</workbook>`);

  zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);

  zip.file('xl/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`);

  const lastRow = Math.max(1, rows.length + 1);
  zip.file('xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:I${lastRow}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols>${columnsXml}</cols>
  <sheetData>${sheetRows.join('')}</sheetData>
  <autoFilter ref="A1:I${lastRow}"/>
</worksheet>`);

  return zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
    platform: 'DOS',
  });
};

module.exports = {
  normalizeRange,
  getOwnedRestaurants,
  getDashboard,
  getRestaurantDetails,
  updateRestaurantInfo,
  updateOperations,
  getOpeningHours,
  updateOpeningHours,
  getMenuCategories,
  addMenuCategory,
  updateMenuCategory,
  deleteMenuCategory,
  getMenu,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getOwnerReviews,
  upsertReviewReply,
  deleteReviewReply,
  updateCrowdStatus,
  getReportRows,
  buildCsv,
  buildXlsx,
};
