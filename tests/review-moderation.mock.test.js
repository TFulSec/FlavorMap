process.env.FORCE_MOCK_DB = 'true';

const assert = require('assert');
const crypto = require('crypto');
const reviewService = require('../backend/src/modules/reviews/reviews.service');
const adminService = require('../backend/src/modules/admin/admin.service');
const { getMockState } = require('../backend/src/config/db');

(async () => {
  const state = getMockState();
  const restaurant = state.restaurants.find((item) => item.PublicationStatus === 'Published' && item.VerificationStatus === 'Verified');
  assert(restaurant, 'A public restaurant is required for the review test.');

  const author = {
    Id: `review-author-${crypto.randomUUID()}`,
    Email: `author-${Date.now()}@example.com`,
    FullName: 'Review Author', Role: 'User', IsBanned: false,
  };
  const reporter = {
    Id: `review-reporter-${crypto.randomUUID()}`,
    Email: `reporter-${Date.now()}@example.com`,
    FullName: 'Review Reporter', Role: 'User', IsBanned: false,
  };
  state.users.push(author, reporter);

  let blocked = false;
  try {
    await reviewService.upsertReview(restaurant.Slug, author.Id, {
      rating: 1,
      comment: 'Quán này địt mẹ phục vụ quá tệ',
    });
  } catch (error) {
    blocked = error.statusCode === 400 && error.code === 'REVIEW_CONTENT_REJECTED';
  }
  assert(blocked, 'Forbidden review content must be rejected before persistence.');

  await reviewService.upsertReview(restaurant.Slug, author.Id, {
    rating: 2,
    comment: 'Quán đủ lớn cho các nhóm, nhưng tôi không hài lòng vì chờ món lâu.',
  });
  const publicBefore = await reviewService.getReviews(restaurant.Slug, { page: 1, limit: 10 });
  const review = publicBefore.data.find((item) => String(item.UserId) === String(author.Id));
  assert(review, 'A critical but civil review must remain public.');

  const report = await reviewService.reportReview({
    slug: restaurant.Slug,
    reviewId: review.Id,
    userId: reporter.Id,
    reason: 'FalseInformation',
    details: 'Đề nghị quản trị viên kiểm tra nội dung.',
  });
  assert.equal(report.Status, 'Pending');

  let duplicateBlocked = false;
  try {
    await reviewService.reportReview({
      slug: restaurant.Slug,
      reviewId: review.Id,
      userId: reporter.Id,
      reason: 'Other',
      details: 'Báo cáo lần hai.',
    });
  } catch (error) { duplicateBlocked = error.statusCode === 409; }
  assert(duplicateBlocked, 'A duplicate pending report must be rejected.');

  const reported = await adminService.getReviewsForModeration({ status: 'Reported' });
  assert(reported.some((item) => item.Id === review.Id && item.PendingReportCount === 1));

  await adminService.moderateReview({
    id: review.Id,
    action: 'Hide',
    reason: 'Nội dung được xác minh là thông tin giả mạo.',
    reviewerId: 'mock-admin-id',
  });
  const publicAfterHide = await reviewService.getReviews(restaurant.Slug, { page: 1, limit: 10 });
  assert(!publicAfterHide.data.some((item) => item.Id === review.Id), 'Hidden reviews must not be public.');

  await adminService.moderateReview({
    id: review.Id,
    action: 'Restore',
    reason: 'Đã kiểm tra lại và khôi phục.',
    reviewerId: 'mock-admin-id',
  });
  const publicAfterRestore = await reviewService.getReviews(restaurant.Slug, { page: 1, limit: 10 });
  assert(publicAfterRestore.data.some((item) => item.Id === review.Id), 'Restored reviews must become public again.');

  console.log('✅ Review content filtering, reporting and moderation mock tests passed.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
