'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Loader2, TrendingUp, ArrowRight, RefreshCw, Zap, Users, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface Match {
  id: string;
  name: string;
  industry?: string;
  stage?: string;
  vision?: string;
  score: number;
  explanation: string;
  reasons: string[];
  fundingRound?: {
    name: string;
    target: number;
    raised: number;
    equity: number;
    valuation: number;
    minInvestment: number;
  };
}

interface AIMatchingPanelProps {
  type: 'talent-startup' | 'investor-startup';
  /** Optional callback when a match CTA is clicked */
  onConnect?: (matchId: string) => void;
}

export function AIMatchingPanel({ type, onConnect }: AIMatchingPanelProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchMatches = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ai/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (res.ok) {
        setMatches(data.matches || []);
      } else {
        setError(data.error || 'Failed to load matches');
      }
    } catch {
      setError('Failed to connect to AI service');
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  };

  useEffect(() => {
    fetchMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#eab308';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Low';
  };

  const title = type === 'talent-startup' ? 'AI-Matched Startups' : 'AI-Matched Opportunities';
  const icon = type === 'talent-startup' ? Building2 : TrendingUp;
  const Icon = icon;

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(46,139,87,0.15), rgba(0,71,171,0.1))' }}>
            <Sparkles className="h-4 w-4" style={{ color: '#2E8B57' }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-1.5">{title}</h3>
            <p className="text-xs text-muted-foreground">Powered by AlloySphere AI</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchMatches}
          disabled={loading}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Content */}
      <div className="p-5">
        {loading && !hasLoaded ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(46,139,87,0.1), rgba(0,71,171,0.08))' }}>
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#2E8B57' }} />
            </div>
            <p className="text-sm text-muted-foreground">AI is analyzing matches...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchMatches} className="mt-3">
              Try Again
            </Button>
          </div>
        ) : matches.length === 0 && hasLoaded ? (
          <div className="text-center py-8">
            <Icon className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No matches found yet. Check back as more startups join the platform.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match, idx) => (
              <div
                key={match.id}
                className="p-4 rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)] group"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  animationDelay: `${idx * 100}ms`,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold truncate">{match.name}</h4>
                      {match.industry && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                          {match.industry}
                        </Badge>
                      )}
                    </div>
                    {match.vision && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{match.vision}</p>
                    )}
                    <p className="text-xs leading-relaxed mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      {match.explanation}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {match.reasons.map((reason, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(46,139,87,0.08)', color: '#2E8B57', border: '1px solid rgba(46,139,87,0.15)' }}
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                    {match.fundingRound && (
                      <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>{match.fundingRound.name} Round</span>
                        <span>Target: ${match.fundingRound.target?.toLocaleString()}</span>
                        <span>Min: ${match.fundingRound.minInvestment?.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Score */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div
                      className="h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{
                        background: `conic-gradient(${getScoreColor(match.score)} ${match.score * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
                        color: getScoreColor(match.score),
                      }}
                    >
                      <div className="h-9 w-9 rounded-full flex items-center justify-center" style={{ background: 'var(--background, #0a0a0a)' }}>
                        {match.score}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{getScoreLabel(match.score)}</span>
                  </div>
                </div>

                {/* CTA */}
                {onConnect && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 w-full h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: '#2E8B57' }}
                    onClick={() => onConnect(match.id)}
                  >
                    View Details <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
