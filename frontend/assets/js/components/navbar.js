const navbar = {
  async render() {
    const user = auth.isLoggedIn() ? await auth.syncCurrentUser() : null;
    const safeName = user ? utils.escapeHtml(user.fullName || 'Thành viên') : '';
    const safeAvatar = user?.avatarUrl
      ? utils.escapeHtml(user.avatarUrl)
      : 'https://api.dicebear.com/7.x/avataaars/svg?seed=FlavorMap';

    const roleLinks = (() => {
      if (!user) return '';

      const links = [];
      // Admin được backend và trang owner.html cho phép truy cập Cổng Chủ quán,
      // vì vậy menu tài khoản cũng phải hiển thị liên kết này cho Admin.
      if (['Owner', 'Admin'].includes(user.role)) {
        links.push('<a href="/pages/owner.html">Cổng Chủ quán</a>');
      }
      if (['Admin', 'Manager'].includes(user.role)) {
        links.push('<a href="/pages/admin.html">Quản trị hệ thống</a>');
      }
      return links.join('');
    })();

    const userSection = user
      ? `<div class="navbar__user" id="navbarUser">
           <button type="button" class="navbar__user-trigger" id="navbarUserTrigger" aria-label="Mở menu tài khoản" aria-expanded="false">
             <img src="${safeAvatar}"
                  class="navbar__avatar" alt="Ảnh đại diện"
                  onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=FlavorMap'">
             <span class="navbar__username">${safeName}</span>
             <span class="navbar__chevron" aria-hidden="true">⌄</span>
           </button>
           <div class="navbar__dropdown" role="menu">
             <a href="/pages/profile.html" role="menuitem">Hồ sơ cá nhân</a>
             <a href="/pages/bookmarks.html" role="menuitem">Quán yêu thích</a>
             ${roleLinks}
             <div class="navbar__dropdown-separator" aria-hidden="true"></div>
             <a href="#" id="logoutBtn" class="navbar__logout" role="menuitem">Đăng xuất</a>
           </div>
         </div>`
      : `<div class="navbar__auth">
           <a href="/pages/login.html" class="btn btn--outline">Đăng nhập</a>
           <a href="/pages/register.html" class="btn btn--primary">Đăng ký</a>
         </div>`;

    const placeholder = document.getElementById('navbar-placeholder');
    if (!placeholder) return;

    placeholder.innerHTML = `
      <nav class="navbar" aria-label="Điều hướng chính">
        <div class="container navbar__inner">
          <a href="/pages/index.html" class="navbar__brand" aria-label="Thổ Địa Ẩm Thực - Trang chủ">
            <span>Thổ Địa Ẩm Thực</span>
          </a>
          <ul class="navbar__links" id="navbarLinks">
            <li><a href="/pages/index.html">Trang chủ</a></li>
            <li><a href="/pages/search.html">Khám phá</a></li>
            <li><a href="/pages/recommend.html">Gợi ý cho tôi</a></li>
            <li><a href="/pages/vote-room.html">Bình chọn nhóm</a></li>
            <li><a href="/pages/report-missing-restaurant.html">Báo quán chưa có</a></li>
          </ul>
          ${userSection}
          <button class="navbar__hamburger" id="hamburger" type="button" aria-label="Mở menu" aria-expanded="false">☰</button>
        </div>
      </nav>`;

    document.getElementById('logoutBtn')?.addEventListener('click', (event) => {
      event.preventDefault();
      auth.logout();
      window.location.href = '/pages/login.html';
    });

    const hamburger = document.getElementById('hamburger');
    const links = document.getElementById('navbarLinks');
    hamburger?.addEventListener('click', () => {
      const open = links?.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', String(Boolean(open)));
    });

    const userWrap = document.getElementById('navbarUser');
    const userTrigger = document.getElementById('navbarUserTrigger');
    userTrigger?.addEventListener('click', (event) => {
      event.stopPropagation();
      const open = userWrap.classList.toggle('open');
      userTrigger.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', () => {
      userWrap?.classList.remove('open');
      userTrigger?.setAttribute('aria-expanded', 'false');
    });
  },
};
