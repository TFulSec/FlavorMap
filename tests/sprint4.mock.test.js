process.env.FORCE_MOCK_DB = 'true';
process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-local-tests';

const crypto = require('crypto');
const voteRooms = require('../backend/src/modules/voteRooms/voteRooms.service');
const restaurants = require('../backend/src/modules/restaurants/restaurants.service');
const views = require('../backend/src/modules/restaurantViews/restaurantViews.service');
const owner = require('../backend/src/modules/owner/owner.service');
const admin = require('../backend/src/modules/admin/admin.service');
const { getMockState } = require('../backend/src/config/db');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

(async () => {
  const state = getMockState();
  const ownerUser = {
    Id: 'mock-owner-id', Email: 'owner@example.com', FullName: 'Mock Owner',
    Role: 'Owner', IsBanned: false, PasswordHash: '', CreatedAt: new Date(),
  };
  if (!state.users.find((item) => item.Id === ownerUser.Id)) state.users.push(ownerUser);
  state.restaurants[0].OwnerUserId = ownerUser.Id;

  const restaurantIds = ['1', '2'];
  const room = await voteRooms.createRoom({ creatorUserId: 'mock-admin-id', restaurantIds });
  const initialRoom = await voteRooms.getRoomByCode(room.code);
  assert(initialRoom.restaurants.every((item) => item.voteCount === 0), 'Initial vote counts must be zero.');

  const voter = 'user:mock-admin-id';
  const firstVote = await voteRooms.vote({
    code: room.code, restaurantId: restaurantIds[0], userIdentifier: voter,
  });
  assert(firstVote.action === 'created' && firstVote.voteCount === 1,
    'First click must create one vote atomically.');

  const removedVote = await voteRooms.vote({
    code: room.code, restaurantId: restaurantIds[0], userIdentifier: voter,
  });
  assert(removedVote.action === 'removed' && removedVote.voteCount === 0,
    'Second click on the selected restaurant must remove the vote.');

  await voteRooms.vote({
    code: room.code, restaurantId: restaurantIds[0], userIdentifier: voter,
  });
  const changedVote = await voteRooms.vote({
    code: room.code, restaurantId: restaurantIds[1], userIdentifier: voter,
  });
  assert(changedVote.action === 'changed' && changedVote.selectedRestaurantId === restaurantIds[1],
    'Clicking another restaurant must move the existing vote.');

  const roomAfterChange = await voteRooms.getRoomByCode(room.code, voter);
  const firstOption = roomAfterChange.restaurants.find((item) => item.id === restaurantIds[0]);
  const secondOption = roomAfterChange.restaurants.find((item) => item.id === restaurantIds[1]);
  assert(firstOption.voteCount === 0 && secondOption.voteCount === 1,
    'Changing a vote must decrement the old option and increment the new option.');
  assert(roomAfterChange.myVoteRestaurantId === restaurantIds[1],
    'Room response must identify the current user selection.');

  const restaurant = await restaurants.getRestaurantBySlug('pho-gia-truyen-bat-dan');
  assert(restaurant.CrowdStatus === 'moderate', 'Stale or missing crowd status must reset to moderate.');

  const crowdUpdate = await restaurants.updateCrowdStatus({
    slug: restaurant.Slug,
    crowdStatus: 'crowded',
    userId: ownerUser.Id,
    role: 'Owner',
  });
  assert(crowdUpdate.CrowdStatus === 'crowded', 'Owner must update crowd status of owned restaurant.');

  let unauthorizedCrowdBlocked = false;
  try {
    await restaurants.updateCrowdStatus({
      slug: state.restaurants[1].Slug,
      crowdStatus: 'quiet',
      userId: ownerUser.Id,
      role: 'Owner',
    });
  } catch (error) { unauthorizedCrowdBlocked = error.statusCode === 403; }
  assert(unauthorizedCrowdBlocked, 'Owner must not update another restaurant.');

  const addedMenu = await owner.addMenuItem({
    userId: ownerUser.Id,
    role: 'Owner',
    restaurantId: state.restaurants[0].Id,
    data: { name: 'Món test', description: '', price: 25000, imageUrl: null, isAvailable: true },
  });
  assert(addedMenu.Name === 'Món test', 'Owner must add menu item to owned restaurant.');

  let foreignMenuBlocked = false;
  try {
    await owner.addMenuItem({
      userId: ownerUser.Id,
      role: 'Owner',
      restaurantId: state.restaurants[1].Id,
      data: { name: 'Sai quyền', description: '', price: 1, imageUrl: null, isAvailable: true },
    });
  } catch (error) { foreignMenuBlocked = error.statusCode === 403; }
  assert(foreignMenuBlocked, 'Owner must not edit another restaurant menu.');

  const viewerHash = crypto.createHash('sha256').update('sprint4-test-viewer').digest();
  const firstView = await views.recordRestaurantView({ restaurantId: restaurant.Id, viewerHash });
  const duplicateView = await views.recordRestaurantView({ restaurantId: restaurant.Id, viewerHash });
  assert(firstView === true && duplicateView === false, 'View deduplication must block repeats for 30 minutes.');

  await views.rollupViews(new Date(Date.now() + 1000));
  const year = new Date().getUTCFullYear();
  const report = await owner.getReportRows({
    userId: ownerUser.Id,
    role: 'Owner',
    from: `${year}-01-01`,
    to: `${year}-12-31`,
  });
  assert(report.rows.some((row) => String(row.RestaurantId) === String(restaurant.Id)), 'Owner report must include owned restaurant.');
  assert(!report.rows.some((row) => String(row.RestaurantId) === String(state.restaurants[1].Id)), 'Owner report must exclude foreign restaurants.');
  assert(owner.buildCsv(report.rows).startsWith('\uFEFF'), 'CSV must contain a UTF-8 BOM.');
  const workbook = await owner.buildXlsx(report.rows);
  assert(workbook.byteLength > 100, 'XLSX report must be generated.');

  await admin.assignRestaurantOwner(state.restaurants[1].Id, ownerUser.Id);
  assert(state.restaurants[1].OwnerUserId === ownerUser.Id, 'Admin must be able to assign owner.');

  console.log('✅ Sprint 4 + Owner permission mock tests passed.');
})().catch((error) => {
  console.error('❌ Sprint 4 mock tests failed:', error);
  process.exitCode = 1;
});
