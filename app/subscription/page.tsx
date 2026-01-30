'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, TrendingUp, Zap, Crown } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

const pricingPlans = [
  {
    name: 'Basic',
    price: '$0',
    period: 'forever',
    description: 'Perfect for getting started with market insights',
    icon: TrendingUp,
    features: [
      '5 stock profile views per month',
      'Real-time market overview',
      'Basic stock search',
      'Daily economic indicators',
      'Crypto prices (delayed 15 min)',
      'Market heatmap',
      'Community support',
    ],
    cta: 'Get Started',
    popular: false,
    currentPlan: true,
  },
  {
    name: 'Pro',
    price: '$7.99',
    period: 'per month',
    description: 'Advanced tools for serious traders and investors',
    icon: Zap,
    features: [
      '30 stock profile views per month',
      'Everything in Basic, plus:',
      'Real-time crypto prices',
      'Advanced technical indicators',
      'AI-powered stock analysis',
      'Unlimited watchlist',
      'Earnings calendar with alerts',
      'Fear & Greed Index insights',
      'Fed rate predictions',
      'Priority email support',
      'Ad-free experience',
    ],
    cta: 'Upgrade to Pro',
    popular: true,
    currentPlan: false,
  },
  {
    name: 'Ultimate',
    price: '$14.88',
    period: 'per month',
    description: 'Unlimited access for power users and professionals',
    icon: Crown,
    features: [
      'Unlimited stock profile views',
      'Everything in Pro, plus:',
      'API access',
      'Export data to CSV',
      'Advanced portfolio analytics',
      'Custom data feeds',
      'Priority support',
      'Early access to new features',
      'Custom alerts & notifications',
      'Advanced charting tools',
    ],
    cta: 'Get Ultimate',
    popular: false,
    currentPlan: false,
  },
];

export default function SubscriptionPage() {
  return (
    <main id="main-content" className="min-h-screen bg-background" tabIndex={-1}>
      <div className="container mx-auto px-4 py-12 max-w-[1400px]">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Link 
              href="/" 
              className="text-sm text-secondary hover:text-primary transition-colors"
            >
              ← Back to Dashboard
            </Link>
            <ThemeToggle />
          </div>
          <h1 className="text-5xl font-light text-foreground mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-secondary max-w-2xl mx-auto">
            Unlock powerful market insights and analytics to make smarter investment decisions
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {pricingPlans.map((plan) => {
            const Icon = plan.icon;
            return (
              <Card
                key={plan.name}
                className={`relative flex flex-col ${
                  plan.popular
                    ? 'border-2 border-primary shadow-lg shadow-primary/20'
                    : 'border-border'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                <CardHeader className="pb-8">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${
                      plan.popular ? 'bg-primary/20' : 'bg-muted'
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        plan.popular ? 'text-primary' : 'text-secondary'
                      }`} />
                    </div>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  </div>
                  <CardDescription className="text-base">
                    {plan.description}
                  </CardDescription>
                  <div className="mt-4">
                    <span className="text-5xl font-light text-foreground">
                      {plan.price}
                    </span>
                    <span className="text-secondary ml-2">
                      {plan.period}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="flex-grow">
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className={`text-sm ${
                          feature.endsWith('plus:') 
                            ? 'text-secondary font-medium' 
                            : 'text-foreground'
                        }`}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="pt-6">
                  <Button
                    className={`w-full ${
                      plan.currentPlan
                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                        : plan.popular
                        ? 'bg-primary hover:bg-primary/90'
                        : 'bg-card hover:bg-muted border border-border'
                    }`}
                    disabled={plan.currentPlan}
                  >
                    {plan.currentPlan ? 'Current Plan' : plan.cta}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-light text-foreground mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I change plans later?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-secondary">
                  Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, 
                  and we&apos;ll prorate any charges or credits.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What payment methods do you accept?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-secondary">
                  We accept all major credit cards (Visa, Mastercard, American Express), PayPal, 
                  and wire transfers for Enterprise plans.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Is there a free trial?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-secondary">
                  Our Basic plan is available forever with no credit card required. For Pro and Ultimate plans, 
                  we offer a 14-day money-back guarantee.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What counts as a stock profile view?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-secondary">
                  Each time you open a detailed stock profile page, it counts as one view. Your view count 
                  resets at the start of each billing cycle. Dashboard data and market overviews don&apos;t count 
                  toward your limit.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Contact Section */}
        <div className="mt-16 text-center">
          <Card className="max-w-2xl mx-auto bg-primary/10 border-primary/20">
            <CardHeader>
              <CardTitle className="text-2xl">Need a Custom Solution?</CardTitle>
              <CardDescription className="text-base">
                We offer tailored solutions for financial institutions, hedge funds, and large organizations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="bg-primary hover:bg-primary/90">
                Contact Our Sales Team
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-border">
          <div className="text-center text-sm text-secondary">
            <p>All plans include access to our market dashboard and basic analytics</p>
            <p className="mt-2">Questions? Email us at support@stonkscan.com</p>
          </div>
        </footer>
      </div>
    </main>
  );
}

