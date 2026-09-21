const API_KEY = import.meta.env.VITE_API_KEY || '';

export function apiFetch(url, options = {}) {
  const { headers, ...rest } = options;
  return fetch(url, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      ...headers,
    },
  });
}
