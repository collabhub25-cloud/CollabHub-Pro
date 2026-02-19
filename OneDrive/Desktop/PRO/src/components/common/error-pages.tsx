'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Home, ArrowLeft, Shield, Search, AlertTriangle, Mail } from 'lucide-react';

// ============================================
// 403 FORBIDDEN PAGE
// ============================================

interface ErrorPageProps {
  onGoHome?: () => void;
  onGoBack?: () => void;
}

export function ForbiddenPage({ onGoHome, onGoBack }: ErrorPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-6 text-center">
          <div className="h-20 w-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-6">
            <Shield className="h-10 w-10 text-red-500" />
          </div>
          
          <h1 className="text-4xl font-bold mb-2">403</h1>
          <h2 className="text-xl font-semibold text-muted-foreground mb-4">
            Access Denied
          </h2>
          
          <p className="text-muted-foreground mb-6">
            You don&apos;t have permission to access this page. This could be because:
          </p>
          
          <ul className="text-sm text-muted-foreground text-left space-y-2 mb-6">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Your subscription doesn&apos;t include this feature
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Your account role doesn&apos;t have the required permissions
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              This resource is private or has been restricted
            </li>
          </ul>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              variant="outline" 
              onClick={onGoBack || (() => window.history.back())}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
            <Button 
              onClick={onGoHome || (() => window.location.href = '/')}
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// 404 NOT FOUND PAGE
// ============================================

export function NotFoundPage({ onGoHome, onGoBack }: ErrorPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-6 text-center">
          <div className="h-20 w-20 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mx-auto mb-6">
            <Search className="h-10 w-10 text-blue-500" />
          </div>
          
          <h1 className="text-4xl font-bold mb-2">404</h1>
          <h2 className="text-xl font-semibold text-muted-foreground mb-4">
            Page Not Found
          </h2>
          
          <p className="text-muted-foreground mb-6">
            The page you&apos;re looking for doesn&apos;t exist or has been moved. 
            It might have been deleted or the URL might be incorrect.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              variant="outline" 
              onClick={onGoBack || (() => window.history.back())}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
            <Button 
              onClick={onGoHome || (() => window.location.href = '/')}
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// 500 SERVER ERROR PAGE
// ============================================

export function ServerErrorPage({ onGoHome, onGoBack }: ErrorPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-6 text-center">
          <div className="h-20 w-20 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-10 w-10 text-orange-500" />
          </div>
          
          <h1 className="text-4xl font-bold mb-2">500</h1>
          <h2 className="text-xl font-semibold text-muted-foreground mb-4">
            Server Error
          </h2>
          
          <p className="text-muted-foreground mb-6">
            Something went wrong on our end. Our team has been notified and we&apos;re 
            working to fix it. Please try again in a few minutes.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              variant="outline" 
              onClick={onGoBack || (() => window.history.back())}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
            <Button 
              onClick={onGoHome || (() => window.location.href = '/')}
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              Go Home
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground mt-6">
            If this problem persists, please{' '}
            <a href="mailto:support@collabhub.com" className="text-primary hover:underline inline-flex items-center gap-1">
              <Mail className="h-3 w-3" />
              contact support
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// SESSION EXPIRED PAGE
// ============================================

export function SessionExpiredPage({ onLogin }: { onLogin?: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-6 text-center">
          <div className="h-20 w-20 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center mx-auto mb-6">
            <Shield className="h-10 w-10 text-yellow-500" />
          </div>
          
          <h2 className="text-xl font-semibold mb-4">
            Session Expired
          </h2>
          
          <p className="text-muted-foreground mb-6">
            Your session has expired for security reasons. Please log in again to continue.
          </p>
          
          <Button 
            onClick={onLogin || (() => window.location.href = '/')}
            className="gap-2"
          >
            Log In Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// GENERIC ERROR COMPONENT
// ============================================

interface GenericErrorProps {
  title?: string;
  message?: string;
  showActions?: boolean;
  onRetry?: () => void;
}

export function GenericError({ 
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  showActions = true,
  onRetry
}: GenericErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-sm mb-4">{message}</p>
      {showActions && (
        <div className="flex gap-2">
          {onRetry && (
            <Button variant="outline" onClick={onRetry}>
              Try Again
            </Button>
          )}
          <Button variant="ghost" onClick={() => window.location.href = '/'}>
            Go Home
          </Button>
        </div>
      )}
    </div>
  );
}
