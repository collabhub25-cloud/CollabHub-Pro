'use client';

/**
 * Centralized API Client with CSRF Protection
 * ALL frontend API calls MUST use these wrappers (apiFetch, apiGet, apiPost, apiPut, apiPatch, apiDelete).
 * 
 * Features:
 * - Sends cookies automatically (credentials: 'include')
 * - Includes CSRF token in headers for state-changing requests (POST, PUT, PATCH, DELETE)
 * - Auto-refresh CSRF token on 403 → retry once
 * - On 401 → calls /api/auth/refresh → retries once
 * - On second 401 → redirects to login
 * - Logging for all failed state-changing requests
 */

const CSRF_COOKIE_NAME = '_csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Get CSRF token from cookie
 */
function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(^| )${CSRF_COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * Force-fetch a fresh CSRF token from the server and return it
 */
async function fetchFreshCsrfToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/csrf-token', {
      method: 'GET',
      credentials: 'include',
    });
    if (res.ok) {
      // Wait for the cookie to be set by the browser
      await new Promise(resolve => setTimeout(resolve, 50));
      const token = getCsrfToken();
      if (token) return token;

      // Fallback: read from response body
      const data = await res.json();
      return data.csrfToken || null;
    }
  } catch {
    console.warn('[API Client] Failed to fetch fresh CSRF token');
  }
  return null;
}

/**
 * Ensure a CSRF token is available — reads from cookie first, fetches if missing
 */
async function ensureCsrfToken(): Promise<string | null> {
  const token = getCsrfToken();
  if (token) return token;
  return fetchFreshCsrfToken();
}

async function refreshTokens(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Centralized fetch wrapper. Drop-in replacement for fetch().
 * Automatically includes credentials, CSRF token, and handles 401 refresh + 403 CSRF retry.
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();
  const headers: Record<string, string> = {};

  // Only set Content-Type for non-FormData bodies
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Merge caller headers
  if (options.headers) {
    Object.assign(headers, options.headers as Record<string, string>);
  }

  // Defense-in-depth: mark as XHR
  headers['X-Requested-With'] = 'XMLHttpRequest';

  // Add CSRF token for state-changing requests
  if (STATE_CHANGING_METHODS.has(method)) {
    const csrfToken = await ensureCsrfToken();
    if (csrfToken) {
      headers[CSRF_HEADER_NAME] = csrfToken;
    }
  }

  const opts: RequestInit = {
    ...options,
    method,
    credentials: 'include',
    headers,
  };

  let response = await fetch(url, opts);

  // Handle CSRF token mismatch — force-refresh token and retry once
  if (response.status === 403 && STATE_CHANGING_METHODS.has(method)) {
    const data = await response.clone().json().catch(() => ({}));
    if (data.error === 'CSRF validation failed') {
      console.warn(`[API Client] CSRF validation failed for ${method} ${url}. Refreshing token and retrying...`);
      // Force-fetch a fresh token from the server
      const freshToken = await fetchFreshCsrfToken();
      if (freshToken) {
        (opts.headers as Record<string, string>)[CSRF_HEADER_NAME] = freshToken;
        response = await fetch(url, opts);
      }
    }
  }

  // If 401, try to refresh once
  if (response.status === 401) {
    // Deduplicate concurrent refresh calls
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshTokens();
    }

    const refreshSuccess = await refreshPromise!;
    isRefreshing = false;
    refreshPromise = null;

    if (refreshSuccess) {
      // Re-acquire CSRF token in case cookies changed
      if (STATE_CHANGING_METHODS.has(method)) {
        const newCsrf = getCsrfToken();
        if (newCsrf) {
          (opts.headers as Record<string, string>)[CSRF_HEADER_NAME] = newCsrf;
        }
      }
      response = await fetch(url, opts);
    }

    // If still 401 after refresh, redirect to home
    if (response.status === 401 && typeof window !== 'undefined') {
      try {
        const { useAuthStore } = await import('@/store');
        useAuthStore.getState().logout();
      } catch {
        // Store may not be available
      }
      window.location.href = '/';
    }
  }

  // Log failed state-changing requests for debugging
  if (!response.ok && STATE_CHANGING_METHODS.has(method)) {
    console.error(`[API Client] ${method} ${url} failed with status ${response.status}`);
  }

  return response;
}

/**
 * Convenience GET wrapper
 */
export async function apiGet(url: string): Promise<Response> {
  return apiFetch(url, { method: 'GET' });
}

/**
 * Convenience POST wrapper
 */
export async function apiPost(url: string, body?: unknown): Promise<Response> {
  return apiFetch(url, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Convenience PUT wrapper
 */
export async function apiPut(url: string, body?: unknown): Promise<Response> {
  return apiFetch(url, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Convenience PATCH wrapper
 */
export async function apiPatch(url: string, body?: unknown): Promise<Response> {
  return apiFetch(url, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Convenience DELETE wrapper
 */
export async function apiDelete(url: string): Promise<Response> {
  return apiFetch(url, { method: 'DELETE' });
}
