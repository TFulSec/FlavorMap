const navbar = {
  render() {
    const user = auth.getUser();
    let adminLink = '';
    if (user && (user.role === 'Admin' || user.role === 'Manager')) {
      adminLink = `<a href="/pages/admin.html" style="color:var(--color-primary);">⚙️ Quản lý</a>`;
    }

    const userSection = user
      ? `<div class="navbar__user">
           <img src="${user.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=FlavorMap'}"
                class="navbar__avatar" alt="avatar" onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=FlavorMap'">
           <span class="navbar__username">${user.fullName}</span>
           <div class="navbar__dropdown">
             <a href="/pages/profile.html">👤 Hồ sơ của bạn</a>
             ${adminLink}
             <hr style="border:0; border-top: 1px solid var(--color-border); margin: 6px 0;" />
             <a href="#" id="logoutBtn" style="color:var(--color-error);">🚪 Đăng xuất</a>
           </div>
         </div>`
      : `<div class="navbar__auth">
           <a href="/pages/login.html" class="btn btn--outline">Đăng nhập</a>
           <a href="/pages/register.html" class="btn btn--primary">Đăng ký</a>
         </div>`;

    const placeholder = document.getElementById('navbar-placeholder');
    if (placeholder) {
      placeholder.innerHTML = `
        <nav class="navbar">
          <div class="container navbar__inner">
            <a href="/pages/index.html" class="navbar__brand">
              🗺️ <span>Thổ Địa Ẩm Thực</span>
            </a>
            <ul class="navbar__links">
              <li><a href="/pages/index.html">Trang chủ</a></li>
              <li><a href="/pages/search.html">Khám phá</a></li>
              ${user ? `<li><a href="/pages/bookmarks.html">❤️ Yêu thích</a></li>
              <li><a href="/pages/submit-restaurant.html">➕ Đề xuất quán ăn</a></li>` : ''}
            </ul>
            ${userSection}
            <button class="navbar__hamburger" id="hamburger">☰</button>
          </div>
        </nav>`;

      document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        auth.logout();
        window.location.href = '/pages/login.html';
      });

      document.getElementById('hamburger')?.addEventListener('click', () => {
        document.querySelector('.navbar__links').classList.toggle('open');
      });
    }
  },
};
