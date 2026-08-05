const service = require('./bookmarks.service');

exports.getBookmarks = async (req, res, next) => {
  try {
    const data = await service.getBookmarks(req.user.id, req.query);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getBookmarkIds = async (req, res, next) => {
  try {
    const data = await service.getBookmarkIds(req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.addBookmark = async (req, res, next) => {
  try {
    await service.addBookmark(req.params.slug, req.user.id);
    res.json({ success: true, message: 'Đã lưu quán ăn yêu thích' });
  } catch (err) { next(err); }
};

exports.removeBookmark = async (req, res, next) => {
  try {
    await service.removeBookmark(req.params.slug, req.user.id);
    res.json({ success: true, message: 'Đã bỏ lưu quán ăn' });
  } catch (err) { next(err); }
};
