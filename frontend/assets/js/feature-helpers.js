const featureHelpers = {
  loginUrl() {
    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    return `/pages/login.html?redirect=${encodeURIComponent(returnTo)}`;
  },

  setButtonLoading(button, loading, text = 'Đang xử lý...') {
    if (!button) return;
    if (loading) {
      button.dataset.originalText = button.textContent;
      button.disabled = true;
      button.textContent = text;
    } else {
      button.disabled = false;
      if (button.dataset.originalText) button.textContent = button.dataset.originalText;
      delete button.dataset.originalText;
    }
  },

  rememberCity(city) {
    if (city) localStorage.setItem('flavormapCity', city);
  },

  getLocation(options = {}) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Trình duyệt không hỗ trợ định vị.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
        () => reject(new Error('Không thể lấy vị trí hiện tại.')),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000, ...options }
      );
    });
  },
};
