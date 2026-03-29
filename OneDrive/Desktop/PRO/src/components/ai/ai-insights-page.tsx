'use client';

import { useAuthStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Target, UserPlus, Sparkles, AlertCircle } from 'lucide-react';
import { AIAnalyticsPanel } from '@/components/ai/ai-analytics-panel';
import { AIMatchingPanel } from '@/components/ai/ai-matching-panel';
import { getInitials } from '@/lib/client-utils';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';

export function AiInsightsPage() {
  const { user } = useAuthStore();
  const [recommendations, setRecommendations] = useState<any>({ talent: [], investors: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (user?.role === 'founder') {
        try {
          const [talentRes, investRes] = await Promise.all([
            apiFetch('/api/search/talents?limit=5'),
            apiFetch('/api/search/investors?limit=5')
          ]);
          setRecommendations({
            talent: talentRes.ok ? await talentRes.json() : [],
            investors: investRes.ok ? await investRes.json() : []
          });
        } catch (e) {
          console.error(e);
        }
      }
      setLoading(false);
    }
    fetchData();
  }, [user]);

  if (!user) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex flex-col gap-2 border-b border-border/20 pb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-purple-500" />
          AI Intelligence Hub
        </h1>
        <p className="text-muted-foreground">
          Your centralized command center for predictive analytics, smart matching, and data-driven insights.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <AIAnalyticsPanel role={user.role as any} />
          
          {user.role === 'investor' && (
            <AIMatchingPanel type="investor-startup" />
          )}
          {user.role === 'talent' && (
            <AIMatchingPanel type="talent-startup" />
          )}
        </div>

        {user.role === 'founder' && (
          <div className="lg:col-span-4 space-y-6">
            <Card className="bg-background/60 backdrop-blur-xl border-border/40 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
              <CardHeader className="pb-2 pt-5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500">
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-sm font-bold uppercase tracking-wide">Suggested Talent</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {!loading && recommendations.talent && Array.isArray(recommendations.talent) && recommendations.talent.length > 0 ? (
                  <div className="space-y-4">
                    {recommendations.talent.map((talent: any) => (
                      <div key={talent._id} className="p-3 rounded-xl bg-muted/40 hover:bg-muted/80 transition-colors border border-border/30 cursor-pointer group">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8 border border-border/50">
                              <AvatarImage src={talent.avatar} />
                              <AvatarFallback className="text-xs bg-primary/5">{getInitials(talent.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-semibold leading-tight">{talent.name}</p>
                              <p className="text-[10px] text-muted-foreground">{talent.role || 'Talent'}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {talent.skills?.slice(0, 3).map((skill: string) => (
                            <span key={skill} className="text-[9px] px-1.5 py-0.5 rounded-sm bg-background border border-border/50 text-muted-foreground">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground py-4 text-center">No talent loaded</div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-background/60 backdrop-blur-xl border-border/40 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
              <CardHeader className="pb-2 pt-5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500">
                    <Target className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-sm font-bold uppercase tracking-wide">Target Investors</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {!loading && recommendations.investors && Array.isArray(recommendations.investors) && recommendations.investors.length > 0 ? (
                  <div className="space-y-4">
                    {recommendations.investors.map((investor: any) => (
                      <div key={investor._id} className="p-3 rounded-xl bg-muted/40 hover:bg-muted/80 transition-colors border border-border/30 cursor-pointer group">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8 border border-border/50">
                              <AvatarImage src={investor.avatar} />
                              <AvatarFallback className="text-xs bg-emerald-500/10 text-emerald-600">{getInitials(investor.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-semibold leading-tight">{investor.name}</p>
                              <p className="text-[10px] text-muted-foreground">{investor.role || 'Investor'}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {investor.sectors?.slice(0, 2).map((sector: string) => (
                            <span key={sector} className="text-[9px] px-1.5 py-0.5 rounded-sm bg-background border border-border/50 text-muted-foreground">
                              {sector}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground py-4 text-center">No investors loaded</div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
