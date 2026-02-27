'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAuthStore } from '@/store';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    ShieldCheck, UploadCloud, FileText, CheckCircle2,
    AlertCircle, Clock, XCircle, FileImage, ExternalLink
} from 'lucide-react';
import { ErrorBoundary, PageSkeleton } from '@/components/common/loading-error-handlers';

interface KYCStatusData {
    kycStatus: string;
    kycLevel: number;
    documents: any[];
}

export function KycDashboard() {
    const { user } = useAuthStore();
    const [data, setData] = useState<KYCStatusData | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);

    const fetchStatus = useCallback(async () => {
        try {
            const response = await apiFetch('/api/kyc');
            if (response.ok) {
                const result = await response.json();
                setData(result);
            }
        } catch (error) {
            toast.error('Failed to load KYC status');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size exceeds 5MB limit');
            return;
        }

        setUploading(true);
        setUploadSuccess(false);

        try {
            const formData = new FormData();
            formData.append('document', file);
            // For founders, determine type based on what's missing, or default
            const docType = user?.role === 'founder' && !data?.documents?.find(d => d.type === 'kyc-business')
                ? 'business' : 'id';
            formData.append('type', docType);

            const response = await fetch('/api/kyc', {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Upload failed');
            }

            setUploadSuccess(true);
            toast.success('Document uploaded successfully');
            fetchStatus();

            // Reset success animation after a few seconds
            setTimeout(() => setUploadSuccess(false), 3000);
        } catch (error: any) {
            toast.error(error.message || 'Error uploading document');
        } finally {
            setUploading(false);
        }
    }, [fetchStatus, data, user]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png']
        },
        maxSize: 5 * 1024 * 1024,
        multiple: false,
        disabled: uploading || data?.kycStatus === 'verified'
    });

    if (loading) return <PageSkeleton />;

    const statusColors: Record<string, string> = {
        not_submitted: 'bg-gray-500',
        pending: 'bg-yellow-500 text-yellow-950',
        under_review: 'bg-blue-500',
        approved: 'bg-green-500',
        verified: 'bg-green-500',
        rejected: 'bg-red-500',
    };

    const statusIcons: Record<string, any> = {
        not_submitted: AlertCircle,
        pending: Clock,
        under_review: Clock,
        approved: CheckCircle2,
        verified: CheckCircle2,
        rejected: XCircle,
    };

    const StatusIcon = statusIcons[data?.kycStatus || 'not_submitted'] || AlertCircle;
    const isVerified = data?.kycStatus === 'verified' || data?.kycStatus === 'approved';

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">KYC & Compliance</h2>
                    <p className="text-muted-foreground mt-1">
                        Securely verify your identity to unlock core platform features.
                    </p>
                </div>
                <Badge className={`px-4 py-1.5 text-sm flex items-center gap-2 ${statusColors[data?.kycStatus || 'not_submitted']}`}>
                    <StatusIcon className="h-4 w-4" />
                    <span className="capitalize">{(data?.kycStatus || 'Not Submitted').replace('_', ' ')}</span>
                </Badge>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="flex flex-col border-accent/20 shadow-sm relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity" />
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UploadCloud className="h-5 w-5 text-primary" />
                            Upload Document
                        </CardTitle>
                        <CardDescription>
                            {user?.role === 'founder'
                                ? 'Upload your business formation documents or Personal ID'
                                : 'Upload a valid Government ID to verify your investor profile'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <div
                            {...getRootProps()}
                            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 h-full flex flex-col items-center justify-center
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'}
                ${isVerified ? 'opacity-50 cursor-not-allowed' : ''}
              `}
                        >
                            <input {...getInputProps()} />
                            {uploadSuccess ? (
                                <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-500">
                                    <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                        <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                                    </div>
                                    <p className="font-medium text-green-600 dark:text-green-400">Upload Complete!</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                        <FileImage className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    {uploading ? (
                                        <div className="space-y-2">
                                            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                                            <p className="text-sm font-medium">Uploading securely to vault...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="font-medium">Drag & drop your file here</p>
                                            <p className="text-sm text-muted-foreground">or click to browse</p>
                                            <p className="text-xs text-muted-foreground mt-4">
                                                Max 5MB. PDF, JPG, or PNG only.
                                            </p>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="flex flex-col shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                            Status Timeline
                        </CardTitle>
                        <CardDescription>Track the review progress of your documents</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <div className="space-y-6">
                            {data?.documents?.length ? data.documents.map((doc: any, index: number) => (
                                <div key={doc._id} className="relative pl-6 pb-2 border-l last:border-0 border-border">
                                    <div className={`absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full ${doc.status === 'rejected' ? 'bg-red-500' : doc.status === 'approved' ? 'bg-green-500' : 'bg-primary animate-pulse'}`} />
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div>
                                            <p className="font-medium flex items-center gap-2">
                                                {doc.type === 'kyc-business' ? 'Business Registration' : 'Personal ID'}
                                                <Badge variant="outline" className="text-[10px] uppercase">{doc.status.replace('_', ' ')}</Badge>
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1 text-balance">
                                                Submitted: {new Date(doc.submittedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        {doc.documentUrl && (
                                            <Button variant="ghost" size="sm" className="h-8 gap-2" asChild>
                                                <a href={doc.documentUrl} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink className="h-3 w-3" />
                                                    <span className="sr-only sm:not-sr-only">Preview</span>
                                                </a>
                                            </Button>
                                        )}
                                    </div>

                                    {doc.status === 'rejected' && doc.rejectionReason && (
                                        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                            <p className="text-sm text-red-600 dark:text-red-400 font-medium flex items-center gap-2">
                                                <AlertCircle className="h-4 w-4" />
                                                Rejection Reason
                                            </p>
                                            <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1 pl-6">
                                                {doc.rejectionReason}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <FileText className="h-8 w-8 mx-auto mb-3 opacity-20" />
                                    <p>No documents submitted yet.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function KycDashboardWithErrorBoundary() {
    return (
        <ErrorBoundary>
            <KycDashboard />
        </ErrorBoundary>
    );
}
