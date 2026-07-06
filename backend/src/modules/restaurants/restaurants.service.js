const { getPool, sql } = require('../../config/db');

// Hàm tính khoảng cách Haversine (SQL)
const haversineSQL = `
  6371 * 2 * ASIN(SQRT(
    POWER(SIN((RADIANS(@Lat) - RADIANS(Latitude)) / 2), 2) +
    COS(RADIANS(@Lat)) * COS(RADIANS(Latitude)) *
    POWER(SIN((RADIANS(@Lng) - RADIANS(Longitude)) / 2), 2)
  ))
`;

// ---------- TRANG CHỦ: Lấy danh sách quán ăn ----------
const getRestaurants = async ({ type, limit = 12, page = 1, city }) => {
  const pool = await getPool();
  const offset = (page - 1) * limit;

  let conditions = [];

  if (type === 'featured') conditions.push('IsFeatured = 1');
  if (type === 'newest') conditions.push('IsNew = 1');
  if (city) conditions.push('City = @City');

  const whereClause =
    conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

  const request = pool.request()
    .input('Limit', sql.Int, parseInt(limit))
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
      IsFeatured,
      IsNew,
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
    data: result.recordsets?.[0] || [],
    total: result.recordsets?.[1]?.[0]?.Total || 0,
    page: parseInt(page),
    totalPages: Math.ceil(
      (result.recordsets?.[1]?.[0]?.Total || 0) / limit
    ),
  };
};
// ---------- TÌM KIẾM ----------
const searchRestaurants = async ({ q, page = 1, limit = 12 }) => {
  const pool   = await getPool();
  const offset = (page - 1) * limit;
  const keyword = `%${q}%`;

  const result = await pool.request()
    .input('Keyword', sql.NVarChar, keyword)
    .input('Limit',   sql.Int, parseInt(limit))
    .input('Offset',  sql.Int, offset)
    .query(`
      SELECT DISTINCT r.Id, r.Name, r.Slug, r.Address, r.Category,
             r.PriceMin, r.PriceMax, r.BannerUrl, r.Rating, r.IsNew, r.IsFeatured
      FROM Restaurants r
      LEFT JOIN MenuItems m ON m.RestaurantId = r.Id
      WHERE r.Name        LIKE @Keyword
         OR r.Description LIKE @Keyword
         OR r.Address     LIKE @Keyword
         OR m.Name        LIKE @Keyword
      ORDER BY r.Rating DESC
      OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;

      SELECT COUNT(DISTINCT r.Id) AS Total
      FROM Restaurants r
      LEFT JOIN MenuItems m ON m.RestaurantId = r.Id
      WHERE r.Name        LIKE @Keyword
         OR r.Description LIKE @Keyword
         OR r.Address     LIKE @Keyword
         OR m.Name        LIKE @Keyword;
    `);

  return {
    data: result.recordsets && result.recordsets[0] ? result.recordsets[0] : [],
    total: result.recordsets && result.recordsets[1] && result.recordsets[1][0] ? result.recordsets[1][0].Total : 0,
    page: parseInt(page),
    totalPages: result.recordsets && result.recordsets[1] && result.recordsets[1][0] ? Math.ceil(result.recordsets[1][0].Total / limit) : 0,
  };
};

// ---------- BỘ LỌC ----------
const filterRestaurants = async ({
  category, priceMin, priceMax,
  lat, lng, radius, city, q,
  page = 1, limit = 12,
}) => {
  const pool   = await getPool();
  const offset = (page - 1) * limit;
  const conditions = [];
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
      request.input('Q', sql.NVarChar, `%${q}%`);
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
           r.PriceMin, r.PriceMax, r.BannerUrl, r.Rating${distanceCol}
    FROM Restaurants r
    ${whereSQL}
    ORDER BY r.Rating DESC
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;

    SELECT COUNT(*) AS Total FROM Restaurants r ${whereSQL};
  `);

  return {
    data: result.recordsets && result.recordsets[0] ? result.recordsets[0] : [],
    total: result.recordsets && result.recordsets[1] && result.recordsets[1][0] ? result.recordsets[1][0].Total : 0,
    page: parseInt(page),
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
       IsFeatured
FROM Restaurants
WHERE Slug = @Slug;
      SELECT m.Id, m.Name, m.Description, m.Price, m.ImageUrl, m.IsAvailable
      FROM MenuItems m
      JOIN Restaurants r ON r.Id = m.RestaurantId
      WHERE r.Slug = @Slug
      ORDER BY m.IsAvailable DESC, m.Name;
    `);

  if (!result.recordsets || !result.recordsets[0] || result.recordsets[0].length === 0) {
    const err = new Error('Không tìm thấy quán ăn.');
    err.statusCode = 404;
    throw err;
  }

  const restaurant   = result.recordsets[0][0];
  restaurant.menuItems = result.recordsets[1] || [];
  return restaurant;
};

module.exports = {
  getRestaurants,
  searchRestaurants,
  filterRestaurants,
  getRestaurantBySlug,
};
