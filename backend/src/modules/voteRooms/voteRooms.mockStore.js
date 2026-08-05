const rooms = new Map();

const createRoom = ({ code, creatorUserId, restaurantIds }) => {
  const room = {
    Id: `mock-room-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    Code: code,
    CreatedByUserId: creatorUserId,
    CreatedAtUtc: new Date(),
    Status: 'open',
    restaurants: restaurantIds.map((restaurantId) => ({
      RestaurantId: String(restaurantId),
      VoteCount: 0,
    })),
    votes: new Map(),
  };
  rooms.set(code, room);
  return room;
};

module.exports = { rooms, createRoom };
