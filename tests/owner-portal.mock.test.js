process.env.FORCE_MOCK_DB = 'true';
process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-local-tests';

const owner = require('../backend/src/modules/owner/owner.service');
const { getMockState } = require('../backend/src/config/db');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

(async () => {
  const state = getMockState();
  const ownerUser = {
    Id: 'owner-portal-test-user', Email: 'owner.portal@example.com', FullName: 'Owner Portal',
    Role: 'Owner', IsBanned: false, PasswordHash: '', CreatedAt: new Date(),
  };
  if (!state.users.some((item) => item.Id === ownerUser.Id)) state.users.push(ownerUser);
  const restaurant = state.restaurants[0];
  const foreignRestaurant = state.restaurants[1];
  restaurant.OwnerUserId = ownerUser.Id;

  const updated = await owner.updateRestaurantInfo({
    userId: ownerUser.Id,
    role: 'Owner',
    restaurantId: restaurant.Id,
    data: {
      name: restaurant.Name,
      description: 'Mô tả mới từ Chủ quán',
      address: restaurant.Address,
      city: restaurant.City,
      district: restaurant.District,
      category: restaurant.Category,
      priceMin: 30000,
      priceMax: 70000,
      openingTime: '07:00',
      closingTime: '22:00',
      latitude: restaurant.Latitude,
      longitude: restaurant.Longitude,
      bannerUrl: restaurant.BannerUrl,
      phone: '0901234567',
      websiteUrl: 'https://example.com',
      facebookUrl: 'https://facebook.com/example',
      zaloPhone: '0901234567',
    },
  });
  assert(updated.Phone === '0901234567', 'Owner must update contact information.');

  let foreignUpdateBlocked = false;
  try {
    await owner.updateRestaurantInfo({
      userId: ownerUser.Id,
      role: 'Owner',
      restaurantId: foreignRestaurant.Id,
      data: {
        name: foreignRestaurant.Name, description: '', address: foreignRestaurant.Address,
        city: foreignRestaurant.City, district: foreignRestaurant.District,
        category: foreignRestaurant.Category, priceMin: 1, priceMax: 2,
        openingTime: '07:00', closingTime: '22:00', latitude: null, longitude: null,
        bannerUrl: null, phone: null, websiteUrl: null, facebookUrl: null, zaloPhone: null,
      },
    });
  } catch (error) { foreignUpdateBlocked = error.statusCode === 403; }
  assert(foreignUpdateBlocked, 'Owner must not edit another restaurant.');

  const operation = await owner.updateOperations({
    userId: ownerUser.Id,
    role: 'Owner',
    restaurantId: restaurant.Id,
    data: {
      isTemporarilyClosed: true,
      temporaryCloseReason: 'Sửa chữa',
      temporaryClosedUntilUtc: new Date(Date.now() + 3600000).toISOString(),
      operatingNote: 'Liên hệ trước khi đến',
    },
  });
  assert(operation.IsTemporarilyClosed === true, 'Temporary close state must be saved.');

  const hours = Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    isClosed: dayOfWeek === 0,
    openingTime: '07:00',
    closingTime: '22:00',
  }));
  const savedHours = await owner.updateOpeningHours({
    userId: ownerUser.Id, role: 'Owner', restaurantId: restaurant.Id, hours,
  });
  assert(savedHours.length === 7 && savedHours[0].IsClosed === true, 'Weekly opening hours must be saved.');

  const category = await owner.addMenuCategory({
    userId: ownerUser.Id, role: 'Owner', restaurantId: restaurant.Id,
    data: { name: 'Đồ uống', sortOrder: 1 },
  });
  assert(category.Name === 'Đồ uống', 'Owner must create menu category.');

  const menuItem = await owner.addMenuItem({
    userId: ownerUser.Id, role: 'Owner', restaurantId: restaurant.Id,
    data: {
      name: 'Cà phê thử nghiệm', description: 'Món kiểm thử', price: 50000,
      discountPrice: 45000, imageUrl: null, isAvailable: true,
      isFeatured: true, sortOrder: 2, menuCategoryId: category.Id,
    },
  });
  assert(menuItem.DiscountPrice === 45000 && menuItem.MenuCategoryId === category.Id, 'Enhanced menu fields must be saved.');

  const review = {
    Id: 'owner-portal-review', RestaurantId: restaurant.Id, UserId: 'mock-admin-id',
    Rating: 5, Comment: 'Rất ngon', CreatedAt: new Date(), UpdatedAt: new Date(),
  };
  if (!state.reviews.some((item) => item.Id === review.Id)) state.reviews.push(review);
  const reply = await owner.upsertReviewReply({
    userId: ownerUser.Id, role: 'Owner', reviewId: review.Id, content: 'Cảm ơn bạn đã ghé quán!',
  });
  assert(reply.Content.includes('Cảm ơn'), 'Owner must reply to owned restaurant review.');

  const reviewPage = await owner.getOwnerReviews({
    userId: ownerUser.Id, role: 'Owner', restaurantId: restaurant.Id, page: 1, limit: 10,
  });
  assert(reviewPage.data.some((item) => item.ReplyContent), 'Reply must appear in owner review list.');

  const dashboard = await owner.getDashboard({ userId: ownerUser.Id, role: 'Owner' });
  assert('TotalReviews' in dashboard.summary, 'Dashboard must include review totals.');
  assert('AvailableMenuItems' in dashboard.summary, 'Dashboard must include menu availability totals.');

  console.log('✅ Expanded Owner Portal mock tests passed.');
})().catch((error) => {
  console.error('❌ Expanded Owner Portal mock tests failed:', error);
  process.exitCode = 1;
});
