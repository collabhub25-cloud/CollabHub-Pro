'use client';

import { useState, useEffect, useCallback } from 'react';
import { Check, Zap, Building2, Loader2, Crown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';

interface Plan {
  name: string;
  price: number;
  priceId?: string;
  features: {
    maxProjects: number;
    maxTeamMembers: number;
    profileBoost: boolean;
    advancedAnalytics: boolean;
    earlyDealAccess: boolean;
    prioritySupport: boolean;
  };
}

interface Subscription {
  plan: string;
  status: string;
  currentPeriodEnd?: string;
}

// Founder-only plans
const founderPlans: Record<string, Plan> = {
  free_founder: {
    name: 'Free',
    price: 0,
    features: {
      maxProjects: 1,
      maxTeamMembers: 5,
      profileBoost: false,
      advancedAnalytics: false,
      earlyDealAccess: false,
      prioritySupport: false,
    },
  },
  pro_founder: {
    name: 'Pro',
    price: 2900, // $29
    priceId: 'price_pro_founder_monthly',
    features: {
      maxProjects: 5,
      maxTeamMembers: 15,
      profileBoost: true,
      advancedAnalytics: true,
      earlyDealAccess: false,
      prioritySupport: false,
    },
  },
  scale_founder: {
    name: 'Scale',
    price: 9900, // $99
    priceId: 'price_scale_founder_monthly',
    features: {
      maxProjects: 20,
      maxTeamMembers: 50,
      profileBoost: true,
      advancedAnalytics: true,
      earlyDealAccess: true,
      prioritySupport: true,
    },
  },
  enterprise_founder: {
    name: 'Enterprise',
    price: 29900, // $299
    priceId: 'price_enterprise_founder_monthly',
    features: {
      maxProjects: -1,
      maxTeamMembers: -1,
      profileBoost: true,
      advancedAnalytics: true,
      earlyDealAccess: true,
      prioritySupport: true,
    },
  },
};

export function PricingPage() {
  const { user } = useAuthStore();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {

    try {
      const response = await fetch('/api/subscriptions', {
          credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const handleUpgrade = async (planKey: string) => {
    if ( planKey === 'free_founder') return;

    setProcessing(planKey);
    try {
      const response = await fetch('/api/stripe/checkout', {
          credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan: planKey }),
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.checkoutUrl;
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Failed to start checkout process');
    } finally {
      setProcessing(null);
    }
  };

  const handleManageSubscription = async () => {

    setProcessing('manage');
    try {
      const response = await fetch('/api/stripe/portal', {
          credentials: 'include',
        method: 'POST',
        
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.portalUrl;
      } else {
        toast.error('Failed to open billing portal');
      }
    } catch (error) {
      console.error('Error opening portal:', error);
      toast.error('Failed to open billing portal');
    } finally {
      setProcessing(null);
    }
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(0)}`;
  };

  // Non-founders see a free account message
  if (user && user.role !== 'founder') {
    return (
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Free Account</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {user.role === 'talent' 
              ? 'Talent accounts are completely free with full access to apply for jobs, message founders, and build alliances.'
              : user.role === 'investor'
              ? 'Investor accounts are completely free with full access to deal flow, messaging, and alliance features.'
              : 'Your account has full access to all features for free.'}
          </p>
        </div>

        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Free</CardTitle>
            <CardDescription>
              Full access, no payment required
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">Unlimited messaging</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">Profile visibility</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">Alliance building</span>
              </div>
              {user.role === 'talent' && (
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Apply to unlimited jobs</span>
                </div>
              )}
              {user.role === 'investor' && (
                <>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Full deal flow access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Early deal notifications</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" disabled>
              <Check className="h-4 w-4 mr-2" />
              Current Plan
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Founder view - show pricing plans
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Choose Your Plan</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Select the perfect plan for your startup. Upgrade anytime to unlock more features.
        </p>
      </div>

      {/* Current Subscription Status */}
      {subscription && subscription.plan !== 'free_founder' && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Crown className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Current Plan: {subscription.plan.replace('_founder', '').toUpperCase()}</h3>
                <p className="text-sm text-muted-foreground">
                  Status: <span className="capitalize">{subscription.status}</span>
                  {subscription.currentPeriodEnd && (
                    <> · Renews: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</>
                  )}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleManageSubscription} disabled={processing === 'manage'}>
              {processing === 'manage' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Manage Subscription'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Plan Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(founderPlans).map(([key, plan]) => {
          const isCurrentPlan = subscription?.plan === key;
          const isPopular = key === 'pro_founder';

          return (
            <Card 
              key={key} 
              className={`relative ${isPopular ? 'border-primary shadow-lg' : ''} ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}
            >
              {isPopular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most Popular
                </Badge>
              )}
              {isCurrentPlan && (
                <Badge variant="secondary" className="absolute -top-3 right-4">
                  Current Plan
                </Badge>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold">{formatPrice(plan.price)}</span>
                  <span className="text-muted-foreground">/month</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Check className={`h-4 w-4 ${plan.features.maxProjects > 0 ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <span className="text-sm">
                      {plan.features.maxProjects === -1 ? 'Unlimited' : plan.features.maxProjects} active projects
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className={`h-4 w-4 ${plan.features.maxTeamMembers > 0 ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <span className="text-sm">
                      {plan.features.maxTeamMembers === -1 ? 'Unlimited' : plan.features.maxTeamMembers} team members
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className={`h-4 w-4 ${plan.features.profileBoost ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <span className="text-sm">Profile boost</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className={`h-4 w-4 ${plan.features.advancedAnalytics ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <span className="text-sm">Advanced analytics</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className={`h-4 w-4 ${plan.features.earlyDealAccess ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <span className="text-sm">Early deal access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className={`h-4 w-4 ${plan.features.prioritySupport ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <span className="text-sm">Priority support</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                {isCurrentPlan ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : key === 'free_founder' ? (
                  <Button variant="outline" className="w-full" disabled={subscription?.plan !== 'free_founder'}>
                    {subscription?.plan === 'free_founder' ? 'Current Plan' : 'Downgrade'}
                  </Button>
                ) : (
                  <Button 
                    className="w-full" 
                    onClick={() => handleUpgrade(key)}
                    disabled={processing === key}
                  >
                    {processing === key ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Upgrade
                      </>
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
