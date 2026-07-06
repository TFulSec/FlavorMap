const { getPool, sql } = require('../../config/db');

// Tính lại điểm Rating trung bình của 1 quán sau mỗi thay đổi review
const recalcRestaurantRating = async (pool, restaurantId) => {
  await pool.request()
    .input('Id', sql.UniqueIdentifier, restaurantId)
    .query(`
      UPDATE Restaurants
      SET Rating = (
        SELECT ISNULL(AVG(CAST(Rating AS FLOAT)), 0)
        FROM Reviews WHERE RestaurantId = @Id
      )
      WHERE Id = @Id
    `);
};

const getReviews = async (slug, { page = 1, limit = 10 }) => {
  const pool   = await getPool();
  const offset = (page - 1) * limit;

  const result = await pool.request()
    .input('Slug',   sql.NVarChar, slug)
    .input('Limit',  sql.Int, parseInt(limit))
    .input('Offset', sql.Int, offset)
    .query(`
      SELECT rv.Id, rv.Rating, rv.Comment, rv.CreatedAt,
             u.Id AS UserId, u.FullName, u.AvatarUrl
      FROM Reviews rv
      JOIN Restaurants r ON r.Id = rv.RestaurantId
      JOIN Users u ON u.Id = rv.UserId
      WHERE r.Slug = @Slug
      ORDER BY rv.CreatedAt DESC
      OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;

      SELECT COUNT(*) AS Total FROM Reviews rv
      JOIN Restaurants r ON r.Id = rv.RestaurantId
      WHERE r.Slug = @Slug;
    `);

  return {
    data: result.recordsets && result.recordsets.length > 0 ? result.recordsets[0] : [],
    total: result.recordsets && result.recordsets.length > 1 && result.recordsets[1][0] ? result.recordsets[1][0].Total : 0,
    page: parseInt(page),
    totalPages: result.recordsets && result.recordsets.length > 1 && result.recordsets[1][0] ? Math.ceil(result.recordsets[1][0].Total / limit) : 0,
  };
};

const upsertReview = async (slug, userId, { rating, comment }) => {
  const pool = await getPool();

  const restaurant = await pool.request()
    .input('Slug', sql.NVarChar, slug)
    .query('SELECT Id FROM Restaurants WHERE Slug = @Slug');
  if (!restaurant.recordset || restaurant.recordset.length === 0) {
    const err = new Error('Không tìm thấy quán ăn.');
    err.statusCode = 404;
    throw err;
  }
  const restaurantId = restaurant.recordset[0].Id;

  await pool.request()
    .input('RestaurantId', sql.UniqueIdentifier, restaurantId)
    .input('UserId',       sql.UniqueIdentifier, userId)
    .input('Rating',       sql.Int, rating)
    .input('Comment',      sql.NVarChar, comment || null)
    .query(`
      MERGE Reviews AS target
      USING (SELECT @RestaurantId AS RestaurantId, @UserId AS UserId) AS src
      ON target.RestaurantId = src.RestaurantId AND target.UserId = src.UserId
      WHEN MATCHED THEN
        UPDATE SET Rating = @Rating, Comment = @Comment, UpdatedAt = GETDATE()
      WHEN NOT MATCHED THEN
        INSERT (RestaurantId, UserId, Rating, Comment)
        VALUES (@RestaurantId, @UserId, @Rating, @Comment);
    `);

  await recalcRestaurantRating(pool, restaurantId);
};

const deleteReview = async (slug, userId) => {
  const pool = await getPool();
  const restaurant = await pool.request()
    .input('Slug', sql.NVarChar, slug)
    .query('SELECT Id FROM Restaurants WHERE Slug = @Slug');
  if (!restaurant.recordset || restaurant.recordset.length === 0) {
    const err = new Error('Không tìm thấy quán ăn.');
    err.statusCode = 404;
    throw err;
  }
  const restaurantId = restaurant.recordset[0].Id;

  await pool.request()
    .input('RestaurantId', sql.UniqueIdentifier, restaurantId)
    .input('UserId',       sql.UniqueIdentifier, userId)
    .query('DELETE FROM Reviews WHERE RestaurantId=@RestaurantId AND UserId=@UserId');

  await recalcRestaurantRating(pool, restaurantId);
};

module.exports = { getReviews, upsertReview, deleteReview };
