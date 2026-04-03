'use client';

/**
 * Centralized API Client with CSRF Protection
 * - Sends cookies automatically (credentials: 'include')
 * - Includes CSRF token in headers for state-changing requests
 * - On 401 → calls /api/auth/refresh → retries once
 * - On second 401 → redirects to login
 * - No manual Bearer header injection anywhere
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
  return match ? match[2] : null;
}

/**
 * Fetch CSRF token from server if not available
 */
async function ensureCsrfToken(): Promise<string | null> {
  let token = getCsrfToken();
  if (token) return token;

  try {
    const res = await fetch('/api/csrf-token', {
      method: 'GET',
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      return data.csrfToken;
    }
  } catch {
    // CSRF fetch failed silently
  }
  return null;
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
 * Automatically includes credentials, CSRF token, and handles 401 refresh.
 */
export async function apiFetch(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    const method = (options.method || 'GET').toUpperCase();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };

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

    // Handle CSRF token mismatch - refetch token and retry
    if (response.status === 403) {
        const data = await response.clone().json().catch(() => ({}));
        if (data.error === 'CSRF validation failed') {
            // Refetch CSRF token and retry once
            await fetch('/api/csrf-token', { credentials: 'include' });
            const newToken = getCsrfToken();
            if (newToken) {
                (opts.headers as Record<string, string>)[CSRF_HEADER_NAME] = newToken;
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
            // Retry original request with fresh cookies
            response = await fetch(url, opts);
        }

        // If still 401 after refresh, redirect to home
        if (response.status === 401 && typeof window !== 'undefined') {
            // Clear local auth state
            try {
                const { useAuthStore } = await import('@/store');
                useAuthStore.getState().logout();
            } catch {
                // Store may not be available
            }
            window.location.href = '/';
        }
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
 * Convenience DELETE wrapper
 */
export async function apiDelete(url: string): Promise<Response> {
    return apiFetch(url, { method: 'DELETE' });
}
