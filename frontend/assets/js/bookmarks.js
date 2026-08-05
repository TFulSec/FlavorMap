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
      const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.location.href = '/pages/login.html?redirect=' + encodeURIComponent(returnTo);
      return;
    }
    const isBm = this.isBookmarked(restaurantId);
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.setAttribute('aria-busy', 'true');
    }
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
    finally {
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.removeAttribute('aria-busy');
      }
    }
  },
};
