const crypto = require('crypto');
const { getPool, sql, getMockState } = require('../../config/db');
const httpError = require('../../utils/httpError');

const ALLOWED_CATEGORIES = new Set(['Cafe', 'Cơm', 'Đồ ăn vặt', 'Nước', 'Hải sản', 'Khác']);

const makeSlug = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 190);

const timeValue = (value, fallback) => value || fallback;
const numberValue = (value, fallback = 0) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeRestaurant = (data) => {
  const priceMin = Math.max(0, numberValue(data.PriceMin));
  const priceMax = Math.max(priceMin, numberValue(data.PriceMax, priceMin));
  return {
    Name: String(data.Name || '').trim(),
    Address: String(data.Address || '').trim(),
    City: String(data.City || 'Hà Nội').trim(),
    District: data.District ? String(data.District).trim() : null,
    Category: ALLOWED_CATEGORIES.has(data.Category) ? data.Category : 'Khác',
    Description: data.Description ? String(data.Description).trim() : null,
    PriceMin: priceMin,
    PriceMax: priceMax,
    OpeningTime: timeValue(data.OpeningTime, '08:00'),
    ClosingTime: timeValue(data.ClosingTime, '22:00'),
    BannerUrl: data.BannerUrl || null,
    IsFeatured: Boolean(data.IsFeatured),
    IsNew: data.IsNew === undefined ? true : Boolean(data.IsNew),
  };
};

const uniqueMockSlug = (base, restaurants) => {
  let slug = base || `restaurant-${Date.now()}`;
  let counter = 2;
  while (restaurants.some((item) => item.Slug === slug)) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
};

exports.getSubmissions = async (statusFilter) => {
  const pool = await getPool();
  const processedOnly = statusFilter === 'Processed';
  const normalizedStatus = statusFilter && !processedOnly ? String(statusFilter) : null;

  if (pool.__isMock) {
    return getMockState().submissions
      .filter((item) => item.SubmissionType === 'MissingRestaurantLead')
      .filter((item) => processedOnly ? ['Approved', 'Rejected'].includes(item.Status) : (!normalizedStatus || item.Status === normalizedStatus))
      .sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt));
  }

  const request = pool.request();
  let statusSql = processedOnly ? `AND Status IN (N'Approved', N'Rejected')` : '';
  if (normalizedStatus) {
    request.input('Status', sql.NVarChar(20), normalizedStatus);
    statusSql = 'AND Status = @Status';
  }
  const result = await request.query(`
    SELECT *
    FROM dbo.RestaurantSubmissions
    WHERE SubmissionType = N'MissingRestaurantLead'
      ${statusSql}
    ORDER BY CreatedAt DESC;
  `);
  return result.recordset || [];
};


exports.updateMissingRestaurantLeadStatus = async ({ id, status, note, reviewerId }) => {
  const allowed = new Set(['UnderReview', 'Approved', 'Rejected']);
  if (!allowed.has(status)) throw httpError(400, 'Trạng thái xử lý đầu mối không hợp lệ.');
  if (status === 'Rejected' && !String(note || '').trim()) {
    throw httpError(400, 'Từ chối thông tin quán chưa có bắt buộc phải nêu lý do.');
  }

  const pool = await getPool();
  if (pool.__isMock) {
    const item = getMockState().submissions.find((entry) =>
      String(entry.Id) === String(id) && entry.SubmissionType === 'MissingRestaurantLead'
    );
    if (!item) throw httpError(404, 'Không tìm thấy thông tin quán chưa có.');
    const validTransition = (
      (status === 'UnderReview' && item.Status === 'Submitted')
      || (['Approved', 'Rejected'].includes(status) && ['Submitted', 'UnderReview'].includes(item.Status))
    );
    if (!validTransition) throw httpError(409, 'Thông tin này không ở trạng thái có thể xử lý.');
    item.Status = status;
    item.AdminNote = status === 'Approved' ? (note || 'Đã xác nhận đây là đầu mối hợp lệ để liên hệ Chủ quán.') : null;
    item.RejectionReason = status === 'Rejected' ? String(note).trim() : null;
    item.ProcessedByUserId = reviewerId;
    item.ProcessedAtUtc = ['Approved', 'Rejected'].includes(status) ? new Date() : null;
    item.ReviewStartedAtUtc = status === 'UnderReview' ? new Date() : item.ReviewStartedAtUtc;
    item.UpdatedAtUtc = new Date();
    return item;
  }

  const result = await pool.request()
    .input('Id', sql.UniqueIdentifier, id)
    .input('Status', sql.NVarChar(20), status)
    .input('Note', sql.NVarChar(500), String(note || '').trim() || null)
    .input('ReviewerId', sql.UniqueIdentifier, reviewerId)
    .query(`
      UPDATE dbo.RestaurantSubmissions
      SET Status = @Status,
          AdminNote = CASE WHEN @Status = N'Approved' THEN COALESCE(@Note, N'Đã xác nhận đây là đầu mối hợp lệ để liên hệ Chủ quán.') ELSE NULL END,
          RejectionReason = CASE WHEN @Status = N'Rejected' THEN @Note ELSE NULL END,
          ProcessedByUserId = @ReviewerId,
          ReviewStartedAtUtc = CASE WHEN @Status = N'UnderReview' THEN SYSUTCDATETIME() ELSE ReviewStartedAtUtc END,
          ProcessedAtUtc = CASE WHEN @Status IN (N'Approved', N'Rejected') THEN SYSUTCDATETIME() ELSE NULL END,
          UpdatedAtUtc = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE Id = @Id
        AND SubmissionType = N'MissingRestaurantLead'
        AND (
          (@Status = N'UnderReview' AND Status = N'Submitted')
          OR (@Status IN (N'Approved', N'Rejected') AND Status IN (N'Submitted', N'UnderReview'))
        );
    `);
  if (!result.recordset?.length) {
    const existing = await pool.request().input('Id', sql.UniqueIdentifier, id)
      .query(`SELECT Id FROM dbo.RestaurantSubmissions WHERE Id = @Id AND SubmissionType = N'MissingRestaurantLead';`);
    if (!existing.recordset?.length) throw httpError(404, 'Không tìm thấy thông tin quán chưa có.');
    throw httpError(409, 'Thông tin này không ở trạng thái có thể xử lý.');
  }
  return result.recordset[0];
};

exports.getUsers = async () => {
  const pool = await getPool();
  if (pool.__isMock) {
    return getMockState().users.map(({ PasswordHash, ...user }) => user);
  }
  const result = await pool.request().query(`
    SELECT Id, Email, FullName, Role, IsBanned, CreatedAt
    FROM dbo.Users
    ORDER BY CreatedAt DESC;
  `);
  return result.recordset || [];
};

exports.updateUserRole = async ({ id, role, requesterId }) => {
  if (String(id) === String(requesterId) && role !== 'Admin') {
    throw httpError(400, 'Bạn không thể tự hạ quyền Admin của chính mình.');
  }
  const pool = await getPool();
  if (pool.__isMock) {
    const user = getMockState().users.find((item) => String(item.Id) === String(id));
    if (!user) throw httpError(404, 'Không tìm thấy người dùng.');
    user.Role = role;
    return;
  }
  const result = await pool.request()
    .input('Id', sql.UniqueIdentifier, id)
    .input('Role', sql.NVarChar(20), role)
    .query('UPDATE dbo.Users SET Role = @Role WHERE Id = @Id');
  if (!result.rowsAffected?.[0]) throw httpError(404, 'Không tìm thấy người dùng.');
};

exports.banUser = async ({ id, isBanned, requesterId, requesterRole }) => {
  if (String(id) === String(requesterId)) throw httpError(400, 'Bạn không thể tự khóa tài khoản của mình.');
  const pool = await getPool();

  if (pool.__isMock) {
    const user = getMockState().users.find((item) => String(item.Id) === String(id));
    if (!user) throw httpError(404, 'Không tìm thấy người dùng.');
    if (requesterRole === 'Manager' && ['Manager', 'Admin'].includes(user.Role)) {
      throw httpError(403, 'Manager không thể khóa Manager hoặc Admin.');
    }
    user.IsBanned = Boolean(isBanned);
    if (isBanned) {
      const state = getMockState();
      for (let index = state.refreshTokens.length - 1; index >= 0; index -= 1) {
        if (String(state.refreshTokens[index].UserId) === String(id)) state.refreshTokens.splice(index, 1);
      }
    }
    return;
  }

  const targetResult = await pool.request()
    .input('Id', sql.UniqueIdentifier, id)
    .query('SELECT Role FROM dbo.Users WHERE Id = @Id');
  const target = targetResult.recordset?.[0];
  if (!target) throw httpError(404, 'Không tìm thấy người dùng.');
  if (requesterRole === 'Manager' && ['Manager', 'Admin'].includes(target.Role)) {
    throw httpError(403, 'Manager không thể khóa Manager hoặc Admin.');
  }

  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    await transaction.request()
      .input('Id', sql.UniqueIdentifier, id)
      .input('IsBanned', sql.Bit, isBanned ? 1 : 0)
      .query('UPDATE dbo.Users SET IsBanned = @IsBanned WHERE Id = @Id');
    if (isBanned) {
      await transaction.request()
        .input('Id', sql.UniqueIdentifier, id)
        .query('DELETE FROM dbo.RefreshTokens WHERE UserId = @Id');
    }
    await transaction.commit();
  } catch (error) {
    try { await transaction.rollback(); } catch { /* ignore */ }
    throw error;
  }
};

exports.getRestaurants = async () => {
  const pool = await getPool();
  if (pool.__isMock) return getMockState().restaurants;
  const result = await pool.request().query(`
    SELECT r.*, u.FullName AS OwnerName, u.Email AS OwnerEmail,
           CONVERT(VARCHAR(5), r.OpeningTime, 108) AS OpeningTimeText,
           CONVERT(VARCHAR(5), r.ClosingTime, 108) AS ClosingTimeText
    FROM dbo.Restaurants r
    LEFT JOIN dbo.Users u ON u.Id = r.OwnerUserId
    ORDER BY r.CreatedAt DESC;
  `);
  return (result.recordset || []).map((item) => ({
    ...item,
    OpeningTime: item.OpeningTimeText || item.OpeningTime,
    ClosingTime: item.ClosingTimeText || item.ClosingTime,
  }));
};

exports.createRestaurant = async (data, requesterRole) => {
  const pool = await getPool();
  const normalized = normalizeRestaurant(data);
  if (!normalized.Name || !normalized.Address) throw httpError(400, 'Tên và địa chỉ quán là bắt buộc.');
  const requestedOwner = requesterRole === 'Admin' ? (data.OwnerUserId || null) : null;

  if (pool.__isMock) {
    const state = getMockState();
    const restaurant = {
      Id: crypto.randomUUID(),
      Slug: uniqueMockSlug(makeSlug(normalized.Name), state.restaurants),
      ...normalized,
      Rating: 0,
      OwnerUserId: requestedOwner,
      CrowdStatus: 'moderate',
      CrowdUpdatedAtUtc: new Date(),
      CreatedAt: new Date(),
    };
    state.restaurants.push(restaurant);
    return restaurant;
  }

  const baseSlug = makeSlug(normalized.Name);
  let slug = baseSlug;
  const existing = await pool.request().input('Slug', sql.NVarChar(220), slug)
    .query('SELECT Id FROM dbo.Restaurants WHERE Slug = @Slug');
  if (existing.recordset.length) slug = `${baseSlug}-${Date.now().toString().slice(-6)}`;

  const result = await pool.request()
    .input('Name', sql.NVarChar(200), normalized.Name)
    .input('Slug', sql.NVarChar(220), slug)
    .input('Address', sql.NVarChar(300), normalized.Address)
    .input('City', sql.NVarChar(100), normalized.City)
    .input('District', sql.NVarChar(100), normalized.District)
    .input('Category', sql.NVarChar(50), normalized.Category)
    .input('Description', sql.NVarChar(sql.MAX), normalized.Description)
    .input('PriceMin', sql.Int, normalized.PriceMin)
    .input('PriceMax', sql.Int, normalized.PriceMax)
    .input('OpeningTime', sql.VarChar(5), normalized.OpeningTime)
    .input('ClosingTime', sql.VarChar(5), normalized.ClosingTime)
    .input('BannerUrl', sql.NVarChar(500), normalized.BannerUrl)
    .input('IsFeatured', sql.Bit, normalized.IsFeatured ? 1 : 0)
    .input('IsNew', sql.Bit, normalized.IsNew ? 1 : 0)
    .input('OwnerUserId', sql.UniqueIdentifier, requestedOwner)
    .query(`
      INSERT INTO dbo.Restaurants (
        Name, Slug, Address, City, District, Category, Description,
        PriceMin, PriceMax, OpeningTime, ClosingTime, BannerUrl,
        Rating, IsFeatured, IsNew, OwnerUserId
      )
      OUTPUT INSERTED.*
      VALUES (
        @Name, @Slug, @Address, @City, @District, @Category, @Description,
        @PriceMin, @PriceMax, @OpeningTime, @ClosingTime, @BannerUrl,
        0, @IsFeatured, @IsNew, @OwnerUserId
      );
    `);
  return result.recordset[0];
};

exports.updateRestaurant = async (id, data, requesterRole) => {
  const pool = await getPool();
  const normalized = normalizeRestaurant(data);
  if (!normalized.Name || !normalized.Address) throw httpError(400, 'Tên và địa chỉ quán là bắt buộc.');
  const mayChangeOwner = requesterRole === 'Admin' && Object.prototype.hasOwnProperty.call(data, 'OwnerUserId');

  if (pool.__isMock) {
    const restaurant = getMockState().restaurants.find((item) => String(item.Id) === String(id));
    if (!restaurant) throw httpError(404, 'Không tìm thấy quán ăn.');
    Object.assign(restaurant, normalized);
    if (mayChangeOwner) restaurant.OwnerUserId = data.OwnerUserId || null;
    return restaurant;
  }

  const request = pool.request()
    .input('Id', sql.UniqueIdentifier, id)
    .input('Name', sql.NVarChar(200), normalized.Name)
    .input('Address', sql.NVarChar(300), normalized.Address)
    .input('City', sql.NVarChar(100), normalized.City)
    .input('District', sql.NVarChar(100), normalized.District)
    .input('Category', sql.NVarChar(50), normalized.Category)
    .input('Description', sql.NVarChar(sql.MAX), normalized.Description)
    .input('PriceMin', sql.Int, normalized.PriceMin)
    .input('PriceMax', sql.Int, normalized.PriceMax)
    .input('OpeningTime', sql.VarChar(5), normalized.OpeningTime)
    .input('ClosingTime', sql.VarChar(5), normalized.ClosingTime)
    .input('BannerUrl', sql.NVarChar(500), normalized.BannerUrl)
    .input('IsFeatured', sql.Bit, normalized.IsFeatured ? 1 : 0)
    .input('IsNew', sql.Bit, normalized.IsNew ? 1 : 0);

  let ownerSql = '';
  if (mayChangeOwner) {
    request.input('OwnerUserId', sql.UniqueIdentifier, data.OwnerUserId || null);
    ownerSql = ', OwnerUserId = @OwnerUserId';
  }

  const result = await request.query(`
    UPDATE dbo.Restaurants
    SET Name = @Name, Address = @Address, City = @City, District = @District,
        Category = @Category, Description = @Description,
        PriceMin = @PriceMin, PriceMax = @PriceMax,
        OpeningTime = @OpeningTime, ClosingTime = @ClosingTime,
        BannerUrl = @BannerUrl, IsFeatured = @IsFeatured, IsNew = @IsNew
        ${ownerSql}
    OUTPUT INSERTED.*
    WHERE Id = @Id;
  `);
  if (!result.recordset?.length) throw httpError(404, 'Không tìm thấy quán ăn.');
  return result.recordset[0];
};

exports.assignRestaurantOwner = async (restaurantId, ownerUserId) => {
  const pool = await getPool();
  if (pool.__isMock) {
    const state = getMockState();
    const restaurant = state.restaurants.find((item) => String(item.Id) === String(restaurantId));
    if (!restaurant) throw httpError(404, 'Không tìm thấy quán ăn.');
    if (ownerUserId) {
      const owner = state.users.find((item) => String(item.Id) === String(ownerUserId));
      if (!owner || owner.Role !== 'Owner') throw httpError(400, 'Tài khoản được gán phải có role Owner.');
    }
    restaurant.OwnerUserId = ownerUserId || null;
    return restaurant;
  }

  if (ownerUserId) {
    const ownerResult = await pool.request()
      .input('OwnerUserId', sql.UniqueIdentifier, ownerUserId)
      .query("SELECT Id FROM dbo.Users WHERE Id = @OwnerUserId AND Role = N'Owner' AND IsBanned = 0");
    if (!ownerResult.recordset.length) throw httpError(400, 'Tài khoản được gán phải là Owner đang hoạt động.');
  }

  const result = await pool.request()
    .input('RestaurantId', sql.UniqueIdentifier, restaurantId)
    .input('OwnerUserId', sql.UniqueIdentifier, ownerUserId || null)
    .query(`
      UPDATE dbo.Restaurants
      SET OwnerUserId = @OwnerUserId
      OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.OwnerUserId
      WHERE Id = @RestaurantId;
    `);
  if (!result.recordset.length) throw httpError(404, 'Không tìm thấy quán ăn.');
  return result.recordset[0];
};

exports.updateRestaurantPublicationStatus = async ({ id, publicationStatus, note, reviewerId }) => {
  const pool = await getPool();
  if (publicationStatus !== 'Published' && !String(note || '').trim()) {
    throw httpError(400, 'Ẩn hoặc đình chỉ quán bắt buộc phải có lý do.');
  }

  if (pool.__isMock) {
    const restaurant = getMockState().restaurants.find((item) => String(item.Id) === String(id));
    if (!restaurant) throw httpError(404, 'Không tìm thấy quán ăn.');
    if (publicationStatus === 'Published' && restaurant.VerificationStatus !== 'Verified') {
      throw httpError(409, 'Quán chưa được xác minh nên không thể xuất bản.');
    }
    restaurant.PublicationStatus = publicationStatus;
    restaurant.PublicationNote = note || null;
    restaurant.PublicationUpdatedAtUtc = new Date();
    restaurant.VerifiedByUserId = publicationStatus === 'Published' ? reviewerId : restaurant.VerifiedByUserId;
    return restaurant;
  }

  const result = await pool.request()
    .input('Id', sql.UniqueIdentifier, id)
    .input('PublicationStatus', sql.NVarChar(30), publicationStatus)
    .input('PublicationNote', sql.NVarChar(500), note || null)
    .input('ReviewerId', sql.UniqueIdentifier, reviewerId)
    .query(`
      UPDATE dbo.Restaurants
      SET PublicationStatus = @PublicationStatus,
          PublicationNote = @PublicationNote,
          PublicationUpdatedAtUtc = SYSUTCDATETIME(),
          VerifiedByUserId = CASE WHEN @PublicationStatus = N'Published' THEN @ReviewerId ELSE VerifiedByUserId END,
          LastVerifiedAtUtc = CASE WHEN @PublicationStatus = N'Published' THEN SYSUTCDATETIME() ELSE LastVerifiedAtUtc END
      OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.Slug,
             INSERTED.PublicationStatus, INSERTED.VerificationStatus,
             INSERTED.PublicationNote, INSERTED.PublicationUpdatedAtUtc
      WHERE Id = @Id
        AND (@PublicationStatus <> N'Published' OR VerificationStatus = N'Verified');
    `);
  if (!result.recordset.length) {
    const existing = await pool.request().input('Id', sql.UniqueIdentifier, id)
      .query('SELECT Id, VerificationStatus FROM dbo.Restaurants WHERE Id = @Id;');
    if (!existing.recordset.length) throw httpError(404, 'Không tìm thấy quán ăn.');
    throw httpError(409, 'Quán chưa được xác minh nên không thể xuất bản.');
  }
  return result.recordset[0];
};

exports.deleteRestaurant = async (id) => {
  const pool = await getPool();
  if (pool.__isMock) {
    const state = getMockState();
    const index = state.restaurants.findIndex((item) => String(item.Id) === String(id));
    if (index < 0) throw httpError(404, 'Không tìm thấy quán ăn.');
    state.restaurants.splice(index, 1);
    return;
  }
  const result = await pool.request().input('Id', sql.UniqueIdentifier, id)
    .query('DELETE FROM dbo.Restaurants WHERE Id = @Id');
  if (!result.rowsAffected?.[0]) throw httpError(404, 'Không tìm thấy quán ăn.');
};

exports.getMenuByRestaurantId = async (restaurantId) => {
  const pool = await getPool();
  if (pool.__isMock) return getMockState().menuItems.filter((item) => String(item.RestaurantId) === String(restaurantId));
  const result = await pool.request().input('RestaurantId', sql.UniqueIdentifier, restaurantId)
    .query('SELECT * FROM dbo.MenuItems WHERE RestaurantId = @RestaurantId ORDER BY CreatedAt DESC');
  return result.recordset || [];
};

exports.addMenuItem = async (restaurantId, data) => {
  const pool = await getPool();
  if (pool.__isMock) {
    const item = { Id: crypto.randomUUID(), RestaurantId: restaurantId, ...data, CreatedAt: new Date() };
    getMockState().menuItems.push(item);
    return item;
  }
  const result = await pool.request()
    .input('RestaurantId', sql.UniqueIdentifier, restaurantId)
    .input('Name', sql.NVarChar(200), data.Name)
    .input('Description', sql.NVarChar(500), data.Description || null)
    .input('Price', sql.Int, data.Price)
    .input('ImageUrl', sql.NVarChar(500), data.ImageUrl || null)
    .input('IsAvailable', sql.Bit, data.IsAvailable ? 1 : 0)
    .query(`
      INSERT INTO dbo.MenuItems (RestaurantId, Name, Description, Price, ImageUrl, IsAvailable)
      OUTPUT INSERTED.*
      VALUES (@RestaurantId, @Name, @Description, @Price, @ImageUrl, @IsAvailable);
    `);
  return result.recordset[0];
};

exports.updateMenuItem = async (id, data) => {
  const pool = await getPool();
  if (pool.__isMock) {
    const item = getMockState().menuItems.find((entry) => String(entry.Id) === String(id));
    if (!item) throw httpError(404, 'Không tìm thấy món ăn.');
    Object.assign(item, data);
    return item;
  }
  const result = await pool.request()
    .input('Id', sql.UniqueIdentifier, id)
    .input('Name', sql.NVarChar(200), data.Name)
    .input('Description', sql.NVarChar(500), data.Description || null)
    .input('Price', sql.Int, data.Price)
    .input('ImageUrl', sql.NVarChar(500), data.ImageUrl || null)
    .input('IsAvailable', sql.Bit, data.IsAvailable ? 1 : 0)
    .query(`
      UPDATE dbo.MenuItems
      SET Name = @Name, Description = @Description, Price = @Price,
          ImageUrl = @ImageUrl, IsAvailable = @IsAvailable
      OUTPUT INSERTED.*
      WHERE Id = @Id;
    `);
  if (!result.recordset.length) throw httpError(404, 'Không tìm thấy món ăn.');
  return result.recordset[0];
};

exports.deleteMenuItem = async (id) => {
  const pool = await getPool();
  if (pool.__isMock) {
    const state = getMockState();
    const index = state.menuItems.findIndex((item) => String(item.Id) === String(id));
    if (index < 0) throw httpError(404, 'Không tìm thấy món ăn.');
    state.menuItems.splice(index, 1);
    return;
  }
  const result = await pool.request().input('Id', sql.UniqueIdentifier, id)
    .query('DELETE FROM dbo.MenuItems WHERE Id = @Id');
  if (!result.rowsAffected?.[0]) throw httpError(404, 'Không tìm thấy món ăn.');
};

// REVIEW MODERATION ---------------------------------------------------------
exports.getReviewsForModeration = async ({ status = 'Reported', q = '' } = {}) => {
  const allowedStatuses = new Set(['Reported', 'Hidden', 'Visible', 'All']);
  const normalizedStatus = allowedStatuses.has(status) ? status : 'Reported';
  const keyword = String(q || '').trim().toLowerCase();
  const pool = await getPool();

  if (pool.__isMock) {
    const state = getMockState();
    return state.reviews
      .map((review) => {
        const restaurant = state.restaurants.find((item) => String(item.Id) === String(review.RestaurantId)) || {};
        const author = state.users.find((item) => String(item.Id) === String(review.UserId)) || {};
        const pendingReports = state.reviewReports.filter((item) => String(item.ReviewId) === String(review.Id) && item.Status === 'Pending');
        const latest = [...pendingReports].sort((a, b) => new Date(b.CreatedAtUtc) - new Date(a.CreatedAtUtc))[0];
        return {
          ...review,
          RestaurantName: restaurant.Name,
          RestaurantSlug: restaurant.Slug,
          AuthorName: author.FullName,
          AuthorEmail: author.Email,
          PendingReportCount: pendingReports.length,
          LatestReportReason: latest?.Reason || null,
          LatestReportDetails: latest?.Details || null,
        };
      })
      .filter((review) => normalizedStatus === 'All'
        || (normalizedStatus === 'Reported' && review.PendingReportCount > 0)
        || (normalizedStatus === 'Hidden' && review.IsHidden)
        || (normalizedStatus === 'Visible' && !review.IsHidden))
      .filter((review) => !keyword || [review.Comment, review.RestaurantName, review.AuthorName, review.AuthorEmail]
        .some((value) => String(value || '').toLowerCase().includes(keyword)))
      .sort((a, b) => (b.PendingReportCount - a.PendingReportCount) || (new Date(b.CreatedAt) - new Date(a.CreatedAt)));
  }

  const result = await pool.request()
    .input('Status', sql.NVarChar(20), normalizedStatus)
    .input('Q', sql.NVarChar(200), keyword || null)
    .query(`
      SELECT rv.Id, rv.Rating, rv.Comment, rv.CreatedAt, rv.UpdatedAt,
             rv.IsHidden, rv.ModerationReason, rv.ModeratedAtUtc,
             r.Id AS RestaurantId, r.Name AS RestaurantName, r.Slug AS RestaurantSlug,
             u.Id AS UserId, u.FullName AS AuthorName, u.Email AS AuthorEmail,
             reports.PendingReportCount,
             latest.Reason AS LatestReportReason,
             latest.Details AS LatestReportDetails,
             latest.CreatedAtUtc AS LatestReportCreatedAtUtc
      FROM dbo.Reviews rv
      JOIN dbo.Restaurants r ON r.Id = rv.RestaurantId
      JOIN dbo.Users u ON u.Id = rv.UserId
      OUTER APPLY (
        SELECT COUNT(*) AS PendingReportCount
        FROM dbo.ReviewReports rr
        WHERE rr.ReviewId = rv.Id AND rr.Status = N'Pending'
      ) reports
      OUTER APPLY (
        SELECT TOP (1) rr.Reason, rr.Details, rr.CreatedAtUtc
        FROM dbo.ReviewReports rr
        WHERE rr.ReviewId = rv.Id AND rr.Status = N'Pending'
        ORDER BY rr.CreatedAtUtc DESC
      ) latest
      WHERE (
          @Status = N'All'
          OR (@Status = N'Reported' AND reports.PendingReportCount > 0)
          OR (@Status = N'Hidden' AND rv.IsHidden = 1)
          OR (@Status = N'Visible' AND rv.IsHidden = 0)
        )
        AND (
          @Q IS NULL
          OR LOWER(COALESCE(rv.Comment, N'')) LIKE N'%' + @Q + N'%'
          OR LOWER(r.Name) LIKE N'%' + @Q + N'%'
          OR LOWER(u.FullName) LIKE N'%' + @Q + N'%'
          OR LOWER(u.Email) LIKE N'%' + @Q + N'%'
        )
      ORDER BY reports.PendingReportCount DESC, rv.CreatedAt DESC;
    `);
  return result.recordset || [];
};

exports.moderateReview = async ({ id, action, reason, reviewerId }) => {
  const allowed = new Set(['Hide', 'Restore', 'DismissReports']);
  if (!allowed.has(action)) throw httpError(400, 'Hành động kiểm duyệt không hợp lệ.');
  if (action === 'Hide' && !String(reason || '').trim()) {
    throw httpError(400, 'Ẩn đánh giá bắt buộc phải nêu lý do vi phạm.');
  }
  const pool = await getPool();

  if (pool.__isMock) {
    const state = getMockState();
    const review = state.reviews.find((item) => String(item.Id) === String(id));
    if (!review) throw httpError(404, 'Không tìm thấy đánh giá.');
    if (action === 'Hide') {
      review.IsHidden = true;
      review.ModerationReason = String(reason).trim();
      review.ModeratedByUserId = reviewerId;
      review.ModeratedAtUtc = new Date();
    } else if (action === 'Restore') {
      review.IsHidden = false;
      review.ModerationReason = null;
      review.ModeratedByUserId = reviewerId;
      review.ModeratedAtUtc = new Date();
    }
    state.reviewReports
      .filter((item) => String(item.ReviewId) === String(id) && item.Status === 'Pending')
      .forEach((report) => {
        report.Status = action === 'DismissReports' ? 'Dismissed' : 'Resolved';
        report.ResolvedAtUtc = new Date();
        report.ResolvedByUserId = reviewerId;
        report.ResolutionNote = String(reason || (action === 'Restore' ? 'Đã khôi phục đánh giá.' : 'Đã xử lý báo cáo.')).trim();
      });
    const visible = state.reviews.filter((item) => String(item.RestaurantId) === String(review.RestaurantId) && !item.IsHidden);
    const restaurant = state.restaurants.find((item) => String(item.Id) === String(review.RestaurantId));
    if (restaurant) restaurant.Rating = visible.length
      ? visible.reduce((sum, item) => sum + Number(item.Rating || 0), 0) / visible.length
      : 0;
    return review;
  }

  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const found = await transaction.request()
      .input('Id', sql.UniqueIdentifier, id)
      .query('SELECT Id, RestaurantId, IsHidden FROM dbo.Reviews WHERE Id = @Id;');
    if (!found.recordset?.length) throw httpError(404, 'Không tìm thấy đánh giá.');
    const restaurantId = found.recordset[0].RestaurantId;

    if (action === 'Hide') {
      await transaction.request()
        .input('Id', sql.UniqueIdentifier, id)
        .input('Reason', sql.NVarChar(500), String(reason).trim())
        .input('ReviewerId', sql.UniqueIdentifier, reviewerId)
        .query(`
          UPDATE dbo.Reviews
          SET IsHidden = 1, ModerationReason = @Reason,
              ModeratedByUserId = @ReviewerId, ModeratedAtUtc = SYSUTCDATETIME()
          WHERE Id = @Id;
        `);
    } else if (action === 'Restore') {
      await transaction.request()
        .input('Id', sql.UniqueIdentifier, id)
        .input('ReviewerId', sql.UniqueIdentifier, reviewerId)
        .query(`
          UPDATE dbo.Reviews
          SET IsHidden = 0, ModerationReason = NULL,
              ModeratedByUserId = @ReviewerId, ModeratedAtUtc = SYSUTCDATETIME()
          WHERE Id = @Id;
        `);
    }

    await transaction.request()
      .input('ReviewId', sql.UniqueIdentifier, id)
      .input('Status', sql.NVarChar(20), action === 'DismissReports' ? 'Dismissed' : 'Resolved')
      .input('ReviewerId', sql.UniqueIdentifier, reviewerId)
      .input('Note', sql.NVarChar(500), String(reason || (action === 'Restore' ? 'Đã khôi phục đánh giá.' : 'Đã xử lý báo cáo.')).trim())
      .query(`
        UPDATE dbo.ReviewReports
        SET Status = @Status, ResolvedAtUtc = SYSUTCDATETIME(),
            ResolvedByUserId = @ReviewerId, ResolutionNote = @Note
        WHERE ReviewId = @ReviewId AND Status = N'Pending';
      `);

    if (action !== 'DismissReports') {
      await transaction.request()
        .input('RestaurantId', sql.UniqueIdentifier, restaurantId)
        .query(`
          UPDATE dbo.Restaurants
          SET Rating = (
            SELECT ISNULL(AVG(CAST(Rating AS FLOAT)), 0)
            FROM dbo.Reviews
            WHERE RestaurantId = @RestaurantId AND IsHidden = 0
          )
          WHERE Id = @RestaurantId;
        `);
    }

    await transaction.commit();
    return { Id: id, action };
  } catch (error) {
    try { await transaction.rollback(); } catch { /* ignore */ }
    throw error;
  }
};
