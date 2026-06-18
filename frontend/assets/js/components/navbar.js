const navbar = {
  render() {
    const user = auth.getUser();
    const userSection = user
      ? `<div class="navbar__user">
           <img src="${user.avatarUrl || '../assets/images/default-avatar.svg'}"
                class="navbar__avatar" alt="avatar">
           <span class="navbar__username">${user.fullName}</span>
           <div class="navbar__dropdown">
             <a href="profile.html">Hồ sơ</a>
             <a href="#" id="logoutBtn">Đăng xuất</a>
           </div>
         </div>`
      : `<div class="navbar__auth">
           <a href="login.html" class="btn btn--outline">Đăng nhập</a>
           <a href="register.html" class="btn btn--primary">Đăng ký</a>
         </div>`;

    document.getElementById('navbar-placeholder').innerHTML = `
      <nav class="navbar">
        <div class="container navbar__inner">
          <a href="index.html" class="navbar__brand">
            🗺️ <span>Thổ Địa Ẩm Thực</span>
          </a>
          <ul class="navbar__links">
            <li><a href="index.html">Trang chủ</a></li>
            <li><a href="search.html">Khám phá</a></li>
          </ul>
          ${userSection}
          <button class="navbar__hamburger" id="hamburger">☰</button>
        </div>
      </nav>`;

    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      auth.logout();
      window.location.href = 'login.html';
    });

    document.getElementById('hamburger')?.addEventListener('click', () => {
      document.querySelector('.navbar__links').classList.toggle('open');
    });
  },
};
