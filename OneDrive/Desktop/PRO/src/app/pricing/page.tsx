'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Check, Zap, Rocket, Crown, Star, Shield, BarChart3,
  Users, Brain, MessageCircle, ArrowRight, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRazorpayCheckout, type RazorpaySuccessResponse } from '@/components/payments/razorpay-checkout';
import { PaymentStatus } from '@/components/payments/payment-status';
import { useAuthStore } from '@/store';
import { apiFetch } from '@/lib/api-fetch';
import { toast } from 'sonner';
import Link from 'next/link';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '₹0',
    period: 'forever',
    description: 'Get started with basic features',
    icon: Shield,
    gradient: 'from-slate-500 to-slate-600',
    shadowColor: 'shadow-slate-500/20',
    features: [
      'Basic startup profile',
      'Limited visibility in search',
      'Up to 5 team members',
      '10 alliance connections',
      'Community messaging',
    ],
    notIncluded: [
      'AI market reports',
      'Mentor access',
      'Boosted visibility',
      'Priority investor matching',
      'Advanced analytics',
    ],
    cta: 'Current Plan',
    disabled: true,
  },
  {
    id: 'profile',
    name: 'Founder Profile',
    price: '₹499',
    period: 'one-time',
    description: 'Unlock startup creation',
    icon: Rocket,
    gradient: 'from-indigo-500 to-violet-600',
    shadowColor: 'shadow-indigo-500/25',
    popular: false,
    features: [
      'Create startup profile',
      'Add up to 5 team members',
      'Standard search visibility',
      'Basic investor matching',
      'Community messaging',
    ],
    notIncluded: [
      'AI market reports',
      'Mentor access',
      'Boosted visibility',
      'Priority investor matching',
    ],
    cta: 'Pay ₹499',
    purpose: 'founder_profile' as const,
  },
  {
    id: 'boost',
    name: 'Startup Boost',
    price: '₹1,999',
    period: '/month',
    description: 'Maximum visibility & tools',
    icon: Crown,
    gradient: 'from-amber-500 to-orange-600',
    shadowColor: 'shadow-amber-500/25',
    popular: true,
    features: [
      'Everything in Founder Profile',
      '⚡ Boosted in AI recommendations',
      '"Boosted" badge in listings',
      'Featured in investor dashboards',
      'AI market validation reports',
      'Mentor session access',
      'Advanced analytics dashboard',
      'Priority investor matching',
      'Up to 15 team members',
      '50 alliance connections',
    ],
    notIncluded: [],
    cta: 'Start Boost',
    purpose: 'boost_subscription' as const,
  },
];

const faqs = [
  {
    q: 'What payment methods are supported?',
    a: 'We support UPI (Google Pay, PhonePe, Paytm), credit/debit cards, net banking, and wallets via Razorpay.',
  },
  {
    q: 'Can I cancel my subscription?',
    a: 'Yes! You can cancel anytime. Your boost remains active until the end of your billing cycle, plus a 3-day grace period.',
  },
  {
    q: 'What is the ₹499 profile fee?',
    a: 'It\'s a one-time fee to create your startup profile on AlloySphere. This includes setting up your startup, adding team members, and getting listed for investors.',
  },
  {
    q: 'How does the AI boost work?',
    a: 'Boosted startups get a ~12% score uplift in AI-powered investor recommendations. This increases your visibility while maintaining fair organic matching.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Currently, we offer a free tier with basic features. You can upgrade to Startup Boost anytime to unlock premium features.',
  },
];

export default function PricingPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { openCheckout } = useRazorpayCheckout();
  const [loading, setLoading] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'failure' | 'processing' | null>(null);
  const [paymentMeta, setPaymentMeta] = useState<{ amount?: number; purpose?: string; error?: string }>({});

  const handlePayment = async (purpose: 'founder_profile' | 'boost_subscription') => {
    if (!isAuthenticated) {
      toast.error('Please log in to continue');
      router.push('/login');
      return;
    }

    // Prevent double-clicks
    if (loading) return;
    setLoading(purpose);

    try {
      // Create order
      const res = await apiFetch('/api/payments/create-order', {
        method: 'POST',
        body: JSON.stringify({ purpose }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle 409 gracefully — user already paid or has startup
        if (res.status === 409) {
          if (data.code === 'GRANDFATHERED') {
            toast.success('You already have a startup — no payment needed!');
            router.push('/dashboard/founder');
          } else if (data.code === 'ALREADY_PAID') {
            toast.success('Already paid! You can create your startup now.');
            router.push('/dashboard/founder');
          } else {
            toast.info(data.error || 'Payment already in progress');
          }
        } else {
          toast.error(data.error || 'Failed to create payment');
        }
        setLoading(null);
        return;
      }

      // Open Razorpay Checkout — DON'T clear loading until dismissed
      openCheckout({
        orderId: data.orderId,
        amount: data.amount,
        description: purpose === 'founder_profile' ? 'Founder Profile Creation (₹499)' : 'Startup Boost Subscription (₹1,999/mo)',
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        onSuccess: async (response: RazorpaySuccessResponse) => {
          setPaymentStatus('processing');
          setPaymentMeta({ amount: data.amount, purpose });
          setLoading(null);

          // Verify payment server-side
          try {
            const verifyRes = await apiFetch('/api/payments/verify', {
              method: 'POST',
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              setPaymentStatus('success');
            } else {
              setPaymentStatus('failure');
              setPaymentMeta(prev => ({ ...prev, error: verifyData.error }));
            }
          } catch {
            setPaymentStatus('failure');
            setPaymentMeta(prev => ({ ...prev, error: 'Verification failed. Contact support if amount was deducted.' }));
          }
        },
        onFailure: (error: any) => {
          setLoading(null);
          setPaymentStatus('failure');
          setPaymentMeta({ amount: data.amount, purpose, error: error?.description || 'Payment failed. Please try again.' });
        },
        onDismiss: () => {
          setLoading(null);
        },
      });
    } catch (error) {
      toast.error('Network error. Please check your connection and try again.');
      setLoading(null);
    }
  };

  // Show payment status screen
  if (paymentStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <PaymentStatus
          status={paymentStatus}
          amount={paymentMeta.amount}
          purpose={paymentMeta.purpose}
          errorMessage={paymentMeta.error}
          onRetry={() => setPaymentStatus(null)}
          onContinue={() => router.push('/dashboard/founder')}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-16">
        {/* Background effects */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-indigo-500/10 via-violet-500/5 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-20 left-20 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-20 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              India-first payments • UPI • Cards • Net Banking
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              Invest in Your{' '}
              <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-amber-500 bg-clip-text text-transparent">
                Startup&apos;s Growth
              </span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Unlock premium features to boost your visibility, access AI insights,
              connect with mentors, and get priority investor matching.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative rounded-2xl border ${
                plan.popular
                  ? 'border-amber-500/40 shadow-xl shadow-amber-500/10'
                  : 'border-border/50 shadow-lg shadow-black/5'
              } bg-card/80 backdrop-blur-sm overflow-hidden`}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute top-0 right-0">
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-4 py-1 rounded-bl-lg">
                    MOST POPULAR
                  </div>
                </div>
              )}

              <div className="p-6 lg:p-8">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center shadow-lg ${plan.shadowColor}`}>
                    <plan.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground">{plan.description}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground ml-1">{plan.period}</span>
                </div>

                {/* CTA */}
                <Button
                  className={`w-full mb-6 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white'
                      : plan.disabled
                        ? ''
                        : 'bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white'
                  }`}
                  disabled={plan.disabled || loading === plan.purpose}
                  onClick={() => plan.purpose && handlePayment(plan.purpose)}
                >
                  {loading === plan.purpose ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {plan.cta}
                      {!plan.disabled && <ArrowRight className="h-4 w-4" />}
                    </span>
                  )}
                </Button>

                {/* Features */}
                <div className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                  {plan.notIncluded.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2.5 opacity-40">
                      <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span className="text-sm line-through">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold text-center mb-10">
          Why Upgrade to Startup Boost?
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Zap, title: 'AI Boost', desc: '12% visibility uplift in investor recommendations', color: 'text-amber-500' },
            { icon: BarChart3, title: 'Market Reports', desc: 'AI-generated market size, competitor analysis & validation scores', color: 'text-indigo-500' },
            { icon: Brain, title: 'Mentor Access', desc: 'Book paid sessions with industry experts and mentors', color: 'text-violet-500' },
            { icon: Users, title: 'Priority Matching', desc: 'Get featured in investor dashboards with the Boosted badge', color: 'text-emerald-500' },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="p-6 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-md transition-shadow"
            >
              <feature.icon className={`h-8 w-8 ${feature.color} mb-3`} />
              <h3 className="font-semibold mb-1">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold text-center mb-10">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <motion.details
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              className="group rounded-lg border border-border/50 bg-card/50 open:shadow-md transition-shadow"
            >
              <summary className="px-6 py-4 cursor-pointer font-medium list-none flex items-center justify-between">
                {faq.q}
                <span className="text-muted-foreground group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-6 pb-4 text-sm text-muted-foreground">
                {faq.a}
              </div>
            </motion.details>
          ))}
        </div>
      </section>

      {/* Back to home */}
      <div className="text-center pb-12">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to AlloySphere
        </Link>
      </div>
    </div>
  );
}
