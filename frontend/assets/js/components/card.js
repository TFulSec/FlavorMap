const card = {
  render(restaurant) {
    const isOpen   = utils.isOpen(restaurant.OpeningTime, restaurant.ClosingTime);
    const openBadge = isOpen === null ? '' :
      `<span class="badge badge--${isOpen ? 'open' : 'closed'}">
         ${isOpen ? 'Đang mở' : 'Đã đóng'}
       </span>`;

    const featuredBadge = restaurant.IsFeatured
      ? '<span class="badge badge--featured">Nổi bật</span>' : '';
    const newBadge = restaurant.IsNew
      ? '<span class="badge badge--new">Mới</span>' : '';

    return `
      <article class="restaurant-card" onclick="window.location.href='/pages/restaurant.html?slug=${restaurant.Slug}'">
        <div class="card__img-wrap">
          <img src="${restaurant.BannerUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'}"
               alt="${restaurant.Name}"
               class="card__img"
               loading="lazy"
               onerror="this.src='https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'">
          <div class="card__badges">
            ${featuredBadge}${newBadge}${openBadge}
          </div>
          <button class="bookmark-btn ${bookmarkManager.isBookmarked(restaurant.Id) ? 'bookmark-btn--active' : ''}"
                  onclick="event.stopPropagation(); bookmarkManager.toggle('${restaurant.Slug}','${restaurant.Id}', this)">
            ♥
          </button>
        </div>
        <div class="card__body">
          <h3 class="card__title">${restaurant.Name}</h3>
          <p class="card__address">📍 ${restaurant.Address}</p>
          <div class="card__meta">
            <span class="card__category">${restaurant.Category}</span>
            <span class="card__rating">${utils.renderStars(restaurant.Rating || 0)}</span>
          </div>
          <p class="card__price">
            💰 ${utils.formatPriceRange(restaurant.PriceMin, restaurant.PriceMax)}
          </p>
        </div>
      </article>`;
  },
};
