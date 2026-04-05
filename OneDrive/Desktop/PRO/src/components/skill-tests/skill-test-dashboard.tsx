'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Loader2, BookOpen, Clock, Trophy, Target,
  ChevronRight, BarChart3, Sparkles, Award, Zap
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';
import { SkillTestPlayer } from './skill-test-player';
import { SkillTestResults } from './skill-test-results';

interface SkillTest {
  _id: string;
  title: string;
  skill: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  durationMinutes: number;
  totalPoints: number;
  passingScore: number;
  attemptCount: number;
  averageScore: number;
}

interface BestScore {
  skill: string;
  bestPercentage: number;
  bestPercentile: number;
  attempts: number;
  lastAttempt: string;
}

const difficultyColors: Record<string, { bg: string; text: string; border: string }> = {
  beginner: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/20' },
  intermediate: { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/20' },
  advanced: { bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-500/20' },
};

export function SkillTestDashboard() {
  const [tests, setTests] = useState<SkillTest[]>([]);
  const [bestScores, setBestScores] = useState<BestScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTest, setActiveTest] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [testsRes, resultsRes] = await Promise.all([
        apiFetch('/api/skill-tests'),
        apiFetch('/api/skill-tests/results'),
      ]);

      if (testsRes.ok) {
        const data = await testsRes.json();
        setTests(data.tests || []);
      }
      if (resultsRes.ok) {
        const data = await resultsRes.json();
        setBestScores(data.bestScores || []);
      }
    } catch {
      toast.error('Failed to load skill tests');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStartTest = (testId: string) => {
    setActiveTest(testId);
  };

  const handleTestComplete = () => {
    setActiveTest(null);
    setShowResults(true);
    fetchData();
  };

  // If taking a test, show the player
  if (activeTest) {
    return (
      <SkillTestPlayer
        testId={activeTest}
        onComplete={handleTestComplete}
        onCancel={() => setActiveTest(null)}
      />
    );
  }

  // If viewing results
  if (showResults) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Test Results</h1>
          <Button variant="outline" onClick={() => setShowResults(false)}>
            ← Back to Tests
          </Button>
        </div>
        <SkillTestResults />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative flex items-center justify-center">
          <div className="absolute animate-ping h-12 w-12 rounded-full bg-primary/20"></div>
          <Loader2 className="h-8 w-8 animate-spin text-primary relative z-10" />
        </div>
      </div>
    );
  }

  // Group tests by skill
  const testsBySkill = tests.reduce<Record<string, SkillTest[]>>((acc, test) => {
    if (!acc[test.skill]) acc[test.skill] = [];
    acc[test.skill].push(test);
    return acc;
  }, {});

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-border/20 pb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            Skill Tests
          </h1>
          <p className="text-muted-foreground mt-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            Prove your expertise and earn verified skill badges
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowResults(true)}
          className="gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          View My Results
        </Button>
      </div>

      {/* Best scores summary */}
      {bestScores.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {bestScores.slice(0, 4).map((score) => (
            <div
              key={score.skill}
              className="p-4 rounded-xl bg-background/40 backdrop-blur-xl border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10">
                  <Trophy className="h-4 w-4 text-emerald-500" />
                </div>
              </div>
              <p className="text-2xl font-bold">{score.bestPercentage}%</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5 capitalize">{score.skill}</p>
              <p className="text-[10px] text-muted-foreground">
                Top {100 - score.bestPercentile}% • {score.attempts} attempt{score.attempts !== 1 ? 's' : ''}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Tests by skill */}
      {Object.keys(testsBySkill).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-semibold">No tests available yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Check back soon for new skill assessments.</p>
        </div>
      ) : (
        Object.entries(testsBySkill).map(([skill, skillTests]) => {
          const bestScore = bestScores.find((s) => s.skill === skill);
          return (
            <div key={skill}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-semibold capitalize">{skill}</h2>
                {bestScore && (
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    Best: {bestScore.bestPercentage}%
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {skillTests.map((test) => {
                  const dc = difficultyColors[test.difficulty] || difficultyColors.beginner;
                  return (
                    <Card
                      key={test._id}
                      className="group bg-background/40 backdrop-blur-xl border-border/40 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
                      onClick={() => handleStartTest(test._id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base font-semibold leading-tight">{test.title}</CardTitle>
                          <Badge variant="outline" className={`${dc.bg} ${dc.text} ${dc.border} text-[10px]`}>
                            {test.difficulty}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{test.description}</p>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {test.durationMinutes} min
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="h-3 w-3" /> {test.totalPoints} pts
                          </span>
                          <span className="flex items-center gap-1">
                            <Award className="h-3 w-3" /> Pass: {test.passingScore}%
                          </span>
                        </div>

                        {test.attemptCount > 0 && (
                          <div className="mb-3">
                            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                              <span>Community avg</span>
                              <span>{test.averageScore}%</span>
                            </div>
                            <Progress value={test.averageScore} className="h-1" />
                          </div>
                        )}

                        <Button
                          size="sm"
                          className="w-full gap-2 opacity-80 group-hover:opacity-100 transition-opacity"
                          style={{
                            background: 'linear-gradient(135deg, #0047AB 0%, #0066CC 100%)',
                            boxShadow: '0 4px 12px rgba(0,71,171,0.2)',
                          }}
                        >
                          <Zap className="h-3.5 w-3.5" />
                          Take Test
                          <ChevronRight className="h-3.5 w-3.5 ml-auto" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
