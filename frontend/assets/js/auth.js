const auth = {
  isLoggedIn() {
    return !!localStorage.getItem('accessToken');
  },

  getUser() {
    const raw = localStorage.getItem('currentUser');
    return raw ? JSON.parse(raw) : null;
  },

  setSession(data) {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('currentUser', JSON.stringify(data.user));
  },

  async syncCurrentUser() {
    if (!this.isLoggedIn()) return null;
    const cachedUser = this.getUser();
    try {
      const response = await api.get('/users/profile');
      const profile = response.data || {};
      const updatedUser = {
        id: profile.Id || cachedUser?.id,
        fullName: profile.FullName || cachedUser?.fullName || '',
        email: profile.Email || cachedUser?.email || '',
        avatarUrl: profile.AvatarUrl || cachedUser?.avatarUrl || null,
        role: profile.Role || cachedUser?.role || 'User',
        isBanned: Boolean(profile.IsBanned),
      };
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      return updatedUser;
    } catch (error) {
      console.warn('Không thể đồng bộ thông tin người dùng:', error.message);
      return cachedUser;
    }
  },

  logout() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
  },

  requireLogin() {
    if (!this.isLoggedIn()) {
      const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.location.href = '/pages/login.html?redirect=' + encodeURIComponent(returnTo);
      return false;
    }
    return true;
  },
};
