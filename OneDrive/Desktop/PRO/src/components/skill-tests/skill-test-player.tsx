'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Loader2, Clock, ChevronLeft, ChevronRight, AlertTriangle,
  CheckCircle2, Send
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { apiFetch, apiPut } from '@/lib/api-client';
import { toast } from 'sonner';

interface Question {
  _id: string;
  question: string;
  options: string[];
  points: number;
}

interface TestData {
  _id: string;
  title: string;
  skill: string;
  durationMinutes: number;
  totalPoints: number;
  questions: Question[];
}

interface SkillTestPlayerProps {
  testId: string;
  onComplete: () => void;
  onCancel: () => void;
}

export function SkillTestPlayer({ testId, onComplete, onCancel }: SkillTestPlayerProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [test, setTest] = useState<TestData | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showConfirmQuit, setShowConfirmQuit] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Start the test
  const startTest = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/skill-tests/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to start test');
        onCancel();
        return;
      }

      const data = await res.json();
      setTest(data.test);
      setAttemptId(data.attempt._id);

      // Calculate remaining time
      const startedAt = new Date(data.attempt.startedAt).getTime();
      const durationMs = data.test.durationMinutes * 60 * 1000;
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, Math.floor((durationMs - elapsed) / 1000));
      setTimeRemaining(remaining);

      // Restore answers if resumed
      if (data.resumed && data.attempt.answers) {
        const restored: Record<string, number> = {};
        data.attempt.answers.forEach((a: any) => {
          restored[a.questionId] = a.selectedOptionIndex;
        });
        setAnswers(restored);
      }
    } catch {
      toast.error('Failed to start test');
      onCancel();
    }
    setLoading(false);
  }, [testId, onCancel]);

  useEffect(() => {
    startTest();
  }, [startTest]);

  // Timer
  useEffect(() => {
    if (timeRemaining <= 0 || loading) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Auto-submit on timeout
          clearInterval(timerRef.current!);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, timeRemaining > 0]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectAnswer = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = async (timedOut = false) => {
    if (submitting || !attemptId || !test) return;
    setSubmitting(true);

    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const answerArray = test.questions.map((q) => ({
        questionId: q._id,
        selectedOptionIndex: answers[q._id] ?? -1,
      }));

      const res = await apiPut('/api/skill-tests/attempt', {
        attemptId,
        answers: answerArray,
        timedOut,
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || 'Test submitted!');
        onComplete();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to submit');
      }
    } catch {
      toast.error('Failed to submit test');
    }
    setSubmitting(false);
  };

  if (loading || !test) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading test...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = test.questions[currentIndex];
  const answered = Object.keys(answers).length;
  const totalQuestions = test.questions.length;
  const progressPercent = (answered / totalQuestions) * 100;
  const isUrgent = timeRemaining <= 60;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Bar */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-background/60 backdrop-blur-xl border border-border/40 shadow-lg">
        <div>
          <h2 className="font-semibold text-base">{test.title}</h2>
          <p className="text-xs text-muted-foreground capitalize">{test.skill}</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Timer */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
            isUrgent ? 'bg-red-500/10 text-red-500 animate-pulse' : 'bg-muted'
          }`}>
            <Clock className="h-4 w-4" />
            <span className="font-mono font-semibold text-sm">{formatTime(timeRemaining)}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConfirmQuit(true)}
            className="text-muted-foreground"
          >
            Quit
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
          <span>{answered} of {totalQuestions} answered</span>
          <span>Question {currentIndex + 1}/{totalQuestions}</span>
        </div>
        <Progress value={progressPercent} className="h-1.5" />
      </div>

      {/* Question Card */}
      <Card className="bg-background/40 backdrop-blur-xl border-border/40 shadow-xl">
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <Badge variant="outline" className="mb-3 text-[10px]">
                {currentQuestion.points} point{currentQuestion.points !== 1 ? 's' : ''}
              </Badge>
              <h3 className="text-lg font-semibold leading-relaxed">{currentQuestion.question}</h3>
            </div>
          </div>

          <div className="space-y-3">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = answers[currentQuestion._id] === idx;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectAnswer(currentQuestion._id, idx)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border/40 hover:border-primary/40 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="text-sm">{option}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>

        <div className="flex gap-2">
          {/* Question Pills */}
          <div className="hidden sm:flex gap-1 items-center">
            {test.questions.map((q, idx) => (
              <button
                key={q._id}
                onClick={() => setCurrentIndex(idx)}
                className={`h-7 w-7 rounded-full text-[10px] font-semibold transition-all ${
                  idx === currentIndex
                    ? 'bg-primary text-primary-foreground shadow-md scale-110'
                    : answers[q._id] !== undefined
                      ? 'bg-emerald-500/20 text-emerald-600'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>

        {currentIndex < totalQuestions - 1 ? (
          <Button
            onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
            className="gap-2"
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={() => setShowConfirmSubmit(true)}
            disabled={submitting}
            className="gap-2"
            style={{
              background: 'linear-gradient(135deg, #2E8B57 0%, #0047AB 100%)',
              boxShadow: '0 4px 14px rgba(46,139,87,0.3)',
            }}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit Test
          </Button>
        )}
      </div>

      {/* Submit Confirmation */}
      <AlertDialog open={showConfirmSubmit} onOpenChange={setShowConfirmSubmit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Submit Test?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {answered} of {totalQuestions} questions.
              {answered < totalQuestions && (
                <span className="block mt-1 text-orange-500 font-medium">
                  ⚠️ {totalQuestions - answered} question{totalQuestions - answered > 1 ? 's' : ''} unanswered.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Answering</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSubmit(false)} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Test'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quit Confirmation */}
      <AlertDialog open={showConfirmQuit} onOpenChange={setShowConfirmQuit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Quit Test?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your progress will not be saved and this attempt will remain open. You can resume later before the timer expires.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Going</AlertDialogCancel>
            <AlertDialogAction onClick={onCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Quit Test
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
