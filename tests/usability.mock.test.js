process.env.FORCE_MOCK_DB = 'true';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const adminService = require('../backend/src/modules/admin/admin.service');
const restaurantService = require('../backend/src/modules/restaurants/restaurants.service');
const { getMockState } = require('../backend/src/config/db');

const read = (relativePath) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

(async () => {
  const state = getMockState();
  const restaurant = state.restaurants.find((item) => item.PublicationStatus === 'Published' && item.VerificationStatus === 'Verified');
  const originalOwnerId = restaurant.OwnerUserId || null;
  const owner = {
    Id: `manual-owner-${crypto.randomUUID()}`,
    Email: `manual-owner-${Date.now()}@example.com`,
    FullName: 'Manual Assignment Owner',
    Role: 'Owner',
    IsBanned: false,
  };
  state.users.push(owner);

  await adminService.assignRestaurantOwner(restaurant.Id, owner.Id);
  const withOwner = await restaurantService.getRestaurantBySlug(restaurant.Slug);
  assert.equal(withOwner.HasOwner, true, 'Public detail must indicate that the restaurant already has an owner.');

  await adminService.assignRestaurantOwner(restaurant.Id, null);
  const withoutOwner = await restaurantService.getRestaurantBySlug(restaurant.Slug);
  assert.equal(withoutOwner.HasOwner, false, 'Public detail must indicate that an unassigned restaurant can be claimed.');
  await adminService.assignRestaurantOwner(restaurant.Id, originalOwnerId);

  const navbar = read('frontend/assets/js/components/navbar.js');
  assert(navbar.includes('/pages/report-missing-restaurant.html'), 'Missing restaurant report must be available in navbar.');
  assert(!navbar.includes('/pages/submit-restaurant.html'), 'Owner registration must not be placed in navbar/dropdown.');
  assert(!navbar.includes('/pages/admin-applications.html'), 'Application review must not be placed in the account dropdown.');

  const recommend = read('frontend/pages/recommend.html');
  assert(recommend.includes('flavormapVoteSelection'), 'Recommendation page must persist multiple vote candidates.');
  assert(!recommend.includes('href="/pages/vote-room.html?restaurant='), 'Recommendation buttons must not navigate immediately for each restaurant.');

  const voteRoom = read('frontend/pages/vote-room.html');
  assert(voteRoom.includes('Chọn quán bằng bình chọn nhóm'));
  assert(voteRoom.includes('vote-guide'));

  for (const page of ['submit-restaurant.html', 'report-missing-restaurant.html']) {
    const content = read(`frontend/pages/${page}`);
    assert(content.includes('leaflet@1.9.4'));
    assert(content.includes('/assets/js/map-picker.js'));
  }

  const admin = read('frontend/pages/admin.html');
  assert(admin.includes('id="rForm-owner"'), 'Admin restaurant edit form must contain owner assignment.');
  assert(admin.includes('data-target="reviews-section"'), 'Review moderation must be inside system administration.');

  console.log('✅ Frontend usability and owner assignment mock tests passed.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
