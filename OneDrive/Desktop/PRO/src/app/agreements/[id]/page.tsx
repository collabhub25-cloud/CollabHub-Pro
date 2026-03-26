'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Download, CheckCircle2, Clock, X, FileText } from 'lucide-react';

export default function AgreementDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const [agreement, setAgreement] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [signing, setSigning] = useState(false);

    useEffect(() => {
        const fetchAgreement = async () => {
            try {
                const res = await fetch(`/api/agreements/${resolvedParams.id}`, {
                    credentials: 'include'
                });
                if (res.ok) {
                    const json = await res.json();
                    setAgreement(json.data || json.agreement);
                } else {
                    toast.error('Failed to load agreement');
                    router.back();
                }
            } catch (err) {
                console.error(err);
                toast.error('Something went wrong');
            } finally {
                setLoading(false);
            }
        };
        fetchAgreement();
    }, [resolvedParams.id, router]);

    const handleSign = async () => {
        setSigning(true);
        try {
            const res = await fetch('/api/agreements/sign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agreementId: agreement._id }),
                credentials: 'include'
            });

            if (res.ok) {
                toast.success('Agreement signed successfully');
                // Refresh the agreement to show signature
                const updatedRes = await fetch(`/api/agreements/${resolvedParams.id}`, { credentials: 'include' });
                if (updatedRes.ok) {
                    const json = await updatedRes.json();
                    setAgreement(json.data || json.agreement);
                }
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to sign agreement');
            }
        } catch (err) {
            toast.error('Failed to connect to server');
        } finally {
            setSigning(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50/50 dark:bg-gray-900/50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!agreement) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-900/50">
                <FileText className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                <h2 className="text-xl font-bold mb-2">Agreement not found</h2>
                <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
            </div>
        );
    }

    // Checking if current user (we can infer from the status or UI need) should sign
    const isSigned = agreement.status === 'signed' || agreement.status === 'active' || agreement.status === 'completed';

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24">
            {/* Header / Navigation */}
            <div className="sticky top-0 z-40 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-6 py-4">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Dashboard
                    </Button>
                    <div className="flex items-center gap-3">
                        <Badge className={`px-3 py-1 shadow-none ${
                            agreement.status === 'active' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                            agreement.status === 'signed' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                            'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                        }`}>
                            {agreement.status?.toUpperCase()}
                        </Badge>
                        {(!isSigned && agreement.status === 'pending_signature') && (
                            <InteractiveHoverButton
                                text={signing ? "Signing..." : "Sign Agreement"}
                                onClick={handleSign}
                                disabled={signing}
                                className="w-40"
                            />
                        )}
                        {agreement.pdfSnapshotUrl && (
                            <Button variant="outline" size="sm" onClick={() => window.open(agreement.pdfSnapshotUrl, '_blank')}>
                                <Download className="h-4 w-4 mr-2" />
                                Download PDF
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <main className="max-w-5xl mx-auto px-6 pt-8 space-y-8">
                {/* Title & Meta Info */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white capitalize">{agreement.type?.replace('_', ' ')} Agreement</h1>
                    <p className="text-muted-foreground mt-2 flex items-center gap-2">
                        <span>{agreement.startupId?.name || "Startup Entity"}</span>
                        <span>•</span>
                        <span>Issued on {new Date(agreement.createdAt).toLocaleDateString()}</span>
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    
                    {/* Main Content Viewer (Left 2 columns) */}
                    <div className="lg:col-span-2 space-y-6">
                        {agreement.pdfSnapshotUrl ? (
                            <Card className="overflow-hidden border-gray-200 dark:border-gray-800 shadow-sm rounded-2xl bg-white/50 dark:bg-black/20 backdrop-blur-sm">
                                <iframe src={agreement.pdfSnapshotUrl} className="w-full min-h-[700px] border-0" title="Agreement PDF Viewer" />
                            </Card>
                        ) : (
                            <Card className="border-gray-200 dark:border-gray-800 shadow-sm rounded-2xl bg-white dark:bg-[#111] overflow-hidden">
                                <div className="bg-gray-50 dark:bg-[#1a1a1a] px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-primary" />
                                        Document Content
                                    </h3>
                                </div>
                                <CardContent className="p-8 prose prose-sm dark:prose-invert max-w-none font-serif leading-relaxed text-gray-700 dark:text-gray-300">
                                    {agreement.content || "No textual content provided for this agreement."}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Meta sidebar (Right 1 column) */}
                    <div className="space-y-6">
                        
                        {/* Terms Summary */}
                        {agreement.terms && Object.keys(agreement.terms).length > 0 && (
                            <Card className="border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm bg-white/50 dark:bg-black/20 backdrop-blur-sm">
                                <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
                                    <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 uppercase tracking-wider">Terms Summary</h3>
                                </div>
                                <CardContent className="p-5 space-y-4">
                                    {Object.entries(agreement.terms).map(([key, value]) => {
                                        if (value == null || value === '') return null;
                                        return (
                                            <div key={key}>
                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                                                <p className="text-sm font-medium text-foreground">{String(value)}</p>
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>
                        )}

                        {/* Signatures & Execution */}
                        <Card className="border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm bg-white/50 dark:bg-black/20 backdrop-blur-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#1a1a1a]/50">
                                <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    Parties & Signatures
                                </h3>
                            </div>
                            <div className="divide-y divide-gray-200 dark:divide-gray-800">
                                {agreement.parties?.map((party: any, idx: number) => {
                                    const sig = agreement.signedBy?.find((s: any) => s.userId === party._id || s.userId?._id === party._id);
                                    return (
                                        <div key={idx} className={`p-4 transition-colors ${sig ? 'bg-green-50/30 dark:bg-green-900/5' : ''}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center flex-shrink-0 text-xs font-medium border border-gray-200 dark:border-gray-700">
                                                        {party.name?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold">{party.name}</p>
                                                        <p className="text-xs text-muted-foreground capitalize">{party.role || 'Member'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-3 pl-11">
                                                {sig ? (
                                                    <div className="flex items-center gap-2 bg-green-500/10 text-green-700 dark:text-green-400 px-3 py-1.5 rounded border border-green-500/20 w-fit">
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                        <span className="text-xs font-medium">Signed digitally</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500 px-3 py-1.5 rounded border border-yellow-500/20 bg-yellow-500/10 w-fit">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        <span className="text-xs font-medium">Awaiting signature</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>

                    </div>
                </div>
            </main>
        </div>
    );
}
