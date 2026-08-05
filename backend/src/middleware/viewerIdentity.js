const crypto = require('crypto');

/**
 * Creates a privacy-preserving 32-byte viewer hash.
 * Logged-in users are deduplicated by user ID; anonymous viewers use IP + User-Agent.
 */
module.exports = (req, res, next) => {
  const source = req.user?.id
    ? `user:${req.user.id}`
    : `anonymous:${req.ip || req.socket.remoteAddress || 'unknown'}:${req.get('user-agent') || 'unknown'}`;

  const secret = process.env.VIEW_HASH_SECRET || process.env.JWT_SECRET || 'flavormap-view-secret';
  req.viewerHash = crypto.createHmac('sha256', secret).update(source).digest();
  return next();
};
