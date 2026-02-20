'use client';

/**
 * Centralized API Client
 * - Sends cookies automatically (credentials: 'include')
 * - On 401 → calls /api/auth/refresh → retries once
 * - On second 401 → redirects to login
 * - No manual Bearer header injection anywhere
 */

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

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
 * Automatically includes credentials and handles 401 refresh.
 */
export async function apiFetch(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    const opts: RequestInit = {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    };

    let response = await fetch(url, opts);

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
