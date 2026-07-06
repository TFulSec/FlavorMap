const { getPool, sql } = require('../../config/db');

const getBookmarks = async (userId, { page = 1, limit = 12 }) => {
  const pool   = await getPool();
  const offset = (page - 1) * limit;

  const result = await pool.request()
    .input('UserId', sql.UniqueIdentifier, userId)
    .input('Limit',  sql.Int, parseInt(limit))
    .input('Offset', sql.Int, offset)
    .query(`
      SELECT r.Id, r.Name, r.Slug, r.Address, r.Category,
             r.PriceMin, r.PriceMax, r.BannerUrl, r.Rating,
             r.OpeningTime, r.ClosingTime, b.CreatedAt AS BookmarkedAt
      FROM Bookmarks b
      JOIN Restaurants r ON r.Id = b.RestaurantId
      WHERE b.UserId = @UserId
      ORDER BY b.CreatedAt DESC
      OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;

      SELECT COUNT(*) AS Total FROM Bookmarks WHERE UserId = @UserId;
    `);

  return {
    data: result.recordsets && result.recordsets.length > 0 ? result.recordsets[0] : [],
    total: result.recordsets && result.recordsets.length > 1 && result.recordsets[1][0] ? result.recordsets[1][0].Total : 0,
    page: parseInt(page),
    totalPages: result.recordsets && result.recordsets.length > 1 && result.recordsets[1][0] ? Math.ceil(result.recordsets[1][0].Total / limit) : 0,
  };
};

const getBookmarkIds = async (userId) => {
  const pool = await getPool();
  const result = await pool.request()
    .input('UserId', sql.UniqueIdentifier, userId)
    .query('SELECT RestaurantId FROM Bookmarks WHERE UserId = @UserId');
  return (result.recordset || []).map(r => r.RestaurantId);
};

const addBookmark = async (slug, userId) => {
  const pool = await getPool();
  const restaurant = await pool.request()
    .input('Slug', sql.NVarChar, slug)
    .query('SELECT Id FROM Restaurants WHERE Slug = @Slug');
  if (!restaurant.recordset || restaurant.recordset.length === 0) {
    const err = new Error('Không tìm thấy quán ăn.');
    err.statusCode = 404;
    throw err;
  }
  try {
    await pool.request()
      .input('UserId',       sql.UniqueIdentifier, userId)
      .input('RestaurantId', sql.UniqueIdentifier, restaurant.recordset[0].Id)
      .query('INSERT INTO Bookmarks (UserId, RestaurantId) VALUES (@UserId, @RestaurantId)');
  } catch (err) {
    if (err.number === 2627) return; // đã bookmark trước đó -> bỏ qua, coi như thành công
    throw err;
  }
};

const removeBookmark = async (slug, userId) => {
  const pool = await getPool();
  await pool.request()
    .input('Slug',   sql.NVarChar, slug)
    .input('UserId', sql.UniqueIdentifier, userId)
    .query(`
      DELETE b FROM Bookmarks b
      JOIN Restaurants r ON r.Id = b.RestaurantId
      WHERE r.Slug = @Slug AND b.UserId = @UserId
    `);
};

module.exports = { getBookmarks, getBookmarkIds, addBookmark, removeBookmark };
