const card = {
  render(restaurant) {
    const isOpen = utils.isOpen(
      restaurant.OpeningTime,
      restaurant.ClosingTime
    );

    const openBadge =
      isOpen === null
        ? ''
        : `<span class="badge badge--${isOpen ? 'open' : 'closed'}">
             ${isOpen ? 'Đang mở' : 'Đã đóng'}
           </span>`;

    const featuredBadge = restaurant.IsFeatured
      ? '<span class="badge badge--featured">Nổi bật</span>'
      : '';

    const newBadge = restaurant.IsNew
      ? '<span class="badge badge--new">Mới</span>'
      : '';

    const imageUrl =
      restaurant.BannerUrl
        ? `../${restaurant.BannerUrl.replace(/^\/+/, '')}`
        : '../assets/images/placeholder.svg';

    return `
      <article
        class="restaurant-card"
        onclick="window.location.href='restaurant.html?slug=${restaurant.Slug}'"
      >
        <div class="card__img-wrap">
          <img
            src="${imageUrl}"
            alt="${restaurant.Name}"
            class="card__img"
            loading="lazy"
            onerror="this.src='../assets/images/placeholder.svg'"
          >

          <div class="card__badges">
            ${featuredBadge}
            ${newBadge}
            ${openBadge}
          </div>
        </div>

        <div class="card__body">
          <h3 class="card__title">
            ${restaurant.Name}
          </h3>

          <p class="card__address">
            📍 ${restaurant.Address || ''}
          </p>

          <div class="card__meta">
            <span class="card__category">
              ${restaurant.Category || ''}
            </span>

            <span class="card__rating">
              ${utils.renderStars(
                Number(restaurant.Rating || 0)
              )}
            </span>
          </div>

          <p class="card__price">
            💰 ${utils.formatPriceRange(
              restaurant.PriceMin,
              restaurant.PriceMax
            )}
          </p>
        </div>
      </article>
    `;
  }
};

window.card = card;