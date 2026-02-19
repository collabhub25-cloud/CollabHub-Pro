'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, Shield, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// ============================================
// APP LOADER COMPONENT
// ============================================

interface AppLoaderProps {
  message?: string;
  fullScreen?: boolean;
}

export function AppLoader({ message = 'Loading...', fullScreen = true }: AppLoaderProps) {
  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary to-primary/60 animate-pulse" />
            <Loader2 className="h-6 w-6 absolute top-3 left-3 animate-spin text-primary-foreground" />
          </div>
          <p className="text-muted-foreground text-sm animate-pulse">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">{message}</p>
      </div>
    </div>
  );
}

// ============================================
// PAGE SKELETON LOADER
// ============================================

export function PageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-10 w-32 bg-muted animate-pulse rounded" />
      </div>
      
      {/* Stats grid skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                <div className="h-3 w-32 bg-muted animate-pulse rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Content skeleton */}
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                      <div className="h-3 w-48 bg-muted animate-pulse rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================
// ERROR BOUNDARY
// ============================================

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
              <p className="text-muted-foreground mb-4">
                We encountered an unexpected error. Please try refreshing the page.
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => window.location.href = '/'}>
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
                <Button onClick={() => window.location.reload()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================
// API ERROR HANDLER
// ============================================

export interface APIError {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
}

export function parseAPIError(error: unknown): APIError {
  if (error instanceof Error) {
    // Check for fetch errors
    if (error.message.includes('fetch')) {
      return {
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
        status: 0,
      };
    }

    return {
      message: error.message || 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
    };
  }

  if (typeof error === 'object' && error !== null) {
    const apiError = error as Record<string, unknown>;
    return {
      message: (apiError.message as string) || 'An error occurred',
      code: (apiError.code as string) || 'API_ERROR',
      status: apiError.status as number,
      details: apiError.details as Record<string, unknown>,
    };
  }

  return {
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
  };
}

export function handleAPIError(error: unknown, showToast = true): APIError {
  const apiError = parseAPIError(error);

  if (showToast) {
    // Don't show raw error messages
    const userMessage = apiError.status === 401
      ? 'Your session has expired. Please log in again.'
      : apiError.status === 403
      ? 'You do not have permission to perform this action.'
      : apiError.status === 404
      ? 'The requested resource was not found.'
      : apiError.status === 429
      ? 'Too many requests. Please wait a moment and try again.'
      : apiError.status === 500
      ? 'Server error. Please try again later.'
      : apiError.code === 'NETWORK_ERROR'
      ? 'Network error. Please check your connection.'
      : 'An error occurred. Please try again.';

    toast.error(userMessage);
  }

  return apiError;
}

// ============================================
// ERROR DISPLAY COMPONENTS
// ============================================

interface ErrorDisplayProps {
  title?: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: 'alert' | 'shield' | 'search';
}

export function ErrorDisplay({ 
  title = 'Error', 
  message = 'Something went wrong',
  action,
  icon = 'alert'
}: ErrorDisplayProps) {
  const icons = {
    alert: AlertTriangle,
    shield: Shield,
    search: Search,
  };
  const Icon = icons[icon];

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-sm mb-4">{message}</p>
      {action && (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  );
}

// ============================================
// SESSION EXPIRED HANDLER
// ============================================

export function useSessionExpired() {
  const [isExpired, setIsExpired] = useState(false);

  const checkResponse = useCallback((response: Response) => {
    if (response.status === 401) {
      setIsExpired(true);
      return false;
    }
    return true;
  }, []);

  const handleExpired = useCallback(() => {
    // Clear auth state
    localStorage.removeItem('collabhub-auth');
    localStorage.removeItem('collabhub-ui');
    
    // Redirect to login with message
    window.location.href = '/?session=expired';
  }, []);

  return { isExpired, checkResponse, handleExpired };
}

// ============================================
// RETRY BUTTON COMPONENT
// ============================================

interface RetryButtonProps {
  onRetry: () => void;
  loading?: boolean;
  label?: string;
}

export function RetryButton({ onRetry, loading = false, label = 'Try Again' }: RetryButtonProps) {
  return (
    <Button variant="outline" onClick={onRetry} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4 mr-2" />
      )}
      {label}
    </Button>
  );
}

// ============================================
// GLOBAL ERROR HANDLER HOOK
// ============================================

export function useGlobalErrorHandler() {
  const handleFetchError = useCallback((error: unknown, customMessage?: string) => {
    console.error('Fetch error:', error);
    
    const apiError = handleAPIError(error, false);
    
    // Show user-friendly message
    toast.error(customMessage || apiError.message);
    
    return apiError;
  }, []);

  return { handleFetchError, handleAPIError };
}

// ============================================
// TOAST UTILITIES
// ============================================

export const ToastMessages = {
  success: {
    saved: 'Changes saved successfully',
    created: 'Created successfully',
    updated: 'Updated successfully',
    deleted: 'Deleted successfully',
    sent: 'Sent successfully',
    subscribed: 'Subscription activated',
  },
  error: {
    generic: 'Something went wrong. Please try again.',
    network: 'Network error. Please check your connection.',
    unauthorized: 'You are not authorized to perform this action.',
    notFound: 'The requested item was not found.',
    validation: 'Please check your input and try again.',
    sessionExpired: 'Your session has expired. Please log in again.',
  },
  info: {
    loading: 'Loading...',
    processing: 'Processing...',
  },
} as const;

export function showSuccessToast(message: string) {
  toast.success(message);
}

export function showErrorToast(message: string) {
  toast.error(message);
}

export function showLoadingToast(message: string) {
  return toast.loading(message);
}

export function dismissToast(toastId: string | number) {
  toast.dismiss(toastId);
}
