'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles, Loader2, TrendingUp, TrendingDown, Minus,
  Brain, Target, Lightbulb, AlertTriangle, CheckCircle2, Info, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { apiFetch } from '@/lib/api-client';

interface Insight {
  title: string;
  description: string;
  type: 'positive' | 'warning' | 'info';
}

interface Prediction {
  metric: string;
  value: string;
  trend: 'up' | 'down' | 'stable';
}

interface AnalyticsData {
  successScore?: number;
  productivityScore?: number;
  roiPrediction?: number;
  insights: Insight[];
  predictions: Prediction[];
  recommendations: string[];
  data?: Record<string, any>;
}

interface AIAnalyticsPanelProps {
  /** Controls which primary score to show (founder=success, talent=productivity, investor=roi) */
  role: 'founder' | 'talent' | 'investor';
}

export function AIAnalyticsPanel({ role }: AIAnalyticsPanelProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/ai/analytics');
      const data = await res.json();
      if (res.ok) {
        setAnalytics(data.analytics);
      } else {
        setError(data.error || 'Failed to load analytics');
      }
    } catch {
      setError('Failed to connect to AI analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [role]);

  const getPrimaryScore = () => {
    if (!analytics) return 0;
    if (role === 'founder') return analytics.successScore || 0;
    if (role === 'talent') return analytics.productivityScore || 0;
    if (role === 'investor') return analytics.roiPrediction || 0;
    return 0;
  };

  const getPrimaryLabel = () => {
    if (role === 'founder') return 'Success Score';
    if (role === 'talent') return 'Productivity Score';
    if (role === 'investor') return 'ROI Prediction';
    return 'Score';
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return '#22c55e';
    if (score >= 40) return '#eab308';
    return '#ef4444';
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="h-3.5 w-3.5 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
    return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const getInsightIcon = (type: string) => {
    if (type === 'positive') return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (type === 'warning') return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <Info className="h-4 w-4 text-blue-400" />;
  };

  const score = getPrimaryScore();

  return (
    <div className="space-y-4">
      {/* Primary Score Card */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(46,139,87,0.15), rgba(0,71,171,0.1))' }}>
              <Brain className="h-4 w-4" style={{ color: '#2E8B57' }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold">AI Analytics</h3>
              <p className="text-xs text-muted-foreground">Powered by AlloySphere AI</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchAnalytics} disabled={loading} className="h-8 w-8 p-0">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="p-5">
          {loading && !analytics ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#2E8B57' }} />
              <p className="text-sm text-muted-foreground">Generating AI insights...</p>
            </div>
          ) : error && !analytics ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchAnalytics} className="mt-3">Retry</Button>
            </div>
          ) : analytics ? (
            <div className="space-y-5">
              {/* Score Ring */}
              <div className="flex items-center gap-6">
                <div className="relative h-20 w-20 shrink-0">
                  <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={getScoreColor(score)}
                      strokeWidth="3"
                      strokeDasharray={`${score}, 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold" style={{ color: getScoreColor(score) }}>{score}</span>
                    <span className="text-[9px] text-muted-foreground">/ 100</span>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold">{getPrimaryLabel()}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {score >= 70 ? 'Strong performance indicators' : score >= 40 ? 'Room for improvement' : 'Needs attention'}
                  </p>
                </div>
              </div>

              {/* Predictions */}
              {analytics.predictions.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Predictions</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {analytics.predictions.map((pred, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-muted-foreground">{pred.metric}</span>
                          {getTrendIcon(pred.trend)}
                        </div>
                        <span className="text-sm font-semibold">{pred.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Insights Card */}
      {analytics && analytics.insights.length > 0 && (
        <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Target className="h-4 w-4" style={{ color: '#2E8B57' }} />
            AI Insights
          </h4>
          <div className="space-y-2.5">
            {analytics.insights.map((insight, i) => (
              <div
                key={i}
                className="flex gap-3 p-3 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {getInsightIcon(insight.type)}
                <div>
                  <p className="text-xs font-semibold">{insight.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations Card */}
      {analytics && analytics.recommendations.length > 0 && (
        <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4" style={{ color: '#eab308' }} />
            Recommendations
          </h4>
          <div className="space-y-2">
            {analytics.recommendations.map((rec, i) => (
              <div
                key={i}
                className="flex gap-2.5 items-start p-2.5 rounded-lg text-xs"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span className="h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold" style={{ background: 'rgba(46,139,87,0.1)', color: '#2E8B57' }}>
                  {i + 1}
                </span>
                <span className="text-muted-foreground leading-relaxed">{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
