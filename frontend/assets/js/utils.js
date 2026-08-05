const utils = {
  // Chuẩn hóa Unicode về NFC để dấu tiếng Việt luôn gắn đúng ký tự.
  normalizeText(value) {
    return String(value ?? '').normalize('NFC');
  },

  normalizeDeep(value) {
    if (typeof value === 'string') return value.normalize('NFC');
    if (Array.isArray(value)) return value.map((item) => this.normalizeDeep(item));
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, this.normalizeDeep(item)])
      );
    }
    return value;
  },

  escapeHtml(value) {
    return this.normalizeText(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },
  categoryLabel(category) {
    const labels = {
      Cafe: 'Cafe & Trà',
      'Cơm': 'Món Việt',
      'Đồ ăn vặt': 'Đồ ăn vặt',
      'Nước': 'Đồ uống',
      'Hải sản': 'Hải sản',
      'Khác': 'Ẩm thực khác',
    };
    return labels[this.normalizeText(category)] || this.normalizeText(category || 'Ẩm thực địa phương');
  },

  // Định dạng tiền VND
  formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency', currency: 'VND',
    }).format(price);
  },

  // Kiểm tra quán đang mở không
  isOpen(openingTime, closingTime) {
    if (!openingTime || !closingTime) return null;
    const now   = new Date();
    // parse time "10:00:00" -> "10:00" if needed
    const [oh, om] = openingTime.split(':').map(Number);
    const [ch, cm] = closingTime.split(':').map(Number);
    const cur  = now.getHours() * 60 + now.getMinutes();
    const open = oh * 60 + om;
    const close = ch * 60 + cm;
    // Hỗ trợ quán mở qua đêm, ví dụ 18:00–02:00.
    if (open === close) return true;
    if (close < open) return cur >= open || cur <= close;
    return cur >= open && cur <= close;
  },

  // Hiển thị khoảng giá
  formatPriceRange(min, max) {
    const low = Number(min || 0);
    const high = Number(max || 0);
    if (!low && !high) return 'Đang cập nhật giá';
    if (!high || low === high) return this.formatPrice(low || high);
    return `${this.formatPrice(low)} – ${this.formatPrice(high)}`;
  },

  // Debounce
  debounce(fn, delay = 400) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  // Lấy query param từ URL
  getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  },

  safeRedirect(value, fallback = '/pages/index.html') {
    const target = this.normalizeText(value || '').trim();
    if (!target.startsWith('/') || target.startsWith('//') || target.includes('\\')) return fallback;
    return target;
  },

  // Tạo stars HTML
  renderStars(rating) {
    const full  = Math.floor(rating);
    const half  = rating - full >= 0.5;
    let html = '';
    for (let i = 0; i < full; i++) html += '★';
    if (half) html += '½';
    return `<span class="stars">${html}</span> <span class="rating-num">${rating.toFixed(1)}</span>`;
  },
};
