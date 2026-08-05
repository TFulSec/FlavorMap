const mapPicker = {
  async create(options) {
    const {
      mapId,
      searchInputId,
      searchButtonId,
      resultsId,
      latitudeInputId,
      longitudeInputId,
      addressInputId,
      districtInputId,
      cityInputId,
      initialLat = 21.0285,
      initialLng = 105.8542,
      initialZoom = 13,
    } = options;

    if (typeof L === 'undefined') throw new Error('Leaflet chưa được tải.');

    const mapElement = document.getElementById(mapId);
    const searchInput = document.getElementById(searchInputId);
    const searchButton = document.getElementById(searchButtonId);
    const resultsElement = document.getElementById(resultsId);
    const latitudeInput = document.getElementById(latitudeInputId);
    const longitudeInput = document.getElementById(longitudeInputId);
    const addressInput = document.getElementById(addressInputId);
    const districtInput = document.getElementById(districtInputId);
    const cityInput = document.getElementById(cityInputId);

    if (!mapElement || !latitudeInput || !longitudeInput) return null;

    const parsedLat = Number(latitudeInput.value);
    const parsedLng = Number(longitudeInput.value);
    const startLat = Number.isFinite(parsedLat) && parsedLat !== 0 ? parsedLat : initialLat;
    const startLng = Number.isFinite(parsedLng) && parsedLng !== 0 ? parsedLng : initialLng;

    const map = L.map(mapId).setView([startLat, startLng], initialZoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    let marker = null;
    const setMarker = (lat, lng, zoom = 17) => {
      if (marker) marker.setLatLng([lat, lng]);
      else marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      marker.off('dragend');
      marker.on('dragend', async () => {
        const position = marker.getLatLng();
        await updatePosition(position.lat, position.lng, true);
      });
      map.setView([lat, lng], zoom);
    };

    const fillAddressFields = (result, overwrite = false) => {
      const address = result?.display_name || '';
      const parts = result?.address || {};
      const district = parts.city_district || parts.district || parts.suburb || parts.county || '';
      const city = parts.city || parts.town || parts.municipality || parts.state || '';

      if (addressInput && (overwrite || !addressInput.value.trim())) addressInput.value = address;
      if (districtInput && district && (overwrite || !districtInput.value.trim())) districtInput.value = district;
      if (cityInput && city && (overwrite || !cityInput.value.trim())) cityInput.value = city;
    };

    const reverseGeocode = async (lat, lng, overwrite = false) => {
      try {
        const params = new URLSearchParams({
          format: 'jsonv2',
          lat: String(lat),
          lon: String(lng),
          addressdetails: '1',
          'accept-language': 'vi',
        });
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) return;
        const result = await response.json();
        fillAddressFields(result, overwrite);
      } catch {
        // Reverse geocoding is helpful but must not block form use.
      }
    };

    const updatePosition = async (lat, lng, shouldReverse = false, overwriteAddress = false) => {
      const safeLat = Number(lat);
      const safeLng = Number(lng);
      if (!Number.isFinite(safeLat) || !Number.isFinite(safeLng)) return;
      latitudeInput.value = safeLat.toFixed(6);
      longitudeInput.value = safeLng.toFixed(6);
      setMarker(safeLat, safeLng);
      if (shouldReverse) await reverseGeocode(safeLat, safeLng, overwriteAddress);
    };

    map.on('click', async (event) => {
      await updatePosition(event.latlng.lat, event.latlng.lng, true, false);
      if (window.toast) toast.success('Đã chọn vị trí trên bản đồ.');
    });

    const renderResults = (rows) => {
      if (!resultsElement) return;
      if (!rows.length) {
        resultsElement.innerHTML = '<div class="map-picker__result">Không tìm thấy địa chỉ phù hợp.</div>';
        resultsElement.classList.add('open');
        return;
      }
      resultsElement.innerHTML = rows.map((row, index) => `
        <button type="button" class="map-picker__result" data-index="${index}">
          ${utils.escapeHtml(row.display_name || 'Địa chỉ không xác định')}
        </button>`).join('');
      resultsElement.classList.add('open');
      resultsElement.querySelectorAll('[data-index]').forEach((button) => {
        button.addEventListener('click', async () => {
          const row = rows[Number(button.dataset.index)];
          fillAddressFields(row, true);
          if (searchInput) searchInput.value = row.display_name || '';
          resultsElement.classList.remove('open');
          await updatePosition(Number(row.lat), Number(row.lon), false);
        });
      });
    };

    const search = async () => {
      const query = String(searchInput?.value || '').trim();
      if (query.length < 3) {
        if (window.toast) toast.error('Hãy nhập ít nhất 3 ký tự để tìm địa chỉ.');
        return;
      }
      if (searchButton) featureHelpers.setButtonLoading(searchButton, true, 'Đang tìm...');
      try {
        const params = new URLSearchParams({
          format: 'jsonv2',
          q: query,
          addressdetails: '1',
          limit: '5',
          countrycodes: 'vn',
          'accept-language': 'vi',
        });
        const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error('Dịch vụ tìm địa chỉ tạm thời không phản hồi.');
        renderResults(await response.json());
      } catch (error) {
        if (window.toast) toast.error(error.message);
      } finally {
        if (searchButton) featureHelpers.setButtonLoading(searchButton, false);
      }
    };

    searchButton?.addEventListener('click', search);
    searchInput?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        search();
      }
    });
    document.addEventListener('click', (event) => {
      if (resultsElement && !resultsElement.contains(event.target) && event.target !== searchInput) {
        resultsElement.classList.remove('open');
      }
    });

    if (Number.isFinite(parsedLat) && Number.isFinite(parsedLng) && parsedLat !== 0 && parsedLng !== 0) {
      setMarker(parsedLat, parsedLng, 17);
    }

    setTimeout(() => map.invalidateSize(), 100);
    return { map, updatePosition, reverseGeocode };
  },
};
