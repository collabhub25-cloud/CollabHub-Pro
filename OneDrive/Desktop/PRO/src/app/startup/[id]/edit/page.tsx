'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

export default function StartupEditPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const router = useRouter();
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        name: '',
        vision: '',
        description: '',
        stage: '',
        industry: '',
        fundingStage: '',
        fundingAmount: '',
        website: '',
    });

    useEffect(() => {
        const fetchStartup = async () => {
            try {
                const res = await fetch(`/api/startups/${id}`, { credentials: 'include' });
                if (!res.ok) throw new Error('Failed to load startup');
                const data = await res.json();
                const s = data.startup;

                // Verify founder
                if (user?._id !== s.founderId?._id) {
                    router.replace(`/startup/${id}`);
                    return;
                }

                setForm({
                    name: s.name || '',
                    vision: s.vision || '',
                    description: s.description || '',
                    stage: s.stage || '',
                    industry: s.industry || '',
                    fundingStage: s.fundingStage || '',
                    fundingAmount: s.fundingAmount?.toString() || '',
                    website: s.website || '',
                });
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchStartup();
    }, [id, user, router]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload: Record<string, any> = { ...form };
            if (payload.fundingAmount) payload.fundingAmount = Number(payload.fundingAmount);
            else delete payload.fundingAmount;

            const { apiFetch } = await import('@/lib/api-client');
            const res = await apiFetch(`/api/startups/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to save');
            }

            router.push(`/startup/${id}?tab=overview`);
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const stages = ['idea', 'validation', 'mvp', 'growth', 'scaling'];
    const fundingStages = ['pre-seed', 'seed', 'series-a', 'series-b', 'series-c', 'ipo'];

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-3xl mx-auto px-6 py-8">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-sm mb-6 text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" /> Back
                </button>

                <h1 className="text-2xl font-medium mb-8">Edit Startup</h1>

                {error && <p className="text-sm text-destructive mb-4">{error}</p>}

                <div className="space-y-6">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Name</label>
                        <input
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background border border-border"
                        />
                    </div>

                    {/* Vision */}
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Vision</label>
                        <input
                            value={form.vision}
                            onChange={(e) => setForm({ ...form, vision: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background border border-border"
                            maxLength={500}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Description</label>
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            rows={4}
                            className="w-full px-3.5 py-2.5 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background border border-border"
                            maxLength={2000}
                        />
                    </div>

                    {/* Stage + Industry */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Stage</label>
                            <select
                                value={form.stage}
                                onChange={(e) => setForm({ ...form, stage: e.target.value })}
                                className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background border border-border"
                            >
                                {stages.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Industry</label>
                            <input
                                value={form.industry}
                                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                                className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background border border-border"
                            />
                        </div>
                    </div>

                    {/* Funding Stage + Amount */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Funding Stage</label>
                            <select
                                value={form.fundingStage}
                                onChange={(e) => setForm({ ...form, fundingStage: e.target.value })}
                                className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background border border-border"
                            >
                                {fundingStages.map(s => <option key={s} value={s}>{s.replace('-', ' ')}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Funding Target ($)</label>
                            <input
                                type="number"
                                value={form.fundingAmount}
                                onChange={(e) => setForm({ ...form, fundingAmount: e.target.value })}
                                className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background border border-border"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    {/* Website */}
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Website</label>
                        <input
                            value={form.website}
                            onChange={(e) => setForm({ ...form, website: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background border border-border"
                            placeholder="https://"
                        />
                    </div>

                    {/* Save */}
                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 hover:opacity-90 bg-primary text-primary-foreground"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                            onClick={() => router.back()}
                            className="px-6 py-2.5 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
