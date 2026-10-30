const API_BASE = (document.querySelector('meta[name="api-base"]')?.content || '/api/v1').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** JSON request → `data` of the { data } envelope. Errors arrive as { error: { code, message, details } }. */
async function request(method, path, body, rawHeaders) {
  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      // rawHeaders: send `body` as-is (a File for uploads) instead of JSON
      headers: rawHeaders ? { Accept: 'application/json', ...rawHeaders }
        : body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: rawHeaders || body === undefined ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'the server is unreachable');
  }
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const e = payload?.error || {};
    // Session missing or expired on a data call: let main.js show the login page
    if (res.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new CustomEvent('prepflow:logged-out'));
    const detail = e.details?.map?.(d => `${d.path}: ${d.message}`).join('; ');
    throw new ApiError(res.status, e.code || 'HTTP_' + res.status, (e.message || res.statusText) + (detail ? ` (${detail})` : ''), e.details);
  }
  return payload?.data;
}

export const api = {
  authStatus: () => request('GET', '/auth/status'),
  signup: (username, password) => request('POST', '/auth/signup', { username, password }),
  login: (username, password) => request('POST', '/auth/login', { username, password }),
  changePassword: (currentPassword, newPassword) => request('POST', '/auth/password', { currentPassword, newPassword }),

  resumes: () => request('GET', '/resumes'),
  uploadResume: (file, label) => request('POST', '/resumes', file, {
    'Content-Type': 'application/octet-stream',
    'X-File-Name': encodeURIComponent(file.name),
    'X-Label': encodeURIComponent(label || ''),
  }),
  renameResume: (id, label) => request('PATCH', `/resumes/${id}`, { label }),
  deleteResume: id => request('DELETE', `/resumes/${id}`),
  resumeUrl: (id, download = false) => `${API_BASE}/resumes/${id}/file${download ? '?download=1' : ''}`,
  logout: () => request('POST', '/auth/logout'),
  tracker: () => request('GET', '/tracker'),
  exportUrl: `${API_BASE}/export`,
  importDocument: doc => request('POST', '/import', doc),
  reset: () => request('POST', '/reset'),
  restore: records => request('POST', '/restore', records),

  updateSettings: patch => request('PATCH', '/settings', patch),

  createGroup: body => request('POST', '/groups', body),
  updateGroup: (id, patch) => request('PATCH', `/groups/${id}`, patch),
  deleteGroup: id => request('DELETE', `/groups/${id}`),
  reorderGroups: positions => request('PATCH', '/groups/positions', positions),

  createItem: body => request('POST', '/items', body),
  updateItem: (id, patch) => request('PATCH', `/items/${id}`, patch),
  setDone: (id, done) => request('PATCH', `/items/${id}/done`, { done }),
  deleteItem: id => request('DELETE', `/items/${id}`),
  reorderItems: positions => request('PATCH', '/items/positions', positions),
  bulkAdd: body => request('POST', '/items/bulk', body),
};
