'use client';

import { useState } from 'react';
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, Loader2, Send, CheckCircle2, AlertCircle, DollarSign, Percent 
} from 'lucide-react';
import { useAuthStore } from '@/store';
import { toast } from 'sonner';

interface Role {
  _id: string;
  title: string;
  description?: string;
  skills?: string[];
  compensationType?: string;
  equityPercent?: number;
  cashAmount?: number;
}

interface Startup {
  _id: string;
  name: string;
  vision: string;
  industry: string;
  stage: string;
  rolesNeeded?: Role[];
}

interface ApplyModalProps {
  startup: Startup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ApplyModal({ startup, open, onOpenChange, onSuccess }: ApplyModalProps) {
  const { token, user } = useAuthStore();
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [coverLetter, setCoverLetter] = useState('');
  const [proposedEquity, setProposedEquity] = useState('');
  const [proposedCash, setProposedCash] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const resetForm = () => {
    setSelectedRole('');
    setCoverLetter('');
    setProposedEquity('');
    setProposedCash('');
    setSuccess(false);
  };

  const handleSubmit = async () => {
    if (!startup || !token || !user) return;

    // Validation
    if (!selectedRole) {
      toast.error('Please select a role');
      return;
    }

    if (coverLetter.trim().length < 50) {
      toast.error('Cover letter must be at least 50 characters');
      return;
    }

    // Check if talent has skills in profile
    if (!user.skills || user.skills.length === 0) {
      toast.error('Please add skills to your profile before applying');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          startupId: startup._id,
          roleId: selectedRole,
          coverLetter: coverLetter.trim(),
          proposedEquity: proposedEquity ? parseFloat(proposedEquity) : undefined,
          proposedCash: proposedCash ? parseFloat(proposedCash) : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        toast.success('Application submitted successfully!');
        setTimeout(() => {
          onOpenChange(false);
          resetForm();
          onSuccess?.();
        }, 1500);
      } else {
        toast.error(data.error || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  if (!startup) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Apply to {startup.name}
          </DialogTitle>
          <DialogDescription>
            {startup.industry} • {startup.stage} stage
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Application Submitted!</h3>
            <p className="text-muted-foreground">
              Your application to {startup.name} has been sent. You can track its status in your Applications.
            </p>
          </div>
        ) : (
          <div className="space-y-6 pt-4">
            {/* Role Selection */}
            <div className="space-y-2">
              <Label>Select Role *</Label>
              {startup.rolesNeeded && startup.rolesNeeded.length > 0 ? (
                <div className="grid gap-2">
                  {startup.rolesNeeded.map((role) => (
                    <button
                      key={role._id}
                      type="button"
                      onClick={() => setSelectedRole(role._id)}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        selectedRole === role._id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{role.title}</p>
                          {role.skills && role.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {role.skills.slice(0, 3).map((skill) => (
                                <Badge key={skill} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                              {role.skills.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{role.skills.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-right text-sm">
                          {role.compensationType === 'equity' && role.equityPercent && (
                            <span className="flex items-center gap-1 text-primary">
                              <Percent className="h-3 w-3" />
                              {role.equityPercent}% equity
                            </span>
                          )}
                          {role.compensationType === 'cash' && role.cashAmount && (
                            <span className="flex items-center gap-1 text-green-600">
                              <DollarSign className="h-3 w-3" />
                              {role.cashAmount.toLocaleString()}/mo
                            </span>
                          )}
                          {role.compensationType === 'mixed' && role.equityPercent && role.cashAmount && (
                            <span className="text-sm">
                              <span className="text-primary">{role.equityPercent}%</span>
                              {' + '}
                              <span className="text-green-600">${role.cashAmount.toLocaleString()}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <p className="text-sm text-muted-foreground">
                    No roles available. The founder hasn't added any positions yet.
                  </p>
                </div>
              )}
            </div>

            {/* Cover Letter */}
            <div className="space-y-2">
              <Label htmlFor="coverLetter">Cover Letter *</Label>
              <Textarea
                id="coverLetter"
                placeholder="Tell the founder why you're a great fit for this role. Explain your relevant experience and what excites you about this opportunity..."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={6}
                className="resize-none"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Minimum 50 characters</span>
                <span className={coverLetter.length < 50 ? 'text-yellow-500' : 'text-green-500'}>
                  {coverLetter.length} characters
                </span>
              </div>
            </div>

            {/* Proposed Compensation (Optional) */}
            <div className="space-y-2">
              <Label>Proposed Compensation (Optional)</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="equity" className="text-xs text-muted-foreground">
                    Equity %
                  </Label>
                  <Input
                    id="equity"
                    type="number"
                    placeholder="e.g., 5"
                    value={proposedEquity}
                    onChange={(e) => setProposedEquity(e.target.value)}
                    min="0"
                    max="100"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cash" className="text-xs text-muted-foreground">
                    Monthly Cash ($)
                  </Label>
                  <Input
                    id="cash"
                    type="number"
                    placeholder="e.g., 5000"
                    value={proposedCash}
                    onChange={(e) => setProposedCash(e.target.value)}
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Profile Status Check */}
            {(!user?.skills || user.skills.length === 0) && (
              <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-700 dark:text-yellow-400">Profile Incomplete</p>
                  <p className="text-yellow-600 dark:text-yellow-300">
                    Add skills to your profile before applying. Go to My Profile to update your skills.
                  </p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={submitting || !selectedRole || coverLetter.length < 50 || !user?.skills?.length}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Application
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
