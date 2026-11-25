// Small wrapper around fetch for talking to the Sweety API.
// - adds the JWT from localStorage
// - parses JSON
// - throws an ApiError carrying the server's message, so forms can show it as-is

const TOKEN_KEY = 'sweety_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Could not reach the server. Please check your connection.', 0);
  }

  // 204 No Content (e.g. after a delete)
  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(data.error || 'Something went wrong. Please try again.', response.status);
  }
  return data;
}

export const api = {
  register: (details) => request('/auth/register', { method: 'POST', body: details }),
  login: (credentials) => request('/auth/login', { method: 'POST', body: credentials }),
  me: () => request('/auth/me'),

  listReadings: (date) => request(date ? `/readings?date=${date}` : '/readings'),
  createReading: (reading) => request('/readings', { method: 'POST', body: reading }),
  updateReading: (id, reading) => request(`/readings/${id}`, { method: 'PUT', body: reading }),
  deleteReading: (id) => request(`/readings/${id}`, { method: 'DELETE' }),

  getReports: (date) => request(`/reports?date=${date}`),
};
