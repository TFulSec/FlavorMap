process.env.FORCE_MOCK_DB = 'true';
process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-local-tests';

const voteRooms = require('../backend/src/modules/voteRooms/voteRooms.service');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

(async () => {
  const restaurantIds = ['toggle-restaurant-1', 'toggle-restaurant-2'];
  const userIdentifier = 'user:toggle-test-user';
  const room = await voteRooms.createRoom({
    creatorUserId: 'toggle-test-user',
    restaurantIds,
  });

  const created = await voteRooms.vote({
    code: room.code,
    restaurantId: restaurantIds[0],
    userIdentifier,
  });
  assert(created.action === 'created', 'Lần bấm đầu phải tạo bình chọn.');
  assert(created.selectedRestaurantId === restaurantIds[0], 'Phải lưu quán được chọn.');

  const removed = await voteRooms.vote({
    code: room.code,
    restaurantId: restaurantIds[0],
    userIdentifier,
  });
  assert(removed.action === 'removed', 'Bấm lại phải bỏ bình chọn.');
  assert(removed.selectedRestaurantId === null, 'Sau khi bỏ phiếu không còn lựa chọn.');

  await voteRooms.vote({
    code: room.code,
    restaurantId: restaurantIds[0],
    userIdentifier,
  });
  const changed = await voteRooms.vote({
    code: room.code,
    restaurantId: restaurantIds[1],
    userIdentifier,
  });
  assert(changed.action === 'changed', 'Chọn quán khác phải chuyển phiếu.');
  assert(changed.previousRestaurantId === restaurantIds[0], 'Phải trả về lựa chọn cũ.');
  assert(changed.selectedRestaurantId === restaurantIds[1], 'Phải trả về lựa chọn mới.');

  const currentRoom = await voteRooms.getRoomByCode(room.code, userIdentifier);
  assert(currentRoom.myVoteRestaurantId === restaurantIds[1], 'GET phòng phải trả lựa chọn hiện tại.');
  assert(currentRoom.restaurants.find((item) => item.id === restaurantIds[0]).voteCount === 0,
    'Quán cũ phải giảm một phiếu.');
  assert(currentRoom.restaurants.find((item) => item.id === restaurantIds[1]).voteCount === 1,
    'Quán mới phải tăng một phiếu.');

  console.log('✅ Vote toggle/change regression tests passed.');
})().catch((error) => {
  console.error('❌ Vote toggle/change regression tests failed:', error);
  process.exitCode = 1;
});
