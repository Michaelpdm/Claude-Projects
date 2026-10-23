const TOKEN_KEY = 'app_token';

export const getToken = () => {
  try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
};
export const setToken = (t) => {
  try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ }
};

export function toast(type, message) {
  window.dispatchEvent(new CustomEvent('fs-toast', { detail: { type, message } }));
}

const failure = (status, error) =>
  new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } });

// Every request goes through here: attaches the session token, and makes sure
// the user always sees feedback — an error toast on failure, a "Saved" toast after a change.
export async function apiFetch(url, options = {}) {
  const { headers, silent, successMessage, ...rest } = options;
  const method = (rest.method || 'GET').toUpperCase();
  const token = getToken();
  const h = {
    ...(rest.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };

  let res;
  try {
    res = await fetch(url, { ...rest, headers: h });
  } catch {
    if (!silent) toast('error', 'Cannot reach the server. Check your internet connection.');
    return failure(503, 'Cannot reach the server');
  }

  if (res.status === 401 && token) {
    setToken('');
    window.dispatchEvent(new Event('fs-logout'));
    toast('error', 'Your session ended. Please sign in again.');
    return res;
  }

  if (!silent) {
    if (!res.ok) {
      let msg = `Something went wrong (${res.status})`;
      try { msg = (await res.clone().json()).error || msg; } catch { /* body is not JSON */ }
      toast('error', msg);
    } else if (method !== 'GET') {
      toast('success', successMessage || 'Saved');
    }
  }
  return res;
}

// Download a file (CSV etc.) from an authenticated endpoint.
export async function downloadFile(url, filename) {
  const res = await apiFetch(url, { silent: true });
  if (!res.ok) { toast('error', 'Download failed. Please try again.'); return; }
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}
