'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TrendingUp, PieChart, Activity, DollarSign, Loader2, Building2 } from 'lucide-react';
import { useAuthStore } from '@/store';
import { apiFetch } from '@/lib/api-client';
import { getInitials } from '@/lib/client-utils';
import { formatDistanceToNow } from 'date-fns';

export function PortfolioPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<{ metrics: any; investments: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPortfolio() {
      try {
        const res = await apiFetch('/api/investor/portfolio');
        if (res.ok) {
          const portfolioData = await res.json();
          setData(portfolioData);
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    }
    fetchPortfolio();
  }, []);

  if (!user || user.role !== 'investor') return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-700 ease-out">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-end border-b border-border/20 pb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <PieChart className="h-6 w-6 text-emerald-500" />
            Investment Portfolio
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your investments, equity distribution, and startup performance.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-muted-foreground">Total Invested</h3>
                  <div className="p-2 bg-emerald-500/20 rounded-full">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold">₹{data?.metrics?.totalInvested?.toLocaleString('en-IN') || '0'}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-muted-foreground">Startups Funded</h3>
                  <div className="p-2 bg-blue-500/20 rounded-full">
                    <Building2 className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold">{data?.metrics?.numberOfStartups || '0'}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-muted-foreground">Average Ticket Size</h3>
                  <div className="p-2 bg-purple-500/20 rounded-full">
                    <Activity className="h-4 w-4 text-purple-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold">₹{data?.metrics?.averageInvestmentSize?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || '0'}</p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed List */}
          <h2 className="text-xl font-bold mt-8 mb-4">Your Investments</h2>
          
          {data?.investments && data.investments.length > 0 ? (
            <div className="grid gap-4">
              {data.investments.map((inv) => (
                <Card key={inv._id} className="relative overflow-hidden group border-border/50 hover:border-border transition-colors">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border shadow-sm">
                          <AvatarImage src={inv.startupId?.logo} />
                          <AvatarFallback className="bg-primary/5 text-primary">
                            {getInitials(inv.startupId?.name || 'S')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-bold text-lg">{inv.startupId?.name}</h3>
                          <p className="text-sm text-muted-foreground capitalize">{inv.startupId?.industry} • {inv.startupId?.stage}</p>
                        </div>
                      </div>

                      <div className="flex md:flex-row flex-col gap-6 md:items-center">
                        <div>
                          <p className="text-sm text-muted-foreground">Invested</p>
                          <p className="font-bold">₹{inv.amountInvested.toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Equity</p>
                          <p className="font-bold">{inv.equityPercentage}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Valuation</p>
                          <p className="font-bold">₹{inv.valuationAtInvestment?.toLocaleString('en-IN') || 'Undisclosed'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground">Investment Date</p>
                          <p className="text-sm font-medium">{new Date(inv.investmentDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 border rounded-xl bg-card/30 backdrop-blur-md">
              <div className="bg-primary/5 h-16 w-16 mx-auto rounded-full flex items-center justify-center mb-4">
                <PieChart className="h-8 w-8 text-primary/40" />
              </div>
              <h3 className="text-lg font-medium mb-1">No investments found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                You haven't added any investments to your portfolio tracker yet. Start funding startups or input your offline investments.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
