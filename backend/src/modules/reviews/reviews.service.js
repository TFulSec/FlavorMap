const crypto = require('crypto');
const { getPool, sql, getMockState } = require('../../config/db');
const httpError = require('../../utils/httpError');
const { assertReviewContentAllowed } = require('../../utils/reviewContentFilter');

const recalcRestaurantRating = async (pool, restaurantId) => {
  if (pool.__isMock) {
    const state = getMockState();
    const visible = state.reviews.filter((review) => String(review.RestaurantId) === String(restaurantId) && !review.IsHidden);
    const restaurant = state.restaurants.find((item) => String(item.Id) === String(restaurantId));
    if (restaurant) {
      restaurant.Rating = visible.length
        ? visible.reduce((sum, review) => sum + Number(review.Rating || 0), 0) / visible.length
        : 0;
    }
    return;
  }

  await pool.request()
    .input('Id', sql.UniqueIdentifier, restaurantId)
    .query(`
      UPDATE Restaurants
      SET Rating = (
        SELECT ISNULL(AVG(CAST(Rating AS FLOAT)), 0)
        FROM Reviews
        WHERE RestaurantId = @Id AND IsHidden = 0
      )
      WHERE Id = @Id;
    `);
};

const getReviews = async (slug, { page = 1, limit = 10 }) => {
  const pool = await getPool();
  const normalizedPage = Math.max(1, Number.parseInt(page, 10) || 1);
  const normalizedLimit = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 10));
  const offset = (normalizedPage - 1) * normalizedLimit;

  if (pool.__isMock) {
    const state = getMockState();
    const restaurant = state.restaurants.find((item) => item.Slug === slug
      && item.PublicationStatus === 'Published' && item.VerificationStatus === 'Verified');
    if (!restaurant) return { data: [], total: 0, page: normalizedPage, totalPages: 0 };
    const rows = state.reviews
      .filter((review) => String(review.RestaurantId) === String(restaurant.Id) && !review.IsHidden)
      .sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt))
      .map((review) => {
        const user = state.users.find((item) => String(item.Id) === String(review.UserId)) || {};
        return { ...review, FullName: user.FullName, AvatarUrl: user.AvatarUrl, UserId: review.UserId };
      });
    return {
      data: rows.slice(offset, offset + normalizedLimit),
      total: rows.length,
      page: normalizedPage,
      totalPages: Math.ceil(rows.length / normalizedLimit),
    };
  }

  const result = await pool.request()
    .input('Slug', sql.NVarChar, slug)
    .input('Limit', sql.Int, normalizedLimit)
    .input('Offset', sql.Int, offset)
    .query(`
      SELECT rv.Id, rv.Rating, rv.Comment, rv.CreatedAt,
             u.Id AS UserId, u.FullName, u.AvatarUrl,
             rr.Content AS ReplyContent,
             rr.CreatedAtUtc AS ReplyCreatedAtUtc,
             rr.UpdatedAtUtc AS ReplyUpdatedAtUtc,
             owner.FullName AS ReplyOwnerName
      FROM Reviews rv
      JOIN Restaurants r ON r.Id = rv.RestaurantId
      JOIN Users u ON u.Id = rv.UserId
      LEFT JOIN ReviewReplies rr ON rr.ReviewId = rv.Id
      LEFT JOIN Users owner ON owner.Id = rr.OwnerUserId
      WHERE r.Slug = @Slug
        AND r.PublicationStatus = N'Published'
        AND r.VerificationStatus = N'Verified'
        AND rv.IsHidden = 0
      ORDER BY rv.CreatedAt DESC
      OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;

      SELECT COUNT(*) AS Total
      FROM Reviews rv
      JOIN Restaurants r ON r.Id = rv.RestaurantId
      WHERE r.Slug = @Slug
        AND r.PublicationStatus = N'Published'
        AND r.VerificationStatus = N'Verified'
        AND rv.IsHidden = 0;
    `);

  const total = result.recordsets?.[1]?.[0]?.Total || 0;
  return {
    data: result.recordsets?.[0] || [],
    total,
    page: normalizedPage,
    totalPages: Math.ceil(total / normalizedLimit),
  };
};

const upsertReview = async (slug, userId, { rating, comment }) => {
  assertReviewContentAllowed(comment);
  const pool = await getPool();

  if (pool.__isMock) {
    const state = getMockState();
    const restaurant = state.restaurants.find((item) => item.Slug === slug
      && item.PublicationStatus === 'Published' && item.VerificationStatus === 'Verified');
    if (!restaurant) throw httpError(404, 'Không tìm thấy quán ăn.');
    const existing = state.reviews.find((review) => String(review.RestaurantId) === String(restaurant.Id)
      && String(review.UserId) === String(userId));
    if (existing) {
      existing.Rating = rating;
      existing.Comment = comment || null;
      existing.UpdatedAt = new Date();
    } else {
      state.reviews.push({
        Id: `mock-review-${crypto.randomUUID()}`,
        RestaurantId: restaurant.Id,
        UserId: userId,
        Rating: rating,
        Comment: comment || null,
        IsHidden: false,
        CreatedAt: new Date(),
        UpdatedAt: new Date(),
      });
    }
    await recalcRestaurantRating(pool, restaurant.Id);
    return;
  }

  const restaurant = await pool.request()
    .input('Slug', sql.NVarChar, slug)
    .query("SELECT Id FROM Restaurants WHERE Slug = @Slug AND PublicationStatus = N'Published' AND VerificationStatus = N'Verified'");
  if (!restaurant.recordset?.length) throw httpError(404, 'Không tìm thấy quán ăn.');
  const restaurantId = restaurant.recordset[0].Id;

  await pool.request()
    .input('RestaurantId', sql.UniqueIdentifier, restaurantId)
    .input('UserId', sql.UniqueIdentifier, userId)
    .input('Rating', sql.Int, rating)
    .input('Comment', sql.NVarChar, comment || null)
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

  if (pool.__isMock) {
    const state = getMockState();
    const restaurant = state.restaurants.find((item) => item.Slug === slug
      && item.PublicationStatus === 'Published' && item.VerificationStatus === 'Verified');
    if (!restaurant) throw httpError(404, 'Không tìm thấy quán ăn.');
    const index = state.reviews.findIndex((review) => String(review.RestaurantId) === String(restaurant.Id)
      && String(review.UserId) === String(userId));
    if (index >= 0) state.reviews.splice(index, 1);
    await recalcRestaurantRating(pool, restaurant.Id);
    return;
  }

  const restaurant = await pool.request()
    .input('Slug', sql.NVarChar, slug)
    .query("SELECT Id FROM Restaurants WHERE Slug = @Slug AND PublicationStatus = N'Published' AND VerificationStatus = N'Verified'");
  if (!restaurant.recordset?.length) throw httpError(404, 'Không tìm thấy quán ăn.');
  const restaurantId = restaurant.recordset[0].Id;

  await pool.request()
    .input('RestaurantId', sql.UniqueIdentifier, restaurantId)
    .input('UserId', sql.UniqueIdentifier, userId)
    .query('DELETE FROM Reviews WHERE RestaurantId=@RestaurantId AND UserId=@UserId');

  await recalcRestaurantRating(pool, restaurantId);
};

const reportReview = async ({ slug, reviewId, userId, reason, details }) => {
  const pool = await getPool();

  if (pool.__isMock) {
    const state = getMockState();
    const restaurant = state.restaurants.find((item) => item.Slug === slug
      && item.PublicationStatus === 'Published' && item.VerificationStatus === 'Verified');
    const review = restaurant && state.reviews.find((item) => String(item.Id) === String(reviewId)
      && String(item.RestaurantId) === String(restaurant.Id));
    if (!review || review.IsHidden) throw httpError(404, 'Không tìm thấy đánh giá để báo cáo.');
    if (String(review.UserId) === String(userId)) throw httpError(400, 'Bạn không thể báo cáo đánh giá của chính mình.');
    const duplicate = state.reviewReports.find((item) => String(item.ReviewId) === String(reviewId)
      && String(item.ReporterUserId) === String(userId) && item.Status === 'Pending');
    if (duplicate) throw httpError(409, 'Bạn đã báo cáo đánh giá này và hệ thống đang xử lý.');
    const report = {
      Id: `mock-report-${crypto.randomUUID()}`,
      ReviewId: reviewId,
      ReporterUserId: userId,
      Reason: reason,
      Details: details || null,
      Status: 'Pending',
      CreatedAtUtc: new Date(),
    };
    state.reviewReports.push(report);
    return report;
  }

  const exists = await pool.request()
    .input('Slug', sql.NVarChar(220), slug)
    .input('ReviewId', sql.UniqueIdentifier, reviewId)
    .query(`
      SELECT rv.Id, rv.UserId
      FROM dbo.Reviews rv
      JOIN dbo.Restaurants r ON r.Id = rv.RestaurantId
      WHERE rv.Id = @ReviewId
        AND r.Slug = @Slug
        AND r.PublicationStatus = N'Published'
        AND r.VerificationStatus = N'Verified'
        AND rv.IsHidden = 0;
    `);
  if (!exists.recordset?.length) throw httpError(404, 'Không tìm thấy đánh giá để báo cáo.');
  if (String(exists.recordset[0].UserId) === String(userId)) throw httpError(400, 'Bạn không thể báo cáo đánh giá của chính mình.');

  try {
    const result = await pool.request()
      .input('ReviewId', sql.UniqueIdentifier, reviewId)
      .input('ReporterUserId', sql.UniqueIdentifier, userId)
      .input('Reason', sql.NVarChar(50), reason)
      .input('Details', sql.NVarChar(500), details || null)
      .query(`
        INSERT INTO dbo.ReviewReports (ReviewId, ReporterUserId, Reason, Details)
        OUTPUT INSERTED.*
        VALUES (@ReviewId, @ReporterUserId, @Reason, @Details);
      `);
    return result.recordset[0];
  } catch (error) {
    if ([2601, 2627].includes(error.number)) throw httpError(409, 'Bạn đã báo cáo đánh giá này và hệ thống đang xử lý.');
    throw error;
  }
};

module.exports = {
  getReviews,
  upsertReview,
  deleteReview,
  reportReview,
  recalcRestaurantRating,
};
