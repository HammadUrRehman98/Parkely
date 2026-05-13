const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';

type RequestOptions = RequestInit & {
  token?: string | null;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  } else {
    const storedToken = localStorage.getItem('parkely_token');
    if (storedToken) {
      headers.set('Authorization', `Bearer ${storedToken}`);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const detail = data?.detail;
    let message = response.statusText;
    let code = '';

    if (typeof detail === 'string') {
      message = detail;
    } else if (Array.isArray(detail)) {
      const validationMessages = detail
        .map((item) => {
          const location = Array.isArray(item?.loc) ? item.loc.join('.') : 'request';
          return `${location}: ${item?.msg || 'invalid value'}`;
        })
        .filter(Boolean);
      message = validationMessages.length > 0 ? validationMessages.join('; ') : response.statusText;
    } else if (detail && typeof detail === 'object') {
      message = detail.message || response.statusText;
      code = detail.code ? `${detail.code}: ` : '';
    }

    throw new Error(`${code}${message || 'Request failed'}`);
  }

  return data as T;
}

export { API_BASE_URL, request };
