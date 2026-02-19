'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle2, Circle, Clock, Upload, ExternalLink, 
  FileText, AlertCircle, ChevronRight, Loader2, FileCheck,
  PenTool, Award
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthStore } from '@/store';
import { toast } from 'sonner';

interface VerificationLevel {
  level: number;
  type: string;
  name: string;
  description: string;
  status: 'pending' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  verificationId?: string;
  testScore?: number;
  testPassed?: boolean;
  resumeUrl?: string;
  resumeFileName?: string;
  documents?: Array<{ type: string; url: string; fileName?: string }>;
  ndaSignedAt?: string;
  rejectionReason?: string;
  verifiedAt?: string;
}

interface VerificationStatus {
  role: string;
  currentLevel: number;
  totalLevels: number;
  progress: number;
  isComplete: boolean;
  kycStatus: string;
  verifications: VerificationLevel[];
}

const statusIcons = {
  pending: Circle,
  submitted: Clock,
  under_review: Clock,
  approved: CheckCircle2,
  rejected: AlertCircle,
};

const statusColors = {
  pending: 'text-gray-500',
  submitted: 'text-blue-500',
  under_review: 'text-yellow-500',
  approved: 'text-green-500',
  rejected: 'text-red-500',
};

const typeIcons: Record<string, typeof FileText> = {
  profile: Award,
  skill_test: FileText,
  resume: FileCheck,
  kyc: Upload,
  nda: PenTool,
};

export function VerificationProgress() {
  const { token, user } = useAuthStore();
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<VerificationLevel | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<string>('');
  
  // Form states
  const [documentType, setDocumentType] = useState('id_front');
  const [documentUrl, setDocumentUrl] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [resumeFileName, setResumeFileName] = useState('');
  const [ndaSignature, setNdaSignature] = useState('');

  const fetchVerificationStatus = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch('/api/verification', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setVerificationStatus(data);
      }
    } catch (error) {
      console.error('Error fetching verification status:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchVerificationStatus();
  }, [fetchVerificationStatus]);

  const submitVerification = async (type: string, data: Record<string, unknown>) => {
    if (!token) return false;

    setSubmitting(true);
    try {
      const response = await fetch('/api/verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type, ...data }),
      });

      if (response.ok) {
        toast.success('Verification submitted successfully!');
        fetchVerificationStatus();
        setDialogOpen(false);
        return true;
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to submit verification');
        return false;
      }
    } catch (error) {
      console.error('Error submitting verification:', error);
      toast.error('Failed to submit verification');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleKYCSubmit = async () => {
    if (!documentUrl) {
      toast.error('Please enter document URL');
      return;
    }
    await submitVerification('kyc', {
      documents: [{ type: documentType, url: documentUrl }],
    });
    setDocumentUrl('');
  };

  const handleResumeUpload = async () => {
    if (!resumeUrl || !resumeFileName) {
      toast.error('Please provide both file URL and file name');
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await fetch('/api/verification/upload-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fileUrl: resumeUrl,
          fileName: resumeFileName,
          fileSize: 0, // Will be validated on actual upload
          mimeType: resumeFileName.endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
      });

      if (response.ok) {
        toast.success('Resume uploaded successfully!');
        fetchVerificationStatus();
        setDialogOpen(false);
        setResumeUrl('');
        setResumeFileName('');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to upload resume');
      }
    } catch (error) {
      console.error('Error uploading resume:', error);
      toast.error('Failed to upload resume');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNDASign = async () => {
    if (!ndaSignature || ndaSignature.length < 3) {
      toast.error('Please enter your full name as signature');
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await fetch('/api/verification/sign-nda', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ signature: ndaSignature }),
      });

      if (response.ok) {
        toast.success('NDA signed successfully!');
        fetchVerificationStatus();
        setDialogOpen(false);
        setNdaSignature('');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to sign NDA');
      }
    } catch (error) {
      console.error('Error signing NDA:', error);
      toast.error('Failed to sign NDA');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkillTestStart = () => {
    // Navigate to skill test page or open skill test dialog
    toast.info('Skill test feature coming soon!');
  };

  const openDialog = (level: VerificationLevel, type: string) => {
    setSelectedLevel(level);
    setDialogType(type);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedLevel(null);
    setDialogType('');
    setDocumentUrl('');
    setResumeUrl('');
    setResumeFileName('');
    setNdaSignature('');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!verificationStatus) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <p className="text-muted-foreground">Unable to load verification status</p>
        </CardContent>
      </Card>
    );
  }

  // Admins don't need verification
  if (verificationStatus.role === 'admin') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-8">
          <Award className="h-12 w-12 text-primary mb-4" />
          <p className="text-lg font-medium">Admin Account</p>
          <p className="text-sm text-muted-foreground">Administrators do not require verification</p>
        </CardContent>
      </Card>
    );
  }

  const isCompleted = (level: VerificationLevel) => level.status === 'approved';
  const isActive = (level: VerificationLevel) => {
    const currentLevelInfo = verificationStatus.verifications.find(
      v => v.level === verificationStatus.currentLevel
    );
    return level.level === verificationStatus.currentLevel && !isCompleted(level);
  };
  const isLocked = (level: VerificationLevel) => level.level > verificationStatus.currentLevel + 1;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Verification Progress</CardTitle>
              <CardDescription className="capitalize">
                {verificationStatus.role} Verification - Complete all levels to unlock full features
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                {verificationStatus.role.toUpperCase()}
              </Badge>
              <Badge className={verificationStatus.isComplete ? 'bg-green-500' : 'bg-blue-500'}>
                Level {verificationStatus.currentLevel + 1}/{verificationStatus.totalLevels}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">{verificationStatus.progress}% Complete</span>
            </div>
            <Progress value={verificationStatus.progress} className="h-3" />
          </div>

          {/* Completion Message */}
          {verificationStatus.isComplete && (
            <Alert className="bg-green-500/10 border-green-500/20">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                Congratulations! You have completed all verification levels. Your account is now fully verified.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Verification Levels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Verification Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {verificationStatus.verifications.map((level) => {
            const StatusIcon = statusIcons[level.status];
            const TypeIcon = typeIcons[level.type] || FileText;
            const completed = isCompleted(level);
            const active = isActive(level);
            const locked = isLocked(level);

            return (
              <div
                key={level.level}
                className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                  active ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
                } ${locked ? 'opacity-50' : ''}`}
              >
                {/* Status Indicator */}
                <div className={`flex-shrink-0 mt-1 ${statusColors[level.status]}`}>
                  {completed ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <StatusIcon className={`h-6 w-6 ${level.status === 'under_review' ? 'animate-pulse' : ''}`} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <TypeIcon className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium">{level.name}</h4>
                    <Badge variant="outline" className="text-xs">
                      Level {level.level + 1}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {level.description}
                  </p>

                  {/* Additional Info */}
                  {level.testScore !== undefined && (
                    <p className="text-sm mt-2">
                      Test Score: <span className="font-medium">{level.testScore}%</span>
                      {level.testPassed ? (
                        <CheckCircle2 className="inline h-4 w-4 text-green-500 ml-1" />
                      ) : (
                        <AlertCircle className="inline h-4 w-4 text-red-500 ml-1" />
                      )}
                    </p>
                  )}

                  {level.resumeUrl && (
                    <div className="flex items-center gap-2 mt-2">
                      <FileCheck className="h-4 w-4 text-green-500" />
                      <a 
                        href={level.resumeUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {level.resumeFileName || 'View Resume'}
                      </a>
                    </div>
                  )}

                  {level.ndaSignedAt && (
                    <p className="text-sm text-green-600 mt-2">
                      Signed on: {new Date(level.ndaSignedAt).toLocaleDateString()}
                    </p>
                  )}

                  {level.rejectionReason && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Rejected: {level.rejectionReason}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Action Button */}
                {!completed && !locked && (
                  <Button
                    variant={level.status === 'rejected' ? 'destructive' : 'default'}
                    size="sm"
                    onClick={() => openDialog(level, level.type)}
                  >
                    {level.status === 'rejected' ? 'Resubmit' : 
                     level.status === 'submitted' || level.status === 'under_review' ? 'View' : 
                     level.type === 'skill_test' ? 'Take Test' :
                     level.type === 'resume' ? 'Upload' :
                     level.type === 'kyc' ? 'Upload' :
                     level.type === 'nda' ? 'Sign' : 'Start'}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedLevel?.name}</DialogTitle>
            <DialogDescription>
              {selectedLevel?.description}
            </DialogDescription>
          </DialogHeader>

          {/* KYC Upload */}
          {dialogType === 'kyc' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Document Type</Label>
                <select
                  className="w-full border rounded-md p-2 bg-background"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                >
                  <option value="id_front">ID Card (Front)</option>
                  <option value="id_back">ID Card (Back)</option>
                  <option value="passport">Passport</option>
                  <option value="license">Driver's License</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Document URL</Label>
                <Input
                  placeholder="https://example.com/document.jpg"
                  value={documentUrl}
                  onChange={(e) => setDocumentUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Upload your document to a cloud storage and paste the URL
                </p>
              </div>
              <Button className="w-full" onClick={handleKYCSubmit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Submit Document
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Resume Upload */}
          {dialogType === 'resume' && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Upload your resume as a PDF or DOCX file. Maximum file size: 5MB.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label>Resume File URL</Label>
                <Input
                  placeholder="https://example.com/resume.pdf"
                  value={resumeUrl}
                  onChange={(e) => setResumeUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>File Name</Label>
                <Input
                  placeholder="MyResume.pdf"
                  value={resumeFileName}
                  onChange={(e) => setResumeFileName(e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={handleResumeUpload} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Resume
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Skill Test */}
          {dialogType === 'skill_test' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Complete a skill assessment test to verify your abilities. 
                You need to score at least 70% to pass.
              </p>
              <Button className="w-full" onClick={handleSkillTestStart}>
                <FileText className="h-4 w-4 mr-2" />
                Start Skill Test
              </Button>
            </div>
          )}

          {/* NDA Signing */}
          {dialogType === 'nda' && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/50 text-sm">
                <h4 className="font-medium mb-2">Non-Disclosure Agreement</h4>
                <p className="text-muted-foreground">
                  By signing this NDA, you agree to keep all confidential information shared 
                  through the CollabHub platform private and not disclose it to any third parties.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Electronic Signature (Type your full name)</Label>
                <Input
                  placeholder="John Doe"
                  value={ndaSignature}
                  onChange={(e) => setNdaSignature(e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={handleNDASign} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signing...
                  </>
                ) : (
                  <>
                    <PenTool className="h-4 w-4 mr-2" />
                    Sign NDA
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
