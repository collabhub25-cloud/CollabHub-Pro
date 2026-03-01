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

            const res = await fetch(`/api/startups/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
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
            <div className="min-h-screen flex items-center justify-center" style={{ background: '#F4F2ED' }}>
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#B05A4F' }} />
            </div>
        );
    }

    const stages = ['idea', 'validation', 'mvp', 'growth', 'scaling'];
    const fundingStages = ['pre-seed', 'seed', 'series-a', 'series-b', 'series-c', 'ipo'];

    return (
        <div className="min-h-screen" style={{ background: '#F4F2ED', color: '#2A2623' }}>
            <div className="max-w-3xl mx-auto px-6 py-8">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-sm mb-6" style={{ color: '#6C635C' }}>
                    <ArrowLeft className="h-4 w-4" /> Back
                </button>

                <h1 className="text-2xl font-medium mb-8">Edit Startup</h1>

                {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

                <div className="space-y-6">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Name</label>
                        <input
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full px-3 py-2 rounded text-sm focus:outline-none"
                            style={{ background: '#FBF9F6', border: '1px solid #D8D2C8' }}
                        />
                    </div>

                    {/* Vision */}
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Vision</label>
                        <input
                            value={form.vision}
                            onChange={(e) => setForm({ ...form, vision: e.target.value })}
                            className="w-full px-3 py-2 rounded text-sm focus:outline-none"
                            style={{ background: '#FBF9F6', border: '1px solid #D8D2C8' }}
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
                            className="w-full px-3 py-2 rounded text-sm resize-none focus:outline-none"
                            style={{ background: '#FBF9F6', border: '1px solid #D8D2C8' }}
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
                                className="w-full px-3 py-2 rounded text-sm focus:outline-none"
                                style={{ background: '#FBF9F6', border: '1px solid #D8D2C8' }}
                            >
                                {stages.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Industry</label>
                            <input
                                value={form.industry}
                                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                                className="w-full px-3 py-2 rounded text-sm focus:outline-none"
                                style={{ background: '#FBF9F6', border: '1px solid #D8D2C8' }}
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
                                className="w-full px-3 py-2 rounded text-sm focus:outline-none"
                                style={{ background: '#FBF9F6', border: '1px solid #D8D2C8' }}
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
                                className="w-full px-3 py-2 rounded text-sm focus:outline-none"
                                style={{ background: '#FBF9F6', border: '1px solid #D8D2C8' }}
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
                            className="w-full px-3 py-2 rounded text-sm focus:outline-none"
                            style={{ background: '#FBF9F6', border: '1px solid #D8D2C8' }}
                            placeholder="https://"
                        />
                    </div>

                    {/* Save */}
                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
                            style={{ background: '#2A2623', color: '#FBF9F6' }}
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                            onClick={() => router.back()}
                            className="px-5 py-2 rounded text-sm"
                            style={{ border: '1px solid #D8D2C8', color: '#6C635C' }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
