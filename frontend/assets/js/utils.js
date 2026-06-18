const utils = {
  formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency', currency: 'VND',
    }).format(price);
  },

  isOpen(openingTime, closingTime) {
    if (!openingTime || !closingTime) return null;
    const now = new Date();
    const [oh, om] = openingTime.split(':').map(Number);
    const [ch, cm] = closingTime.split(':').map(Number);
    const cur = now.getHours() * 60 + now.getMinutes();
    const open = oh * 60 + om;
    const close = ch * 60 + cm;
    return cur >= open && cur <= close;
  },

  formatPriceRange(min, max) {
    return `${this.formatPrice(min)} – ${this.formatPrice(max)}`;
  },

  debounce(fn, delay = 400) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  },

  renderStars(rating) {
    const full  = Math.floor(rating);
    const half  = rating - full >= 0.5;
    let html = '';
    for (let i = 0; i < full; i++) html += '★';
    if (half) html += '½';
    return `<span class="stars">${html}</span> <span class="rating-num">${rating.toFixed(1)}</span>`;
  },
};
