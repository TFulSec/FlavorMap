const bookmarkManager = {
  _ids: new Set(),
  _loaded: false,

  async ensureLoaded() {
    if (this._loaded || !auth.isLoggedIn()) return;
    try {
      const res = await api.get('/bookmarks/ids');
      this._ids = new Set(res.data);
      this._loaded = true;
    } catch (e) { /* im lặng nếu lỗi, không chặn UI chính */ }
  },

  isBookmarked(restaurantId) { return this._ids.has(restaurantId); },

  async toggle(slug, restaurantId, btnEl) {
    if (!auth.isLoggedIn()) {
      window.location.href = '/pages/login.html';
      return;
    }
    const isBm = this.isBookmarked(restaurantId);
    try {
      if (isBm) {
        await api.delete(`/restaurants/${slug}/bookmark`);
        this._ids.delete(restaurantId);
      } else {
        await api.post(`/restaurants/${slug}/bookmark`);
        this._ids.add(restaurantId);
      }
      btnEl.classList.toggle('bookmark-btn--active', !isBm);
      toast.success(isBm ? 'Đã bỏ lưu quán ăn.' : 'Đã lưu quán ăn yêu thích!');
    } catch (e) { toast.error(e.message); }
  },
};
