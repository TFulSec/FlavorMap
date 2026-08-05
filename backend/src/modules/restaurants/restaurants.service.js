const { getPool, sql, getMockState } = require('../../config/db');

const CROWD_RESET_MS = 2 * 60 * 60 * 1000;
const mockCrowdStatuses = new Map();

const normalizePagination = (pageValue, limitValue) => {
  const page = Math.max(Number.parseInt(pageValue, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(limitValue, 10) || 12, 1), 100);
  return { page, limit, offset: (page - 1) * limit };
};

const normalizeSearchText = (value) => String(value || '').trim().slice(0, 100);

const applyEffectiveCrowdStatus = (restaurant, nowUtc = new Date()) => {
  if (!restaurant) return restaurant;

  const mockValue = mockCrowdStatuses.get(String(restaurant.Slug));
  const reportedStatus = mockValue?.CrowdStatus || restaurant.CrowdStatus || 'moderate';
  const updatedAtValue = mockValue?.CrowdUpdatedAtUtc || restaurant.CrowdUpdatedAtUtc;
  const updatedAt = updatedAtValue ? new Date(updatedAtValue) : null;
  const isStale = !updatedAt || Number.isNaN(updatedAt.getTime()) || (nowUtc - updatedAt) > CROWD_RESET_MS;

  return {
    ...restaurant,
    CrowdReportedStatus: reportedStatus,
    CrowdStatus: isStale ? 'moderate' : reportedStatus,
    CrowdUpdatedAtUtc: updatedAt && !Number.isNaN(updatedAt.getTime()) ? updatedAt.toISOString() : null,
    CrowdIsStale: isStale,
  };
};

const applyCrowdStatusToList = (rows) => {
  const nowUtc = new Date();
  return (rows || []).map((row) => applyEffectiveCrowdStatus(row, nowUtc));
};

// Hàm tính khoảng cách Haversine (SQL)
const haversineSQL = `
  6371 * 2 * ASIN(SQRT(
    POWER(SIN((RADIANS(@Lat) - RADIANS(Latitude)) / 2), 2) +
    COS(RADIANS(@Lat)) * COS(RADIANS(Latitude)) *
    POWER(SIN((RADIANS(@Lng) - RADIANS(Longitude)) / 2), 2)
  ))
`;

// ---------- TRANG CHỦ: Lấy danh sách quán ăn ----------
const getRestaurants = async ({ type, limit: limitValue = 12, page: pageValue = 1, city }) => {
  const pool = await getPool();
  const { page, limit, offset } = normalizePagination(pageValue, limitValue);

  let conditions = ["PublicationStatus = N'Published'", "VerificationStatus = N'Verified'"];

  if (type === 'featured') conditions.push('IsFeatured = 1');
  if (type === 'newest') conditions.push('IsNew = 1');
  if (city) conditions.push('City = @City');

  const whereClause =
    conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

  const request = pool.request()
    .input('Limit', sql.Int, limit)
    .input('Offset', sql.Int, offset);

  if (city) {
    request.input('City', sql.NVarChar, city);
  }

  const result = await request.query(`
    SELECT
      Id,
      Name,
      Slug,
      Address,
      City,
      Category,
      PriceMin,
      PriceMax,
      BannerUrl,
      Rating,
      CrowdStatus,
      CrowdUpdatedAtUtc,
      IsTemporarilyClosed,
      TemporaryCloseReason,
      TemporaryClosedUntilUtc,
      IsFeatured,
      IsNew,
      PublicationStatus,
      VerificationStatus,
      VerifiedAtUtc,
      LastVerifiedAtUtc,
      CONVERT(VARCHAR(5), OpeningTime, 108) AS OpeningTime,
      CONVERT(VARCHAR(5), ClosingTime, 108) AS ClosingTime
    FROM Restaurants
    ${whereClause}
    ORDER BY CreatedAt DESC
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;

    SELECT COUNT(*) AS Total
    FROM Restaurants
    ${whereClause};
  `);

  return {
    data: applyCrowdStatusToList(result.recordsets?.[0] || []),
    total: result.recordsets?.[1]?.[0]?.Total || 0,
    page,
    totalPages: Math.ceil(
      (result.recordsets?.[1]?.[0]?.Total || 0) / limit
    ),
  };
};
// ---------- TÌM KIẾM ----------
const searchRestaurants = async ({ q, page: pageValue = 1, limit: limitValue = 12 }) => {
  const pool = await getPool();
  const { page, limit, offset } = normalizePagination(pageValue, limitValue);
  const keyword = `%${normalizeSearchText(q)}%`;

  const result = await pool.request()
    .input('Keyword', sql.NVarChar, keyword)
    .input('Limit',   sql.Int, parseInt(limit))
    .input('Offset',  sql.Int, offset)
    .query(`
      SELECT DISTINCT r.Id, r.Name, r.Slug, r.Address, r.Category,
             r.PriceMin, r.PriceMax, r.BannerUrl, r.Rating, r.CrowdStatus, r.CrowdUpdatedAtUtc,
             r.IsTemporarilyClosed, r.TemporaryCloseReason, r.TemporaryClosedUntilUtc,
             r.IsNew, r.IsFeatured, r.PublicationStatus, r.VerificationStatus, r.VerifiedAtUtc, r.LastVerifiedAtUtc
      FROM Restaurants r
      LEFT JOIN MenuItems m ON m.RestaurantId = r.Id
      WHERE r.PublicationStatus = N'Published'
        AND r.VerificationStatus = N'Verified'
        AND (r.Name        LIKE @Keyword
         OR r.Description LIKE @Keyword
         OR r.Address     LIKE @Keyword
         OR m.Name        LIKE @Keyword)
      ORDER BY r.Rating DESC
      OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;

      SELECT COUNT(DISTINCT r.Id) AS Total
      FROM Restaurants r
      LEFT JOIN MenuItems m ON m.RestaurantId = r.Id
      WHERE r.PublicationStatus = N'Published'
        AND r.VerificationStatus = N'Verified'
        AND (r.Name        LIKE @Keyword
         OR r.Description LIKE @Keyword
         OR r.Address     LIKE @Keyword
         OR m.Name        LIKE @Keyword);
    `);

  return {
    data: applyCrowdStatusToList(result.recordsets && result.recordsets[0] ? result.recordsets[0] : []),
    total: result.recordsets && result.recordsets[1] && result.recordsets[1][0] ? result.recordsets[1][0].Total : 0,
    page,
    totalPages: result.recordsets && result.recordsets[1] && result.recordsets[1][0] ? Math.ceil(result.recordsets[1][0].Total / limit) : 0,
  };
};

// ---------- BỘ LỌC ----------
const filterRestaurants = async ({
  category, priceMin, priceMax,
  lat, lng, radius, city, q,
  page: pageValue = 1, limit: limitValue = 12,
}) => {
  const pool = await getPool();
  const { page, limit, offset } = normalizePagination(pageValue, limitValue);
  const conditions = ["r.PublicationStatus = N'Published'", "r.VerificationStatus = N'Verified'"];
  const request = pool.request()
    .input('Limit',  sql.Int, parseInt(limit))
    .input('Offset', sql.Int, offset);

  if (category) {
    conditions.push('r.Category = @Category');
    request.input('Category', sql.NVarChar, category);
  }
  if (city) {
    conditions.push('r.City = @City');
    request.input('City', sql.NVarChar, city);
  }
  if (q) {
      conditions.push('(r.Name LIKE @Q OR r.Description LIKE @Q)');
      request.input('Q', sql.NVarChar, `%${normalizeSearchText(q)}%`);
  }
  if (priceMin !== undefined && priceMin !== '') {
    conditions.push('r.PriceMax >= @PriceMin');
    request.input('PriceMin', sql.Int, parseInt(priceMin));
  }
  if (priceMax !== undefined && priceMax !== '') {
    conditions.push('r.PriceMin <= @PriceMax');
    request.input('PriceMax', sql.Int, parseInt(priceMax));
  }
  if (lat && lng && radius) {
    conditions.push(`${haversineSQL} <= @Radius`);
    request.input('Lat',    sql.Float, parseFloat(lat));
    request.input('Lng',    sql.Float, parseFloat(lng));
    request.input('Radius', sql.Float, parseFloat(radius));
  }

  const whereSQL = conditions.length > 0
    ? 'WHERE ' + conditions.join(' AND ')
    : '';

  const distanceCol = (lat && lng)
    ? `, ${haversineSQL} AS DistanceKm`
    : '';

  const result = await request.query(`
    SELECT r.Id, r.Name, r.Slug, r.Address, r.Category,
           r.PriceMin, r.PriceMax, r.BannerUrl, r.Rating, r.CrowdStatus, r.CrowdUpdatedAtUtc,
           r.IsTemporarilyClosed, r.TemporaryCloseReason, r.TemporaryClosedUntilUtc,
           r.PublicationStatus, r.VerificationStatus, r.VerifiedAtUtc, r.LastVerifiedAtUtc${distanceCol}
    FROM Restaurants r
    ${whereSQL}
    ORDER BY r.Rating DESC
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;

    SELECT COUNT(*) AS Total FROM Restaurants r ${whereSQL};
  `);

  return {
    data: applyCrowdStatusToList(result.recordsets && result.recordsets[0] ? result.recordsets[0] : []),
    total: result.recordsets && result.recordsets[1] && result.recordsets[1][0] ? result.recordsets[1][0].Total : 0,
    page,
    totalPages: result.recordsets && result.recordsets[1] && result.recordsets[1][0] ? Math.ceil(result.recordsets[1][0].Total / limit) : 0,
  };
};

// ---------- CHI TIẾT QUÁN ĂN ----------
const getRestaurantBySlug = async (slug) => {
  const pool = await getPool();

  const result = await pool.request()
    .input('Slug', sql.NVarChar, slug)
    .query(`
     SELECT
       Id,
       Name,
       Slug,
       Description,
       Address,
       City,
       District,
       Latitude,
       Longitude,
       Category,
       PriceMin,
       PriceMax,
       CONVERT(VARCHAR(5), OpeningTime, 108) AS OpeningTime,
       CONVERT(VARCHAR(5), ClosingTime, 108) AS ClosingTime,
       BannerUrl,
       Rating,
       CrowdStatus,
       CrowdUpdatedAtUtc,
       Phone,
       WebsiteUrl,
       FacebookUrl,
       ZaloPhone,
       IsTemporarilyClosed,
       TemporaryCloseReason,
       TemporaryClosedUntilUtc,
       OperatingNote,
       IsFeatured,
       PublicationStatus,
       VerificationStatus,
       VerifiedAtUtc,
       LastVerifiedAtUtc,
       SourceType,
       CASE WHEN OwnerUserId IS NULL THEN CAST(0 AS BIT) ELSE CAST(1 AS BIT) END AS HasOwner
FROM Restaurants
WHERE Slug = @Slug
  AND PublicationStatus = N'Published'
  AND VerificationStatus = N'Verified';
      SELECT m.Id, m.Name, m.Description, m.Price, m.DiscountPrice,
             m.ImageUrl, m.IsAvailable, m.IsFeatured, m.SortOrder,
             m.MenuCategoryId, c.Name AS MenuCategoryName
      FROM MenuItems m
      JOIN Restaurants r ON r.Id = m.RestaurantId
      LEFT JOIN MenuCategories c ON c.Id = m.MenuCategoryId
      WHERE r.Slug = @Slug
      ORDER BY COALESCE(c.SortOrder, 2147483647), m.SortOrder, m.IsAvailable DESC, m.Name;

      SELECT h.DayOfWeek,
             CONVERT(VARCHAR(5), h.OpeningTime, 108) AS OpeningTime,
             CONVERT(VARCHAR(5), h.ClosingTime, 108) AS ClosingTime,
             h.IsClosed
      FROM RestaurantOpeningHours h
      JOIN Restaurants r ON r.Id = h.RestaurantId
      WHERE r.Slug = @Slug
      ORDER BY h.DayOfWeek;
    `);

  if (!result.recordsets || !result.recordsets[0] || result.recordsets[0].length === 0) {
    const err = new Error('Không tìm thấy quán ăn.');
    err.statusCode = 404;
    throw err;
  }

  const restaurant = applyEffectiveCrowdStatus(result.recordsets[0][0]);
  restaurant.HasOwner = Boolean(restaurant.HasOwner ?? restaurant.OwnerUserId);
  restaurant.menuItems = result.recordsets[1] || [];
  restaurant.openingHours = result.recordsets[2] || [];
  return restaurant;
};


// ---------- CẬP NHẬT TRẠNG THÁI ĐÔNG/VẮNG ----------
// Chỉ Owner của đúng quán hoặc Admin được cập nhật trạng thái chính thức.
const updateCrowdStatus = async ({ slug, crowdStatus, userId, role }) => {
  const pool = await getPool();
  const isAdmin = role === 'Admin';

  if (pool.__isMock) {
    const { restaurants } = getMockState();
    const restaurant = restaurants.find((item) => item.Slug === slug);
    if (!restaurant) {
      const error = new Error('Không tìm thấy quán ăn.');
      error.statusCode = 404;
      throw error;
    }
    if (!isAdmin && String(restaurant.OwnerUserId || '') !== String(userId)) {
      const error = new Error('Bạn không phải chủ quán này.');
      error.statusCode = 403;
      throw error;
    }
    const value = {
      CrowdStatus: crowdStatus,
      CrowdUpdatedAtUtc: new Date(),
      CrowdUpdatedByUserId: userId,
    };
    Object.assign(restaurant, value);
    mockCrowdStatuses.set(String(slug), value);
    return applyEffectiveCrowdStatus({ ...restaurant, ...value });
  }

  const result = await pool.request()
    .input('Slug', sql.NVarChar(220), slug)
    .input('CrowdStatus', sql.NVarChar(20), crowdStatus)
    .input('UserId', sql.UniqueIdentifier, userId)
    .input('IsAdmin', sql.Bit, isAdmin ? 1 : 0)
    .query(`
      UPDATE dbo.Restaurants
      SET CrowdStatus = @CrowdStatus,
          CrowdUpdatedAtUtc = SYSUTCDATETIME(),
          CrowdUpdatedByUserId = @UserId
      OUTPUT INSERTED.Id, INSERTED.Slug, INSERTED.CrowdStatus, INSERTED.CrowdUpdatedAtUtc
      WHERE Slug = @Slug
        AND (@IsAdmin = 1 OR OwnerUserId = @UserId);
    `);

  if (!result.recordset?.length) {
    const error = new Error('Không tìm thấy quán hoặc bạn không phải chủ quán này.');
    error.statusCode = 403;
    throw error;
  }

  return applyEffectiveCrowdStatus(result.recordset[0]);
};

module.exports = {
  getRestaurants,
  searchRestaurants,
  filterRestaurants,
  getRestaurantBySlug,
  updateCrowdStatus,
  applyEffectiveCrowdStatus,
};
