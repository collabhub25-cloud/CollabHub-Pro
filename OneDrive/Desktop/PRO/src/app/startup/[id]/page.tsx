'use client';

import { use, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store';
import { ArrowLeft, Building2, Users, Globe, Loader2, Briefcase, TrendingUp, FileText, Target, DollarSign, Settings, Edit3 } from 'lucide-react';

interface StartupData {
    _id: string;
    name: string;
    vision: string;
    description: string;
    stage: string;
    industry: string;
    fundingStage: string;
    fundingAmount?: number;
    revenue?: number;
    trustScore: number;
    logo?: string;
    website?: string;
    isActive: boolean;
    createdAt: string;
    founderId?: {
        _id: string;
        name: string;
        role: string;
        avatar?: string;
        trustScore: number;
    };
    team?: Array<{
        _id: string;
        name: string;
        role: string;
        avatar?: string;
    }>;
    rolesNeeded?: Array<{
        title: string;
        description: string;
        skills: string[];
        compensationType: string;
        equityPercent?: number;
        cashAmount?: number;
        status: string;
    }>;
}

const TABS = [
    { id: 'overview', label: 'Overview', icon: Building2 },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'milestones', label: 'Milestones', icon: Target },
    { id: 'agreements', label: 'Agreements', icon: FileText },
    { id: 'funding', label: 'Funding', icon: DollarSign },
    { id: 'settings', label: 'Settings', icon: Settings },
];

const READONLY_TABS = [
    { id: 'overview', label: 'Overview', icon: Building2 },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'funding', label: 'Funding', icon: DollarSign },
];

export default function StartupPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuthStore();
    const [startup, setStartup] = useState<StartupData | null>(null);
    const [fundingRounds, setFundingRounds] = useState<any[]>([]);
    const [agreementCount, setAgreementCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const activeTab = searchParams.get('tab') || 'overview';
    const isFounder = user?._id === (startup?.founderId as any)?._id;
    const tabs = isFounder ? TABS : READONLY_TABS;

    useEffect(() => {
        const fetchStartup = async () => {
            try {
                const res = await fetch(`/api/startups/${id}`, { credentials: 'include' });
                if (!res.ok) throw new Error('Failed to load startup');
                const data = await res.json();
                setStartup(data.startup);
                setFundingRounds(data.fundingRounds || []);
                setAgreementCount(data.agreementCount || 0);
            } catch (err: any) {
                console.error('Startup fetch error:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchStartup();
    }, [id]);

    const setTab = (tab: string) => {
        router.replace(`/startup/${id}?tab=${tab}`, { scroll: false });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: '#F4F2ED' }}>
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#B05A4F' }} />
            </div>
        );
    }

    if (error || !startup) {
        return (
            <div className="min-h-screen" style={{ background: '#F4F2ED', color: '#2A2623' }}>
                <div className="max-w-5xl mx-auto px-6 py-12">
                    <button onClick={() => router.back()} className="flex items-center gap-2 text-sm mb-6" style={{ color: '#6C635C' }}>
                        <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                    <p className="text-lg">{error || 'Startup not found.'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen" style={{ background: '#F4F2ED', color: '#2A2623' }}>
            <div className="max-w-5xl mx-auto px-6 py-8">
                {/* Back */}
                <button onClick={() => router.back()} className="flex items-center gap-2 text-sm mb-6" style={{ color: '#6C635C' }}>
                    <ArrowLeft className="h-4 w-4" /> Back
                </button>

                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-start gap-4">
                        {startup.logo ? (
                            <img src={startup.logo} alt={startup.name} className="h-14 w-14 rounded object-cover" />
                        ) : (
                            <div className="h-14 w-14 rounded flex items-center justify-center" style={{ background: '#EDE9E3' }}>
                                <Building2 className="h-6 w-6" style={{ color: '#6C635C' }} />
                            </div>
                        )}
                        <div>
                            <h1 className="text-2xl font-medium">{startup.name}</h1>
                            <p className="text-sm mt-1" style={{ color: '#6C635C' }}>
                                {startup.industry} · {startup.stage} · {startup.fundingStage}
                            </p>
                            <div className="flex gap-3 mt-2">
                                <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#EDE9E3', color: '#6C635C' }}>
                                    Trust: {startup.trustScore ?? 0}/100
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded" style={{ background: startup.isActive ? '#e6f4ea' : '#EDE9E3', color: startup.isActive ? '#1a7f37' : '#6C635C' }}>
                                    {startup.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                    </div>
                    {isFounder && (
                        <button onClick={() => router.push(`/startup/${id}/edit`)} className="flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors" style={{ background: '#2A2623', color: '#FBF9F6' }}>
                            <Edit3 className="h-3.5 w-3.5" /> Edit
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-0 border-b mb-8" style={{ borderColor: '#D8D2C8' }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setTab(tab.id)}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm transition-colors"
                            style={{
                                borderBottom: activeTab === tab.id ? '2px solid #2A2623' : '2px solid transparent',
                                color: activeTab === tab.id ? '#2A2623' : '#6C635C',
                                fontWeight: activeTab === tab.id ? 500 : 400,
                            }}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <div className="space-y-8">
                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                ['Trust Score', `${startup.trustScore ?? 0}/100`],
                                ['Stage', startup.stage],
                                ['Agreements', `${agreementCount}`],
                                ['Funding', startup.fundingStage],
                            ].map(([label, value]) => (
                                <div key={label} className="px-4 py-3 rounded" style={{ background: '#FBF9F6', border: '1px solid #D8D2C8' }}>
                                    <p className="text-xs" style={{ color: '#6C635C' }}>{label}</p>
                                    <p className="text-sm font-medium mt-1 capitalize">{value}</p>
                                </div>
                            ))}
                        </div>

                        <section>
                            <h2 className="text-base font-medium mb-3">Vision</h2>
                            <p className="text-sm leading-relaxed" style={{ color: '#6C635C' }}>{startup.vision}</p>
                        </section>

                        <section>
                            <h2 className="text-base font-medium mb-3">Description</h2>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#6C635C' }}>{startup.description}</p>
                        </section>

                        {startup.founderId && (
                            <section>
                                <h2 className="text-base font-medium mb-3">Founder</h2>
                                <button
                                    onClick={() => router.push(`/profile/${(startup.founderId as any)._id}`)}
                                    className="flex items-center gap-3 px-4 py-3 rounded transition-colors w-full text-left"
                                    style={{ background: '#FBF9F6', border: '1px solid #D8D2C8' }}
                                >
                                    <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium" style={{ background: '#EDE9E3' }}>
                                        {(startup.founderId as any).name?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{(startup.founderId as any).name}</p>
                                        <p className="text-xs" style={{ color: '#6C635C' }}>Trust: {(startup.founderId as any).trustScore}/100</p>
                                    </div>
                                </button>
                            </section>
                        )}

                        {startup.website && (
                            <a href={startup.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm" style={{ color: '#B05A4F' }}>
                                <Globe className="h-4 w-4" /> {startup.website}
                            </a>
                        )}
                    </div>
                )}

                {activeTab === 'team' && (
                    <div className="space-y-6">
                        <h2 className="text-base font-medium">Team ({startup.team?.length || 0} members)</h2>
                        {startup.team && startup.team.length > 0 ? (
                            <div className="space-y-2">
                                {startup.team.map((member: any) => (
                                    <button
                                        key={member._id}
                                        onClick={() => router.push(`/profile/${member._id}`)}
                                        className="flex items-center gap-3 px-4 py-3 rounded w-full text-left"
                                        style={{ background: '#FBF9F6', border: '1px solid #D8D2C8' }}
                                    >
                                        <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium" style={{ background: '#EDE9E3' }}>
                                            {member.name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{member.name}</p>
                                            <p className="text-xs capitalize" style={{ color: '#6C635C' }}>{member.role}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm" style={{ color: '#6C635C' }}>No team members yet.</p>
                        )}

                        {/* Open Roles */}
                        {startup.rolesNeeded && startup.rolesNeeded.filter(r => r.status === 'open').length > 0 && (
                            <div>
                                <h3 className="text-sm font-medium mb-3">Open Roles</h3>
                                <div className="space-y-3">
                                    {startup.rolesNeeded.filter(r => r.status === 'open').map((role, i) => (
                                        <div key={i} className="px-4 py-3 rounded" style={{ background: '#FBF9F6', border: '1px solid #D8D2C8' }}>
                                            <p className="text-sm font-medium">{role.title}</p>
                                            <p className="text-xs mt-1" style={{ color: '#6C635C' }}>{role.description}</p>
                                            <div className="flex gap-2 mt-2 flex-wrap">
                                                {role.skills.map(s => (
                                                    <span key={s} className="text-xs px-2 py-0.5 rounded" style={{ background: '#EDE9E3', color: '#6C635C' }}>{s}</span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'milestones' && isFounder && (
                    <div className="space-y-4">
                        <h2 className="text-base font-medium">Milestones</h2>
                        <p className="text-sm" style={{ color: '#6C635C' }}>Milestones for this startup will appear here. Create milestones to track deliverables.</p>
                    </div>
                )}

                {activeTab === 'agreements' && isFounder && (
                    <div className="space-y-4">
                        <h2 className="text-base font-medium">Agreements ({agreementCount})</h2>
                        <p className="text-sm" style={{ color: '#6C635C' }}>Agreements scoped to this startup will appear here.</p>
                    </div>
                )}

                {activeTab === 'funding' && (
                    <div className="space-y-4">
                        <h2 className="text-base font-medium">Funding Rounds</h2>
                        {fundingRounds.length > 0 ? (
                            <div className="space-y-2">
                                {fundingRounds.map((round: any) => (
                                    <div key={round._id} className="flex items-center justify-between px-4 py-3 rounded" style={{ background: '#FBF9F6', border: '1px solid #D8D2C8' }}>
                                        <div>
                                            <p className="text-sm font-medium capitalize">{round.roundType || round.type}</p>
                                            <p className="text-xs" style={{ color: '#6C635C' }}>
                                                {new Date(round.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium font-mono">${(round.targetAmount || 0).toLocaleString()}</p>
                                            <p className="text-xs capitalize" style={{ color: '#6C635C' }}>{round.status}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm" style={{ color: '#6C635C' }}>No funding rounds yet.</p>
                        )}
                    </div>
                )}

                {activeTab === 'settings' && isFounder && (
                    <div className="space-y-4">
                        <h2 className="text-base font-medium">Startup Settings</h2>
                        <p className="text-sm" style={{ color: '#6C635C' }}>Manage startup details, visibility, and team permissions.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
