const BASE_URL = 'http://localhost:5000/api';

const api = {
  _getHeaders() {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  },

  async request(method, endpoint, body = null) {
    const options = {
      method,
      headers: this._getHeaders(),
      ...(body ? { body: JSON.stringify(body) } : {}),
    };

    let res = await fetch(`${BASE_URL}${endpoint}`, options);

    if (res.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          localStorage.setItem('accessToken', refreshData.data.accessToken);
          options.headers = this._getHeaders();
          res = await fetch(`${BASE_URL}${endpoint}`, options);
        } else {
          auth.logout();
          window.location.href = 'login.html';
          return;
        }
      }
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Có lỗi xảy ra.');
    return data;
  },

  get(endpoint)           { return this.request('GET',    endpoint); },
  post(endpoint, body)    { return this.request('POST',   endpoint, body); },
  put(endpoint, body)     { return this.request('PUT',    endpoint, body); },
  delete(endpoint)        { return this.request('DELETE', endpoint); },
};
