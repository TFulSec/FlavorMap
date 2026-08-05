const TTL_MS = 30 * 60 * 1000;
const MAX_ENTRIES = 100000;
const cache = new Map();

const cleanup = () => {
  const now = Date.now();
  for (const [key, expiresAt] of cache.entries()) {
    if (expiresAt <= now) cache.delete(key);
  }
};

const cleanupTimer = setInterval(cleanup, 10 * 60 * 1000);
cleanupTimer.unref?.();

const buildKey = (restaurantId, viewerHashHex) => `${restaurantId}:${viewerHashHex}`;

const ensureCapacity = () => {
  if (cache.size < MAX_ENTRIES) return;
  cleanup();
  while (cache.size >= MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    cache.delete(oldestKey);
  }
};

const claim = (restaurantId, viewerHashHex) => {
  const key = buildKey(restaurantId, viewerHashHex);
  const now = Date.now();
  const expiresAt = cache.get(key);

  if (expiresAt && expiresAt > now) {
    return { counted: false, key, expiresAt };
  }

  ensureCapacity();
  cache.set(key, now + TTL_MS);
  return { counted: true, key, expiresAt: now + TTL_MS };
};

const setExpiresAt = (key, expiresAt) => {
  ensureCapacity();
  const timestamp = expiresAt instanceof Date ? expiresAt.getTime() : Number(expiresAt);
  if (!Number.isFinite(timestamp) || timestamp <= Date.now()) {
    cache.delete(key);
    return;
  }
  cache.set(key, timestamp);
};

const release = (key) => cache.delete(key);

module.exports = {
  claim,
  release,
  setExpiresAt,
  TTL_MS,
  MAX_ENTRIES,
};
