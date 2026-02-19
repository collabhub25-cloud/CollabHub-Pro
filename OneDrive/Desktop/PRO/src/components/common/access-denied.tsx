'use client';

import { Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AccessDeniedProps {
  reason?: string;
  requiredRole?: string;
  requiredPlan?: string;
  showUpgrade?: boolean;
  onUpgrade?: () => void;
}

export function AccessDenied({ 
  reason, 
  requiredRole, 
  requiredPlan,
  showUpgrade = false,
  onUpgrade 
}: AccessDeniedProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <Shield className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-xl">Access Denied</CardTitle>
          <CardDescription>
            {reason || 'You do not have permission to access this content'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(requiredRole || requiredPlan) && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              {requiredRole && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span>Required role: <strong className="capitalize">{requiredRole}</strong></span>
                </div>
              )}
              {requiredPlan && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span>Required plan: <strong className="capitalize">{requiredPlan}</strong></span>
                </div>
              )}
            </div>
          )}
          
          {showUpgrade && onUpgrade && (
            <Button onClick={onUpgrade} className="w-full">
              Upgrade Your Plan
            </Button>
          )}
          
          <Button variant="outline" className="w-full" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function UnauthorizedAccess() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <Shield className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-xl">Unauthorized</CardTitle>
          <CardDescription>
            Please log in to access this page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" onClick={() => window.location.href = '/'}>
            Go to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
