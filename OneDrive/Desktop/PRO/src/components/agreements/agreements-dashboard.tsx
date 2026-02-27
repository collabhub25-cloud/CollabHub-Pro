'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '@/store';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
    FileSignature, FileText, AlertTriangle, CheckCircle2,
    Download, Loader2, Send, XCircle, ArrowRight, Clock
} from 'lucide-react';
import { ErrorBoundary, PageSkeleton } from '@/components/common/loading-error-handlers';
import { getInitials } from '@/lib/client-utils';
import confetti from 'canvas-confetti';

interface Agreement {
    _id: string;
    title: string;
    type: string;
    status: 'draft' | 'sent' | 'active' | 'disputed' | 'completed';
    content: string;
    parties: {
        userId: { _id: string; name: string; avatar?: string; role: string };
        role: string;
        hasSigned: boolean;
        signedAt?: string;
        signatureHash?: string;
    }[];
    startupId?: { _id: string; name: string };
    createdBy: string;
    updatedAt: string;
    createdAt: string;
    disputeReason?: string;
}

export function AgreementsDashboard() {
    const { user } = useAuthStore();
    const [agreements, setAgreements] = useState<Agreement[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('active');

    // Detail & Sign states
    const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null);
    const [isSignModalOpen, setIsSignModalOpen] = useState(false);
    const [signName, setSignName] = useState('');
    const [isSigning, setIsSigning] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchAgreements = useCallback(async () => {
        try {
            // In a real scenario, this would hit GET /api/agreements
            const response = await apiFetch('/api/agreements', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                setAgreements(data.data || []);
            }
        } catch (error) {
            console.error('Error fetching agreements', error);
            toast.error('Failed to load agreements');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAgreements();
    }, [fetchAgreements]);

    const handleSign = async () => {
        if (!signName || signName.trim().toLowerCase() !== user?.name.toLowerCase()) {
            toast.error('Signature must exactly match your full registered name');
            return;
        }

        setIsSigning(true);
        try {
            const response = await fetch('/api/agreements/sign', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agreementId: selectedAgreement?._id, signature: signName })
            });

            if (!response.ok) {
                throw new Error((await response.json()).error || 'Failed to sign');
            }

            toast.success('Agreement Signed Successfully!');
            setIsSignModalOpen(false);
            setSelectedAgreement(null);
            setSignName('');
            fetchAgreements();

            // Confetti animation for successful signing
            const duration = 2000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 25, spread: 360, ticks: 60, zIndex: 100 };
            const interval: any = setInterval(() => {
                const timeLeft = animationEnd - Date.now();
                if (timeLeft <= 0) return clearInterval(interval);
                const particleCount = 40 * (timeLeft / duration);
                confetti({ ...defaults, particleCount, origin: { x: 0.5, y: 0.5 } });
            }, 250);

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSigning(false);
        }
    };

    const handleAction = async (endpoint: string, id: string, extraBody = {}) => {
        setActionLoading(true);
        try {
            const response = await fetch(`/api/agreements/${endpoint}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agreementId: id, ...extraBody })
            });

            if (!response.ok) {
                throw new Error((await response.json()).error || `Failed to ${endpoint}`);
            }

            toast.success(`Agreement ${endpoint} processed`);
            setSelectedAgreement(null);
            fetchAgreements();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const downloadSnapshot = (agreement: Agreement) => {
        const lines = [
            `AGREEMENT SNAPSHOT`,
            `==================`,
            `Title: ${agreement.title}`,
            `Type: ${agreement.type}`,
            `Status: ${agreement.status}`,
            `Created: ${new Date(agreement.createdAt).toLocaleString()}`,
            `Updated: ${new Date(agreement.updatedAt).toLocaleString()}`,
            ``,
            `--- PARTIES ---`,
            ...agreement.parties.map(p => `${p.userId.name} (${p.role}) — ${p.hasSigned ? `Signed: ${new Date(p.signedAt!).toLocaleString()}` : 'Unsigned'}`),
            ``,
            `--- CONTENT ---`,
            agreement.content,
            agreement.disputeReason ? `\n--- DISPUTE ---\n${agreement.disputeReason}` : '',
        ].join('\n');
        const blob = new Blob([lines], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `agreement-${agreement._id}-snapshot.txt`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Snapshot downloaded');
    };

    if (loading) return <PageSkeleton />;

    const filteredAgreements = agreements.filter(a => a.status === activeTab);

    const StatusIcon = {
        draft: FileText,
        sent: Send,
        active: FileSignature,
        completed: CheckCircle2,
        disputed: AlertTriangle
    };

    const StatusColors = {
        draft: 'bg-gray-500',
        sent: 'bg-blue-500',
        active: 'bg-green-500',
        completed: 'bg-purple-500',
        disputed: 'bg-red-500'
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Legal Agreements</h2>
                    <p className="text-muted-foreground mt-1">
                        Manage your NDAs, Contracts, and securely sign them digitally.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="active" onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-5 w-full md:w-[600px] bg-muted/50 p-1">
                    <TabsTrigger value="active">Active</TabsTrigger>
                    <TabsTrigger value="sent">Sent</TabsTrigger>
                    <TabsTrigger value="draft">Draft</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                    <TabsTrigger value="disputed">Disputed</TabsTrigger>
                </TabsList>

                <div className="mt-6 border border-border/50 rounded-xl bg-card/50 shadow-sm min-h-[400px] p-4 relative overflow-hidden">
                    {filteredAgreements.length === 0 ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                            <FileSignature className="h-12 w-12 mb-4 opacity-20" />
                            <p>No agreements found in this view.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredAgreements.map((agreement) => {
                                const CurrentIcon = StatusIcon[agreement.status] || FileText;
                                return (
                                    <Card key={agreement._id} className="group hover:border-primary/50 transition-all duration-300 hover:shadow-md cursor-pointer flex flex-col" onClick={() => setSelectedAgreement(agreement)}>
                                        <CardHeader className="pb-3">
                                            <div className="flex justify-between items-start">
                                                <Badge className={`${StatusColors[agreement.status]} text-white px-2 py-0.5 capitalize flex items-center gap-1.5`}>
                                                    <CurrentIcon className="h-3 w-3" />
                                                    {agreement.status}
                                                </Badge>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {new Date(agreement.updatedAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <CardTitle className="text-lg mt-3 truncate">{agreement.title}</CardTitle>
                                            <CardDescription className="uppercase text-xs tracking-wider">{agreement.type}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="mt-auto">
                                            <div className="flex items-center -space-x-2 pt-2">
                                                {agreement.parties.map((p, i) => (
                                                    <Avatar key={i} className={`h - 8 w - 8 border - 2 border - background ${p.hasSigned ? 'ring-2 ring-green-500 ring-offset-1' : ''}`}>
                                                        <AvatarImage src={p.userId.avatar} />
                                                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                                            {getInitials(p.userId.name)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            </Tabs>

            {/* DETAIL MODAL */}
            <Dialog open={!!selectedAgreement} onOpenChange={(val) => !val && setSelectedAgreement(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                    {selectedAgreement && (
                        <>
                            <DialogHeader className="p-6 border-b bg-muted/30">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <DialogTitle className="text-2xl">{selectedAgreement.title}</DialogTitle>
                                        <DialogDescription className="mt-1">
                                            Document Hash Snapshot | {new Date(selectedAgreement.createdAt).toLocaleDateString()}
                                        </DialogDescription>
                                    </div>
                                    <Badge className={`${StatusColors[selectedAgreement.status]} text-white capitalize`}>
                                        {selectedAgreement.status}
                                    </Badge>
                                </div>
                            </DialogHeader>

                            <ScrollArea className="flex-1 p-6 bg-card text-card-foreground text-sm font-serif leading-relaxed">
                                <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                                    {selectedAgreement.content}
                                </div>

                                {selectedAgreement.status === 'disputed' && (
                                    <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                                        <h4 className="flex items-center gap-2 text-red-600 font-bold mb-2">
                                            <AlertTriangle className="h-5 w-5" /> Dispute Record Active
                                        </h4>
                                        <p className="text-red-700/80 dark:text-red-400/80">{selectedAgreement.disputeReason}</p>
                                    </div>
                                )}

                                <div className="mt-10 pt-6 border-t grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {selectedAgreement.parties.map((party, i) => (
                                        <div key={i} className={`p-4 rounded-xl border ${party.hasSigned ? 'bg-green-500/5 border-green-500/30' : 'bg-muted/50 border-transparent'}`}>
                                            <div className="flex items-center gap-3 mb-3">
                                                <Avatar className="h-10 w-10">
                                                    {party.userId.avatar && <AvatarImage src={party.userId.avatar} />}
                                                    <AvatarFallback>{getInitials(party.userId.name)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-semibold">{party.userId.name}</p>
                                                    <p className="text-xs text-muted-foreground capitalize">{party.role}</p>
                                                </div>
                                            </div>
                                            {party.hasSigned ? (
                                                <div className="space-y-1 animate-in slide-in-from-bottom-2 fade-in">
                                                    <p className="text-xs font-mono text-green-600 dark:text-green-400 break-all bg-green-500/10 p-2 rounded">
                                                        {party.signatureHash}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        Signed: {new Date(party.signedAt!).toLocaleString()}
                                                    </p>
                                                </div>
                                            ) : (
                                                <Badge variant="outline" className="text-yellow-600 border-yellow-500/50 bg-yellow-500/10">Awaiting Signature</Badge>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Audit Timeline */}
                                <div className="mt-8 pt-6 border-t">
                                    <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        Audit Timeline
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="h-2 w-2 rounded-full bg-gray-400 mt-1.5 shrink-0" />
                                            <div>
                                                <p className="text-sm font-medium">Agreement Created</p>
                                                <p className="text-xs text-muted-foreground">{new Date(selectedAgreement.createdAt).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        {selectedAgreement.status !== 'draft' && (
                                            <div className="flex items-start gap-3">
                                                <div className="h-2 w-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                                                <div>
                                                    <p className="text-sm font-medium">Sent to Parties</p>
                                                    <p className="text-xs text-muted-foreground">After creation</p>
                                                </div>
                                            </div>
                                        )}
                                        {selectedAgreement.parties.filter(p => p.hasSigned).map((p, i) => (
                                            <div key={i} className="flex items-start gap-3">
                                                <div className="h-2 w-2 rounded-full bg-green-400 mt-1.5 shrink-0" />
                                                <div>
                                                    <p className="text-sm font-medium">{p.userId.name} signed</p>
                                                    <p className="text-xs text-muted-foreground">{new Date(p.signedAt!).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {selectedAgreement.status === 'disputed' && (
                                            <div className="flex items-start gap-3">
                                                <div className="h-2 w-2 rounded-full bg-red-400 mt-1.5 shrink-0" />
                                                <div>
                                                    <p className="text-sm font-medium text-red-600">Dispute Filed</p>
                                                    <p className="text-xs text-muted-foreground">{selectedAgreement.disputeReason}</p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex items-start gap-3">
                                            <div className="h-2 w-2 rounded-full bg-muted-foreground/30 mt-1.5 shrink-0" />
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                                                <p className="text-xs text-muted-foreground">{new Date(selectedAgreement.updatedAt).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>

                            <DialogFooter className="p-4 border-t bg-muted/30 flex justify-between sm:justify-between items-center w-full">
                                <Button variant="outline" size="sm" className="gap-2" onClick={() => downloadSnapshot(selectedAgreement)}>
                                    <Download className="h-4 w-4" /> Download Snapshot
                                </Button>
                                <div className="flex gap-2">
                                    {selectedAgreement.status === 'draft' && selectedAgreement.createdBy === user?._id && (
                                        <Button onClick={() => handleAction('send', selectedAgreement._id)} disabled={actionLoading}>
                                            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send to Parties'}
                                        </Button>
                                    )}
                                    {['sent', 'active'].includes(selectedAgreement.status) && selectedAgreement.parties.find(p => p.userId._id === user?._id && !p.hasSigned) && (
                                        <Button onClick={() => setIsSignModalOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                                            <FileSignature className="h-4 w-4" /> Sign Document
                                        </Button>
                                    )}
                                    {selectedAgreement.status === 'active' && (
                                        <Button variant="destructive" onClick={() => handleAction('dispute', selectedAgreement._id, { reason: 'Formal UI Dispute' })} disabled={actionLoading}>
                                            Dispute
                                        </Button>
                                    )}
                                </div>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* SIGNING MODAL */}
            <Dialog open={isSignModalOpen} onOpenChange={setIsSignModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Sign Agreement</DialogTitle>
                        <DialogDescription>
                            To securely sign this legally binding document, please type your exact registered full name below.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="signature" className="mb-2 block">Electronic Signature</Label>
                        <Input
                            id="signature"
                            placeholder={user?.name || "John Doe"}
                            value={signName}
                            onChange={(e) => setSignName(e.target.value)}
                            className="font-serif text-lg py-6 italic bg-muted/50 border-primary/20 focus:border-primary"
                        />
                        <p className="text-xs text-muted-foreground mt-3">
                            By signing, you agree to the cryptographic hashing of your profile identity mapped against the precise current document bounds. This action is immutable.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsSignModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSign} disabled={isSigning || !signName}>
                            {isSigning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Signature'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function AgreementsDashboardWithBoundary() {
    return (
        <ErrorBoundary>
            <AgreementsDashboard />
        </ErrorBoundary>
    );
}
