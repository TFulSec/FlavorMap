const { getPool, sql } = require('../../config/db');
const viewCache = require('./viewDedupeCache');

const mockViews = [];
const mockDedup = new Map();
const mockDailyStats = new Map();

const recordRestaurantView = async ({ restaurantId, viewerHash }) => {
  const viewerHashHex = viewerHash.toString('hex');
  const cacheClaim = viewCache.claim(restaurantId, viewerHashHex);
  if (!cacheClaim.counted) return false;

  try {
    const pool = await getPool();

    if (pool.__isMock) {
      const key = `${restaurantId}:${viewerHashHex}`;
      const now = new Date();
      const lastSeen = mockDedup.get(key);
      if (lastSeen && now.getTime() - lastSeen.getTime() < viewCache.TTL_MS) return false;

      mockDedup.set(key, now);
      mockViews.push({ restaurantId, viewedAtUtc: now });
      return true;
    }

    const result = await pool.request()
      .input('RestaurantId', sql.UniqueIdentifier, restaurantId)
      .input('ViewerHash', sql.VarBinary(32), viewerHash)
      .execute('dbo.usp_RecordRestaurantView');

    const row = result.recordset?.[0] || {};
    if (!row.Counted && row.NextAllowedAtUtc) {
      viewCache.setExpiresAt(cacheClaim.key, new Date(row.NextAllowedAtUtc));
    }
    return Boolean(row.Counted);
  } catch (error) {
    // A failed DB write should not poison the fast cache for the next 30 minutes.
    viewCache.release(cacheClaim.key);
    throw error;
  }
};

const rollupViews = async (cutoffUtc = new Date(Date.now() - 5 * 60 * 1000)) => {
  const pool = await getPool();

  if (pool.__isMock) {
    const remaining = [];
    for (const view of mockViews) {
      if (view.viewedAtUtc < cutoffUtc) {
        const date = view.viewedAtUtc.toISOString().slice(0, 10);
        const key = `${view.restaurantId}:${date}`;
        mockDailyStats.set(key, (mockDailyStats.get(key) || 0) + 1);
      } else {
        remaining.push(view);
      }
    }
    mockViews.length = 0;
    mockViews.push(...remaining);
    return;
  }

  await pool.request()
    .input('BeforeUtc', sql.DateTime2(3), cutoffUtc)
    .execute('dbo.usp_RollupRestaurantViews');
};

let rollupRunning = false;
const runRollupSafely = async () => {
  if (rollupRunning) return;
  rollupRunning = true;
  try {
    await rollupViews();
  } catch (error) {
    console.error('❌ Sprint 4 view roll-up failed:', error.message);
  } finally {
    rollupRunning = false;
  }
};

const startViewRollupJob = () => {
  const initialTimer = setTimeout(runRollupSafely, 10 * 1000);
  initialTimer.unref?.();

  const interval = setInterval(runRollupSafely, 60 * 60 * 1000);
  interval.unref?.();
};

const getMockDailyStats = () => mockDailyStats;

module.exports = {
  recordRestaurantView,
  rollupViews,
  startViewRollupJob,
  getMockDailyStats,
};
