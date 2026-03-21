'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store';
import { toast } from 'sonner';
import { apiPost } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, DollarSign, UploadCloud, AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MilestonePaymentModalProps {
    milestone: any;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function MilestonePaymentModal({ milestone, isOpen, onClose, onSuccess }: MilestonePaymentModalProps) {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [proofUrl, setProofUrl] = useState('');
    const [disputeReason, setDisputeReason] = useState('');
    const [mode, setMode] = useState<'pay' | 'confirm' | 'dispute' | null>(null);

    const handleAction = async (endpoint: string, bodyObj: any) => {
        setLoading(true);
        try {
            const response = await apiPost(`/api/payments/tracking/${endpoint}`, { milestoneId: milestone._id, ...bodyObj });

            if (!response.ok) {
                throw new Error((await response.json()).error || `Failed to ${endpoint}`);
            }

            toast.success('Action successful!');
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const isFounder = user?.role === 'founder';
    const isTalent = user?.role === 'talent';
    const pStatus = milestone.paymentStatus || 'pending';

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-500" />
                        Milestone Payment: {milestone.title}
                    </DialogTitle>
                    <DialogDescription>
                        Securely track off-platform escrow transfers for legal compliance. Amount: <strong className="text-green-600 dark:text-green-400">${milestone.amount.toLocaleString()}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="bg-muted/30 p-4 border rounded-lg">
                        <p className="text-sm font-semibold mb-1">Payment Status: <span className="capitalize text-primary">{pStatus.replace('_', ' ')}</span></p>
                        {milestone.paymentProofUrl && (
                            <a href={milestone.paymentProofUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-2">
                                <UploadCloud className="h-3 w-3" /> View Uploaded Receipt
                            </a>
                        )}
                        {milestone.disputeReason && (
                            <div className="mt-2 text-xs text-red-500 bg-red-500/10 p-2 rounded">
                                <strong>Dispute Reason:</strong> {milestone.disputeReason}
                            </div>
                        )}
                    </div>

                    {!mode && (
                        <div className="flex flex-col gap-2">
                            {isFounder && ['pending', 'not_started'].includes(pStatus) && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div>
                                                <Button
                                                    onClick={() => setMode('pay')}
                                                    className="w-full"
                                                    disabled={(user?.verificationLevel || 0) < 2}
                                                >
                                                    {(user?.verificationLevel || 0) < 2 && <Lock className="h-4 w-4 mr-2" />}
                                                    Mark as Paid & Upload Receipt
                                                </Button>
                                            </div>
                                        </TooltipTrigger>
                                        {(user?.verificationLevel || 0) < 2 && (
                                            <TooltipContent>
                                                <p>You need Verification Level 2 to process payments.</p>
                                            </TooltipContent>
                                        )}
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                            {isTalent && pStatus === 'marked_paid' && (
                                <>
                                    <Button onClick={() => setMode('confirm')} className="w-full bg-green-600 hover:bg-green-700">Confirm Payment Received</Button>
                                    <Button onClick={() => setMode('dispute')} variant="destructive" className="w-full">Open Dispute</Button>
                                </>
                            )}
                            {pStatus === 'confirmed' && (
                                <div className="flex flex-col items-center justify-center p-6 text-green-600">
                                    <CheckCircle2 className="h-12 w-12 mb-2" />
                                    <p className="font-medium text-lg">Payment Confirmed</p>
                                </div>
                            )}
                        </div>
                    )}

                    {mode === 'pay' && (
                        <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in">
                            <div className="space-y-2">
                                <Label>Transfer Receipt URL (S3 / Cloud storage link)</Label>
                                <Input
                                    placeholder="https://example.com/receipt.pdf"
                                    value={proofUrl} onChange={e => setProofUrl(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setMode(null)} className="flex-1">Back</Button>
                                <Button
                                    onClick={() => handleAction('mark-paid', { paymentMethod: 'bank_transfer', proofUrl })}
                                    className="flex-1" disabled={loading || !proofUrl}
                                >
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Payment Proof'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {mode === 'confirm' && (
                        <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in">
                            <p className="text-sm text-muted-foreground">Are you sure you want to verify receipt of <strong className="text-foreground">${milestone.amount.toLocaleString()}</strong>? This action will permanently lock the milestone payment status.</p>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setMode(null)} className="flex-1">Back</Button>
                                <Button onClick={() => handleAction('confirm-receipt', {})} className="flex-1 bg-green-600 hover:bg-green-700" disabled={loading}>
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, Confirm Receipt'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {mode === 'dispute' && (
                        <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in">
                            <div className="space-y-2">
                                <Label>Dispute Reason</Label>
                                <Textarea
                                    placeholder="E.g., Amount was short, wire never arrived, wrong currency..."
                                    value={disputeReason} onChange={e => setDisputeReason(e.target.value)}
                                    rows={3}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setMode(null)} className="flex-1">Back</Button>
                                <Button
                                    onClick={() => handleAction('dispute', { reason: disputeReason })}
                                    variant="destructive" className="flex-1" disabled={loading || !disputeReason}
                                >
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Dispute'}
                                </Button>
                            </div>
                        </div>
                    )}

                </div>
            </DialogContent>
        </Dialog>
    );
}
