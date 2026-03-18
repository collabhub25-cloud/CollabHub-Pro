import { useState, useEffect, useCallback } from 'react';
import { Check, Loader2, Crown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store';
import { toast } from 'sonner';
import { Pricing } from '@/components/ui/pricing';

// Load Razorpay Script dynamically
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

interface Subscription {
  plan: string;
  status: string;
  currentPeriodEnd?: string;
}

// Map founder plans to PricingPlan format for the new Pricing component
const founderPricingPlans = [
  {
    name: "PRO",
    price: "2499",
    yearlyPrice: "1999",
    period: "per month",
    features: [
      "5 active projects",
      "15 team members",
      "Profile boost",
      "Advanced analytics",
      "Email support",
    ],
    description: "Great for early-stage founders building their first startup",
    buttonText: "Upgrade to Pro",
    href: "/sign-up",
    isPopular: false,
    planKey: "pro_founder",
  },
  {
    name: "SCALE",
    price: "8499",
    yearlyPrice: "6799",
    period: "per month",
    features: [
      "20 active projects",
      "50 team members",
      "Profile boost",
      "Advanced analytics",
      "Early deal access",
      "Priority support",
      "Team collaboration",
    ],
    description: "Ideal for growing teams and scaling startups",
    buttonText: "Get Started",
    href: "/sign-up",
    isPopular: true,
    planKey: "scale_founder",
  },
  {
    name: "ENTERPRISE",
    price: "24999",
    yearlyPrice: "19999",
    period: "per month",
    features: [
      "Unlimited projects",
      "Unlimited team members",
      "Profile boost",
      "Advanced analytics",
      "Early deal access",
      "Priority support",
      "Custom integrations",
      "Dedicated account manager",
    ],
    description: "For large organizations with specific needs",
    buttonText: "Contact Sales",
    href: "/contact",
    isPopular: false,
    planKey: "enterprise_founder",
  },
];

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
    // The new Pricing component doesn't offer a 'free_founder' option for upgrade,
    // so this check might be less relevant if only paid plans are presented.
    // However, keeping it for robustness.
    if (planKey === 'free_founder') return;
    setProcessing(planKey);

    const res = await loadRazorpayScript();
    if (!res) {
      toast.error('Razorpay SDK failed to load. Are you online?');
      setProcessing(null);
      return;
    }

    try {
      const orderResp = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey, billingCycle: isMonthly ? 'monthly' : 'yearly' }),
      });
      const orderData = await orderResp.json();

      if (!orderData.success) {
        toast.error(orderData.error || 'Failed to initialize payment');
        setProcessing(null);
        return;
      }

      const planDisplayName = orderData.planName || planKey.replace('_founder', '').toUpperCase();
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "AlloySphere",
        description: `${planDisplayName} Subscription (${isMonthly ? 'Monthly' : 'Yearly'})`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            const verifyResp = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                planKey,
                billingCycle: isMonthly ? 'monthly' : 'yearly',
                amount: orderData.amount,
              })
            });
            const verifyData = await verifyResp.json();

            if (verifyData.success) {
              toast.success('Subscription upgraded successfully!');
              fetchSubscription();
              window.location.reload();
            } else {
              toast.error(verifyData.error || 'Payment verification failed');
            }
          } catch (err) {
            toast.error('Error verifying payment');
          }
        },
        theme: { color: "#10b981" }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        toast.error(response.error?.description || 'Payment Failed');
      });
      rzp.open();

    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout process');
    } finally {
      setProcessing(null);
    }
  };

  const handleManageSubscription = async () => {
    toast.error('Account portal management is currently being migrated.');
  };

  // Track billing toggle state
  const [isMonthly, setIsMonthly] = useState(true);

  // Handle plan selection from the new Pricing component
  const handlePlanSelect = (plan: { name: string; href: string }, isMonthlyBilling: boolean) => {
    setIsMonthly(isMonthlyBilling);
    // Map plan name back to plan key
    const selected = founderPricingPlans.find(p => p.name === plan.name);
    if (selected) {
      handleUpgrade(selected.planKey);
    }
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

  // Founder view - show animated pricing plans
  return (
    <div className="space-y-8">
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

      {/* Animated Pricing Component */}
      <Pricing
        plans={founderPricingPlans}
        title="Choose Your Plan"
        description={`Select the perfect plan for your startup.\nUpgrade anytime to unlock more features and scale your team.`}
        onPlanSelect={handlePlanSelect}
      />
    </div>
  );
}
