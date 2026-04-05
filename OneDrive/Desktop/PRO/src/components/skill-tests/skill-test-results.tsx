'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Loader2, Trophy, Target, Clock, BarChart3,
  CheckCircle2, XCircle, TrendingUp
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface TestResult {
  _id: string;
  score: number;
  totalPoints: number;
  percentage: number;
  percentile: number;
  passed: boolean;
  status: string;
  timeSpentSeconds: number;
  completedAt: string;
  testId: {
    _id: string;
    title: string;
    skill: string;
    difficulty: string;
    durationMinutes: number;
    totalPoints: number;
    passingScore: number;
  };
}

interface BestScore {
  skill: string;
  bestPercentage: number;
  bestPercentile: number;
  attempts: number;
  lastAttempt: string;
}

export function SkillTestResults() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [bestScores, setBestScores] = useState<BestScore[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/skill-tests/results');
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setBestScores(data.bestScores || []);
      }
    } catch {
      toast.error('Failed to load results');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-8">
      {/* Skill Summary Cards */}
      {bestScores.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            Best Scores by Skill
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bestScores.map((score) => (
              <Card
                key={score.skill}
                className="bg-background/40 backdrop-blur-xl border-border/40 shadow-lg hover:shadow-xl transition-all"
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold capitalize">{score.skill}</h4>
                    <Badge
                      variant="secondary"
                      className={`${
                        score.bestPercentage >= 80
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : score.bestPercentage >= 60
                            ? 'bg-blue-500/10 text-blue-600'
                            : 'bg-orange-500/10 text-orange-600'
                      }`}
                    >
                      {score.bestPercentage >= 80 ? 'Expert' : score.bestPercentage >= 60 ? 'Proficient' : 'Learning'}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Best Score</span>
                      <span className="font-bold">{score.bestPercentage}%</span>
                    </div>
                    <Progress value={score.bestPercentage} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground pt-1">
                      <span>Top {Math.max(1, 100 - score.bestPercentile)}%</span>
                      <span>{score.attempts} attempt{score.attempts !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent Results */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-500" />
          Recent Results
        </h3>

        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Trophy className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">No test results yet</p>
            <p className="text-xs text-muted-foreground mt-1">Take a skill test to see your results here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((result) => (
              <Card
                key={result._id}
                className="bg-background/40 backdrop-blur-xl border-border/40 shadow-md hover:shadow-lg transition-all"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                        result.passed ? 'bg-emerald-500/10' : 'bg-red-500/10'
                      }`}>
                        {result.passed ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{result.testId?.title || 'Test'}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span className="capitalize">{result.testId?.skill}</span>
                          <span>•</span>
                          <span className="capitalize">{result.testId?.difficulty}</span>
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(result.completedAt), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className={`text-xl font-bold ${result.passed ? 'text-emerald-500' : 'text-red-500'}`}>
                          {result.percentage}%
                        </span>
                        <Badge variant={result.passed ? 'default' : 'destructive'} className="text-[10px]">
                          {result.passed ? 'PASSED' : 'FAILED'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
                        <span className="flex items-center gap-0.5">
                          <Target className="h-3 w-3" /> {result.score}/{result.totalPoints}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" /> {formatTime(result.timeSpentSeconds)}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <TrendingUp className="h-3 w-3" /> Top {Math.max(1, 100 - result.percentile)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
