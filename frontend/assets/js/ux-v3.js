/* FlavorMap UX V3 — frontend-only enhancements. No API or backend changes. */
const uxV3 = {
  recentKey: 'flavormapRecentlyViewed',
  cityKey: 'flavormapPreferredCity',

  currentUrl() {
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
  },

  loginUrl(returnTo = this.currentUrl()) {
    return `/pages/login.html?redirect=${encodeURIComponent(returnTo)}`;
  },

  safeRedirect(value, fallback = '/pages/index.html') {
    try {
      const decoded = String(value || '');
      if (!decoded.startsWith('/') || decoded.startsWith('//')) return fallback;
      const url = new URL(decoded, location.origin);
      return url.origin === location.origin ? `${url.pathname}${url.search}${url.hash}` : fallback;
    } catch {
      return fallback;
    }
  },

  setButtonLoading(button, loading, loadingText = 'Đang xử lý...') {
    if (!button) return;
    if (loading) {
      button.dataset.uxOriginalText = button.textContent;
      button.dataset.uxLoadingText = loadingText;
      button.classList.add('is-loading');
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.setAttribute('aria-label', loadingText);
    } else {
      button.classList.remove('is-loading');
      button.disabled = false;
      button.removeAttribute('aria-busy');
      button.removeAttribute('aria-label');
      delete button.dataset.uxLoadingText;
    }
  },

  addSkipLink() {
    if (document.querySelector('.skip-link')) return;
    const main = document.querySelector('main, #detail-container, .admin-content, .owner-main');
    if (!main) return;
    if (!main.id) main.id = 'main-content';
    const link = document.createElement('a');
    link.className = 'skip-link';
    link.href = `#${main.id}`;
    link.textContent = 'Bỏ qua điều hướng';
    document.body.prepend(link);
  },

  renderMobileNav() {
    if (document.querySelector('.ux-mobile-nav')) return;
    const user = typeof auth !== 'undefined' ? auth.getUser() : null;
    const path = window.location.pathname === '/' ? '/pages/index.html' : window.location.pathname;
    const items = [
      ['/pages/index.html', '⌂', 'Trang chủ'],
      ['/pages/search.html', '⌕', 'Khám phá'],
      ['/pages/recommend.html', '✦', 'Gợi ý'],
      [user ? '/pages/bookmarks.html' : this.loginUrl('/pages/bookmarks.html'), '♥', 'Đã lưu'],
      [user ? '/pages/profile.html' : this.loginUrl('/pages/profile.html'), '●', 'Tài khoản'],
    ];
    const nav = document.createElement('nav');
    nav.className = 'ux-mobile-nav';
    nav.setAttribute('aria-label', 'Điều hướng nhanh trên điện thoại');
    nav.innerHTML = `<div class="ux-mobile-nav__inner">${items.map(([href, icon, label]) => {
      const clean = href.split('?')[0];
      return `<a href="${href}" class="${path === clean ? 'active' : ''}"><span aria-hidden="true">${icon}</span><span>${label}</span></a>`;
    }).join('')}</div>`;
    document.body.appendChild(nav);
  },

  improveImages(root = document) {
    root.querySelectorAll('img').forEach((img) => {
      if (!img.hasAttribute('loading') && !img.closest('.hero-collage, .restaurant-banner, .auth-visual')) img.loading = 'lazy';
      img.decoding = 'async';
    });
  },

  rememberCity(select) {
    if (!select) return;
    const urlCity = new URLSearchParams(location.search).get('city');
    const saved = localStorage.getItem(this.cityKey);
    const desired = urlCity || saved;
    if (desired && [...select.options].some((option) => option.value === desired)) select.value = desired;
    select.addEventListener('change', () => {
      if (select.value) localStorage.setItem(this.cityKey, select.value);
      else localStorage.removeItem(this.cityKey);
    });
  },

  addRecentlyViewed(restaurant) {
    if (!restaurant?.Slug) return;
    const current = this.getRecentlyViewed().filter((item) => item.Slug !== restaurant.Slug);
    current.unshift({
      Id: restaurant.Id,
      Slug: restaurant.Slug,
      Name: restaurant.Name,
      Address: restaurant.Address,
      Category: restaurant.Category,
      BannerUrl: restaurant.BannerUrl,
      Rating: restaurant.Rating,
      PriceMin: restaurant.PriceMin,
      PriceMax: restaurant.PriceMax,
      OpeningTime: restaurant.OpeningTime,
      ClosingTime: restaurant.ClosingTime,
      CrowdStatus: restaurant.CrowdStatus,
      IsTemporarilyClosed: restaurant.IsTemporarilyClosed,
      viewedAt: Date.now(),
    });
    localStorage.setItem(this.recentKey, JSON.stringify(current.slice(0, 8)));
  },

  getRecentlyViewed() {
    try {
      const data = JSON.parse(localStorage.getItem(this.recentKey) || '[]');
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async renderRecentlyViewed(sectionId = 'recent-section', gridId = 'recent-grid') {
    const section = document.getElementById(sectionId);
    const grid = document.getElementById(gridId);
    if (!section || !grid || typeof card === 'undefined') return;
    const items = this.getRecentlyViewed();
    if (!items.length) return;
    if (typeof bookmarkManager !== 'undefined') await bookmarkManager.ensureLoaded();
    grid.innerHTML = items.slice(0, 4).map((item) => card.render(item)).join('');
    section.hidden = false;
  },

  haversineKm(lat1, lng1, lat2, lng2) {
    const values = [lat1, lng1, lat2, lng2].map(Number);
    if (values.some((value) => !Number.isFinite(value))) return null;
    const [aLat, aLng, bLat, bLng] = values;
    const toRad = (value) => value * Math.PI / 180;
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },

  async getLocation(options = {}) {
    if (!navigator.geolocation) throw new Error('Trình duyệt không hỗ trợ định vị.');
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        () => reject(new Error('Không thể lấy vị trí. Hãy cấp quyền định vị rồi thử lại.')),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000, ...options }
      );
    });
  },

  initRestaurantPage(restaurant, slug) {
    this.addRecentlyViewed(restaurant);
    document.title = `${restaurant.Name || 'Chi tiết quán'} — Thổ Địa Ẩm Thực`;

    const detailMenu = document.querySelector('.detail-menu');
    if (detailMenu && !document.querySelector('.detail-anchor-nav')) {
      const nav = document.createElement('nav');
      nav.className = 'detail-anchor-nav';
      nav.setAttribute('aria-label', 'Nội dung trang quán');
      nav.innerHTML = [
        ['#overview', 'Tổng quan'], ['#menu-section', 'Thực đơn'], ['#reviews-section', 'Đánh giá'], ['#map-section', 'Bản đồ'],
      ].map(([href, label]) => `<a href="${href}">${label}</a>`).join('');
      detailMenu.prepend(nav);
    }

    this.initMenuTools();
    this.renderDetailActions(restaurant, slug);
  },

  initMenuTools() {
    const list = document.getElementById('menu-list');
    if (!list || document.querySelector('.menu-tools')) return;
    const items = [...list.querySelectorAll('.menu-item')];
    if (!items.length) return;
    const categories = [...new Set(items.map((item) => item.dataset.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
    const tools = document.createElement('div');
    tools.className = 'menu-tools';
    tools.innerHTML = `
      <input id="menuSearch" type="search" placeholder="Tìm món trong thực đơn..." aria-label="Tìm món trong thực đơn">
      <select id="menuCategory" aria-label="Lọc nhóm món"><option value="">Tất cả nhóm món</option>${categories.map((category) => `<option value="${utils.escapeHtml(category)}">${utils.escapeHtml(category)}</option>`).join('')}</select>
    `;
    list.before(tools);
    const filter = () => {
      const query = document.getElementById('menuSearch').value.trim().toLocaleLowerCase('vi');
      const category = document.getElementById('menuCategory').value;
      let visible = 0;
      items.forEach((item) => {
        const match = (!query || (item.dataset.name || '').toLocaleLowerCase('vi').includes(query)) && (!category || item.dataset.category === category);
        item.hidden = !match;
        if (match) visible += 1;
      });
      let empty = document.getElementById('menuFilterEmpty');
      if (!empty) {
        empty = document.createElement('p');
        empty.id = 'menuFilterEmpty';
        empty.className = 'empty-state-small';
        empty.textContent = 'Không tìm thấy món phù hợp.';
        list.appendChild(empty);
      }
      empty.hidden = visible > 0;
    };
    document.getElementById('menuSearch').addEventListener('input', utils.debounce(filter, 180));
    document.getElementById('menuCategory').addEventListener('change', filter);
  },

  renderDetailActions(restaurant, slug) {
    document.querySelector('.ux-detail-actions')?.remove();
    const phone = String(restaurant.Phone || '').replace(/[^+\d]/g, '');
    const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(`${restaurant.Latitude || ''},${restaurant.Longitude || ''}`)}`;
    const bar = document.createElement('div');
    bar.className = 'ux-detail-actions';
    bar.setAttribute('aria-label', 'Thao tác nhanh');
    bar.innerHTML = `
      <button type="button" id="uxSaveRestaurant"><span>♥</span><span>Lưu</span></button>
      <a class="primary" href="${mapsUrl}" target="_blank" rel="noopener"><span>➜</span><span>Chỉ đường</span></a>
      ${phone ? `<a href="tel:${phone}"><span>☎</span><span>Gọi quán</span></a>` : '<button type="button" disabled><span>☎</span><span>Chưa có SĐT</span></button>'}
      <button type="button" id="uxShareRestaurant"><span>↗</span><span>Chia sẻ</span></button>
    `;
    document.body.appendChild(bar);
    const save = document.getElementById('uxSaveRestaurant');
    if (typeof bookmarkManager !== 'undefined') {
      bookmarkManager.ensureLoaded().then(() => save.classList.toggle('primary', bookmarkManager.isBookmarked(restaurant.Id)));
      save.addEventListener('click', async () => {
        if (!auth.isLoggedIn()) return location.href = this.loginUrl();
        await bookmarkManager.toggle(slug, restaurant.Id, save);
        save.classList.toggle('primary', bookmarkManager.isBookmarked(restaurant.Id));
      });
    }
    document.getElementById('uxShareRestaurant')?.addEventListener('click', () => {
      if (navigator.share) navigator.share({ title: restaurant.Name, url: location.href }).catch(() => {});
      else navigator.clipboard.writeText(location.href).then(() => toast.success('Đã sao chép liên kết.'));
    });
  },

  bindAutomaticFormLoading() {
    document.querySelectorAll('form').forEach((form) => {
      if (form.dataset.uxBound === 'true') return;
      form.dataset.uxBound = 'true';
      form.addEventListener('submit', () => {
        const button = form.querySelector('button[type="submit"]');
        if (!button || button.disabled) return;
        this.setButtonLoading(button, true);
        window.setTimeout(() => this.setButtonLoading(button, false), 12000);
      });
    });
  },

  observeDynamicContent() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) this.improveImages(node);
      }));
    });
    observer.observe(document.body, { childList: true, subtree: true });
  },

  init() {
    this.addSkipLink();
    this.renderMobileNav();
    this.improveImages();
    this.observeDynamicContent();
  },
};

document.addEventListener('DOMContentLoaded', () => uxV3.init());
