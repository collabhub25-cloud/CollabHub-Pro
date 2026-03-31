'use client';

import { useAuthStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, UserPlus, Sparkles, Briefcase, Building2, TrendingUp, RefreshCw, Loader2, Zap } from 'lucide-react';
import { AIAnalyticsPanel } from '@/components/ai/ai-analytics-panel';
import { getInitials } from '@/lib/client-utils';
import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api-client';

interface Recommendation {
  id: string;
  name: string;
  subtitle?: string;
  score: number;
  explanation: string;
  tags: string[];
  metadata?: Record<string, any>;
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? 'text-green-500 bg-green-500/10 border-green-500/20'
    : score >= 40 ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
    : 'text-orange-500 bg-orange-500/10 border-orange-500/20';
  
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full border ${color}`}>
      {score}%
    </span>
  );
}

function RecommendationCard({ item, icon: Icon, accentFrom, accentTo }: { 
  item: Recommendation; 
  icon: any;
  accentFrom: string;
  accentTo: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-muted/30 hover:bg-muted/60 transition-all duration-200 border border-border/30 hover:border-border/50 hover:-translate-y-0.5 hover:shadow-md group cursor-pointer">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${accentFrom}, ${accentTo})` }}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight truncate">{item.name}</p>
            {item.subtitle && (
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{item.subtitle}</p>
            )}
          </div>
        </div>
        <ScoreBadge score={item.score} />
      </div>
      
      <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1.5">
        <Zap className="h-3 w-3 text-purple-400 shrink-0 mt-0.5" />
        {item.explanation}
      </p>

      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {item.tags.slice(0, 4).map((tag: string, i: number) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-background border border-border/50 text-muted-foreground capitalize">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function RecommendationPanel({ 
  title, 
  icon: Icon, 
  items, 
  loading, 
  error, 
  onRefresh, 
  accentFrom, 
  accentTo,
  emptyMessage,
  itemIcon,
}: {
  title: string;
  icon: any;
  items: Recommendation[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
  accentFrom: string;
  accentTo: string;
  emptyMessage: string;
  itemIcon: any;
}) {
  return (
    <Card className="bg-background/60 backdrop-blur-xl border-border/40 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 w-full h-1" style={{ background: `linear-gradient(to right, ${accentFrom}, ${accentTo})` }}></div>
      <CardHeader className="pb-2 pt-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md" style={{ background: `${accentFrom}15`, color: accentFrom }}>
              <Icon className="h-4 w-4" />
            </div>
            <CardTitle className="text-sm font-bold uppercase tracking-wide">{title}</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading} className="h-7 w-7 p-0">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: accentFrom }} />
            <p className="text-xs text-muted-foreground">Analyzing matches...</p>
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={onRefresh} className="mt-3">Retry</Button>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Icon className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{emptyMessage}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <RecommendationCard 
                key={item.id} 
                item={item} 
                icon={itemIcon} 
                accentFrom={accentFrom} 
                accentTo={accentTo} 
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AiInsightsPage() {
  const { user } = useAuthStore();
  const [jobRecs, setJobRecs] = useState<Recommendation[]>([]);
  const [startupRecs, setStartupRecs] = useState<Recommendation[]>([]);
  const [talentRecs, setTalentRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState({ jobs: true, startups: true, talents: true });
  const [errors, setErrors] = useState({ jobs: '', startups: '', talents: '' });

  const fetchJobRecs = useCallback(async () => {
    setLoading(prev => ({ ...prev, jobs: true }));
    setErrors(prev => ({ ...prev, jobs: '' }));
    try {
      const res = await apiFetch('/api/ai/recommendations/jobs');
      if (res.ok) {
        const data = await res.json();
        setJobRecs(data.recommendations || []);
      } else {
        setErrors(prev => ({ ...prev, jobs: 'Failed to load job recommendations' }));
      }
    } catch {
      setErrors(prev => ({ ...prev, jobs: 'Connection error' }));
    } finally {
      setLoading(prev => ({ ...prev, jobs: false }));
    }
  }, []);

  const fetchStartupRecs = useCallback(async () => {
    setLoading(prev => ({ ...prev, startups: true }));
    setErrors(prev => ({ ...prev, startups: '' }));
    try {
      const res = await apiFetch('/api/ai/recommendations/startups');
      if (res.ok) {
        const data = await res.json();
        setStartupRecs(data.recommendations || []);
      } else {
        setErrors(prev => ({ ...prev, startups: 'Failed to load startup recommendations' }));
      }
    } catch {
      setErrors(prev => ({ ...prev, startups: 'Connection error' }));
    } finally {
      setLoading(prev => ({ ...prev, startups: false }));
    }
  }, []);

  const fetchTalentRecs = useCallback(async () => {
    setLoading(prev => ({ ...prev, talents: true }));
    setErrors(prev => ({ ...prev, talents: '' }));
    try {
      const res = await apiFetch('/api/ai/recommendations/talents');
      if (res.ok) {
        const data = await res.json();
        setTalentRecs(data.recommendations || []);
      } else {
        setErrors(prev => ({ ...prev, talents: 'Failed to load talent recommendations' }));
      }
    } catch {
      setErrors(prev => ({ ...prev, talents: 'Connection error' }));
    } finally {
      setLoading(prev => ({ ...prev, talents: false }));
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'talent') fetchJobRecs();
    if (user.role === 'investor') fetchStartupRecs();
    if (user.role === 'founder') {
      fetchTalentRecs();
      fetchStartupRecs();
    }
  }, [user, fetchJobRecs, fetchStartupRecs, fetchTalentRecs]);

  if (!user) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex flex-col gap-2 border-b border-border/20 pb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-purple-500" />
          AI Intelligence Hub
        </h1>
        <p className="text-muted-foreground">
          Personalized recommendations powered by real-time skill matching and data analysis.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <AIAnalyticsPanel role={user.role as any} />
        </div>

        <div className="lg:col-span-4 space-y-6">
          {/* Talent → Job Recommendations */}
          {user.role === 'talent' && (
            <RecommendationPanel
              title="Recommended Jobs"
              icon={Briefcase}
              items={jobRecs}
              loading={loading.jobs}
              error={errors.jobs}
              onRefresh={fetchJobRecs}
              accentFrom="#7C3AED"
              accentTo="#6366F1"
              emptyMessage="No job matches found yet. Add more skills to your profile."
              itemIcon={Briefcase}
            />
          )}

          {/* Investor → Startup Recommendations */}
          {user.role === 'investor' && (
            <RecommendationPanel
              title="Recommended Startups"
              icon={TrendingUp}
              items={startupRecs}
              loading={loading.startups}
              error={errors.startups}
              onRefresh={fetchStartupRecs}
              accentFrom="#2E8B57"
              accentTo="#0047AB"
              emptyMessage="No startup matches found. Update your investment preferences."
              itemIcon={Building2}
            />
          )}

          {/* Founder → Talent + Startup Recommendations */}
          {user.role === 'founder' && (
            <>
              <RecommendationPanel
                title="Suggested Talent"
                icon={UserPlus}
                items={talentRecs}
                loading={loading.talents}
                error={errors.talents}
                onRefresh={fetchTalentRecs}
                accentFrom="#3B82F6"
                accentTo="#06B6D4"
                emptyMessage="No talent matches yet. Add job listings to get matches."
                itemIcon={UserPlus}
              />
              <RecommendationPanel
                title="Target Investors"
                icon={Target}
                items={startupRecs}
                loading={loading.startups}
                error={errors.startups}
                onRefresh={fetchStartupRecs}
                accentFrom="#10B981"
                accentTo="#14B8A6"
                emptyMessage="No investor matches found yet."
                itemIcon={TrendingUp}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
