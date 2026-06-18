const { getPool, sql } = require('../../config/db');
const fallback = require('../../config/fallbackData');

function formatTime(value) {
  if (!value) return null;

  // SQL TIME thường được mssql trả về dạng Date UTC
  if (value instanceof Date) {
    return `${String(value.getUTCHours()).padStart(2, '0')}:${String(
      value.getUTCMinutes()
    ).padStart(2, '0')}`;
  }

  // Nếu đã là chuỗi HH:mm:ss
  const str = value.toString();

  if (str.includes(':')) {
    return str.substring(0, 5);
  }

  return str;
}

const haversineSQL = `
  6371 * 2 * ASIN(SQRT(
    POWER(SIN((RADIANS(@Lat) - RADIANS(Latitude)) / 2), 2) +
    COS(RADIANS(@Lat)) * COS(RADIANS(Latitude)) *
    POWER(SIN((RADIANS(@Lng) - RADIANS(Longitude)) / 2), 2)
  ))
`;

const getPoolSafe = async () => {
  try {
    return await getPool();
  } catch (err) {
    console.warn('⚠️ SQL Server unavailable, using fallback data.', err.message);
    return null;
  }
};

const getRestaurants = async ({ type, limit = 12, page = 1 }) => {
  const pool = await getPoolSafe();

  if (!pool) {
    return fallback.getRestaurants({ type, limit, page });
  }

  limit = parseInt(limit, 10);
  page = parseInt(page, 10);

  const offset = (page - 1) * limit;

  let whereClause = '';

  if (type === 'featured') whereClause = 'WHERE IsFeatured = 1';
  if (type === 'newest') whereClause = 'WHERE IsNew = 1';

  const result = await pool.request()
    .input('Limit', sql.Int, limit)
    .input('Offset', sql.Int, offset)
    .query(`
      SELECT Id, Name, Slug, Address, Category,
             PriceMin, PriceMax, BannerUrl, Rating,
             IsFeatured, IsNew, OpeningTime, ClosingTime
      FROM Restaurants
      ${whereClause}
      ORDER BY CreatedAt DESC
      OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;

      SELECT COUNT(*) AS Total
      FROM Restaurants
      ${whereClause};
    `);

  const restaurants = result.recordsets[0].map(r => ({
    ...r,
    OpeningTime: formatTime(r.OpeningTime),
    ClosingTime: formatTime(r.ClosingTime),
  }));

  const total = result.recordsets[1][0]?.Total || 0;

  return {
    data: restaurants,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

const searchRestaurants = async ({ q, page = 1, limit = 12 }) => {
  if (!q || q.trim() === '') {
    return fallback.getRestaurants({ page, limit });
  }

  const pool = await getPoolSafe();

  if (!pool) {
    return fallback.searchRestaurants({ q, page, limit });
  }

  limit = parseInt(limit, 10);
  page = parseInt(page, 10);

  const offset = (page - 1) * limit;
  const keyword = `%${q}%`;

  const result = await pool.request()
    .input('Keyword', sql.NVarChar, keyword)
    .input('Limit', sql.Int, limit)
    .input('Offset', sql.Int, offset)
    .query(`
      SELECT DISTINCT
             r.Id,
             r.Name,
             r.Slug,
             r.Address,
             r.Category,
             r.PriceMin,
             r.PriceMax,
             r.BannerUrl,
             r.Rating,
             r.IsNew,
             r.IsFeatured,
             r.OpeningTime,
             r.ClosingTime
      FROM Restaurants r
      LEFT JOIN MenuItems m
             ON m.RestaurantId = r.Id
      WHERE r.Name COLLATE Vietnamese_CI_AI LIKE @Keyword
   OR r.Description COLLATE Vietnamese_CI_AI LIKE @Keyword
   OR r.Address COLLATE Vietnamese_CI_AI LIKE @Keyword
   OR m.Name COLLATE Vietnamese_CI_AI LIKE @Keyword
      ORDER BY r.Rating DESC
      OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;

      SELECT COUNT(DISTINCT r.Id) AS Total
      FROM Restaurants r
      LEFT JOIN MenuItems m
             ON m.RestaurantId = r.Id
WHERE r.Name COLLATE Vietnamese_CI_AI LIKE @Keyword
   OR r.Description COLLATE Vietnamese_CI_AI LIKE @Keyword
   OR r.Address COLLATE Vietnamese_CI_AI LIKE @Keyword
   OR m.Name COLLATE Vietnamese_CI_AI LIKE @Keyword
    `);

  const restaurants = result.recordsets[0].map(r => ({
    ...r,
    OpeningTime: formatTime(r.OpeningTime),
    ClosingTime: formatTime(r.ClosingTime),
  }));

  const total = result.recordsets[1][0]?.Total || 0;

  return {
    data: restaurants,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

const filterRestaurants = async ({
  category,
  priceMin,
  priceMax,
  lat,
  lng,
  radius,
  page = 1,
  limit = 12,
  q,
}) => {
  const pool = await getPoolSafe();

  if (!pool) {
    return fallback.filterRestaurants({
      category,
      priceMin,
      priceMax,
      lat,
      lng,
      radius,
      page,
      limit,
      q,
    });
  }

  limit = parseInt(limit, 10);
  page = parseInt(page, 10);

  const offset = (page - 1) * limit;

  const conditions = [];

  const request = pool.request()
    .input('Limit', sql.Int, limit)
    .input('Offset', sql.Int, offset);

  if (category) {
    conditions.push('r.Category = @Category');
    request.input('Category', sql.NVarChar, category);
  }

  if (priceMin !== undefined && priceMin !== '') {
    conditions.push('r.PriceMax >= @PriceMin');
    request.input('PriceMin', sql.Int, parseInt(priceMin, 10));
  }

  if (priceMax !== undefined && priceMax !== '') {
    conditions.push('r.PriceMin <= @PriceMax');
    request.input('PriceMax', sql.Int, parseInt(priceMax, 10));
  }

  if (lat && lng && radius) {
    conditions.push(`${haversineSQL} <= @Radius`);

    request.input('Lat', sql.Float, parseFloat(lat));
    request.input('Lng', sql.Float, parseFloat(lng));
    request.input('Radius', sql.Float, parseFloat(radius));
  }

  if (q) {
    const keyword = `%${q}%`;

    conditions.push(`(
      r.Name LIKE @Keyword OR
      r.Description LIKE @Keyword OR
      r.Address LIKE @Keyword OR
      m.Name LIKE @Keyword
    )`);

    request.input('Keyword', sql.NVarChar, keyword);
  }

  const whereSQL =
    conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

  const distanceCol =
    lat && lng
      ? `, ${haversineSQL} AS DistanceKm`
      : '';

  const result = await request.query(`
    SELECT DISTINCT
           r.Id,
           r.Name,
           r.Slug,
           r.Address,
           r.Category,
           r.PriceMin,
           r.PriceMax,
           r.BannerUrl,
           r.Rating,
           r.OpeningTime,
           r.ClosingTime
           ${distanceCol}
    FROM Restaurants r
    LEFT JOIN MenuItems m
           ON m.RestaurantId = r.Id
    ${whereSQL}
    ORDER BY r.Rating DESC
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;

    SELECT COUNT(DISTINCT r.Id) AS Total
    FROM Restaurants r
    LEFT JOIN MenuItems m
           ON m.RestaurantId = r.Id
    ${whereSQL};
  `);

  const restaurants = result.recordsets[0].map(r => ({
    ...r,
    OpeningTime: formatTime(r.OpeningTime),
    ClosingTime: formatTime(r.ClosingTime),
  }));

  const total = result.recordsets[1][0]?.Total || 0;

  return {
    data: restaurants,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

const getRestaurantBySlug = async (slug) => {
  const pool = await getPoolSafe();

  if (!pool) {
    const restaurant = fallback.getRestaurantBySlug(slug);

    if (!restaurant) {
      const err = new Error('Không tìm thấy quán ăn.');
      err.statusCode = 404;
      throw err;
    }

    return restaurant;
  }

  const result = await pool.request()
    .input('Slug', sql.NVarChar, slug)
    .query(`
      SELECT Id,
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
             OpeningTime,
             ClosingTime,
             BannerUrl,
             Rating,
             IsFeatured
      FROM Restaurants
      WHERE Slug = @Slug;

      SELECT m.Id,
             m.Name,
             m.Description,
             m.Price,
             m.ImageUrl,
             m.IsAvailable
      FROM MenuItems m
      JOIN Restaurants r
           ON r.Id = m.RestaurantId
      WHERE r.Slug = @Slug
      ORDER BY m.IsAvailable DESC, m.Name;
    `);

  if (result.recordsets[0].length === 0) {
    const err = new Error('Không tìm thấy quán ăn.');
    err.statusCode = 404;
    throw err;
  }

  const restaurant = result.recordsets[0][0];

  restaurant.OpeningTime = formatTime(restaurant.OpeningTime);
  restaurant.ClosingTime = formatTime(restaurant.ClosingTime);

  restaurant.menuItems = result.recordsets[1];

  return restaurant;
};

module.exports = {
  getRestaurants,
  searchRestaurants,
  filterRestaurants,
  getRestaurantBySlug,
};