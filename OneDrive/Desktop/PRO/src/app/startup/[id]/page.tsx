'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Users, Globe, Loader2, Briefcase, TrendingUp } from 'lucide-react';

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
        status: string;
    }>;
}

export default function StartupPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const router = useRouter();
    const [startup, setStartup] = useState<StartupData | null>(null);
    const [fundingRounds, setFundingRounds] = useState<any[]>([]);
    const [agreementCount, setAgreementCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchStartup();
    }, [id]);

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
                <div className="max-w-4xl mx-auto px-6 py-12">
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
            <div className="max-w-4xl mx-auto px-6 py-8">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-sm mb-8" style={{ color: '#6C635C' }}>
                    <ArrowLeft className="h-4 w-4" /> Back
                </button>

                {/* Header */}
                <div className="flex items-start gap-4 mb-8">
                    {startup.logo ? (
                        <img src={startup.logo} alt={startup.name} className="h-14 w-14 rounded object-cover" />
                    ) : (
                        <div className="h-14 w-14 rounded flex items-center justify-center" style={{ background: '#EDE9E3' }}>
                            <Building2 className="h-6 w-6" style={{ color: '#6C635C' }} />
                        </div>
                    )}
                    <div>
                        <h1 className="text-2xl font-medium">{startup.name}</h1>
                        <p className="text-sm mt-1" style={{ color: '#6C635C' }}>{startup.industry} · {startup.stage} · {startup.fundingStage}</p>
                    </div>
                </div>

                {/* Summary stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                    {[
                        ['Trust Score', `${startup.trustScore}/100`],
                        ['Funding Stage', startup.fundingStage],
                        ['Agreements', `${agreementCount}`],
                        ['Status', startup.isActive ? 'Active' : 'Inactive'],
                    ].map(([label, value]) => (
                        <div key={label} className="px-4 py-3 rounded" style={{ background: '#FBF9F6', border: '1px solid #D8D2C8' }}>
                            <p className="text-xs" style={{ color: '#6C635C' }}>{label}</p>
                            <p className="text-sm font-medium mt-1">{value}</p>
                        </div>
                    ))}
                </div>

                {/* Vision & Description */}
                <section className="mb-8">
                    <h2 className="text-base font-medium mb-3">Vision</h2>
                    <p className="text-sm leading-relaxed" style={{ color: '#6C635C' }}>{startup.vision}</p>
                </section>

                <section className="mb-10">
                    <h2 className="text-base font-medium mb-3">Description</h2>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#6C635C' }}>{startup.description}</p>
                </section>

                <hr style={{ borderColor: '#D8D2C8' }} className="mb-8" />

                {/* Founder */}
                {startup.founderId && (
                    <section className="mb-8">
                        <h2 className="text-base font-medium mb-3">Founder</h2>
                        <button
                            onClick={() => router.push(`/profile/${(startup.founderId as any)._id}`)}
                            className="flex items-center gap-3 px-4 py-3 rounded transition-colors"
                            style={{ background: '#FBF9F6', border: '1px solid #D8D2C8' }}
                        >
                            <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium" style={{ background: '#EDE9E3' }}>
                                {(startup.founderId as any).name?.charAt(0) || '?'}
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-medium">{(startup.founderId as any).name}</p>
                                <p className="text-xs" style={{ color: '#6C635C' }}>Trust: {(startup.founderId as any).trustScore}/100</p>
                            </div>
                        </button>
                    </section>
                )}

                {/* Team */}
                {startup.team && startup.team.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-base font-medium mb-3">Team ({startup.team.length})</h2>
                        <div className="space-y-2">
                            {startup.team.map((member: any) => (
                                <button
                                    key={member._id}
                                    onClick={() => router.push(`/profile/${member._id}`)}
                                    className="flex items-center gap-3 px-4 py-2 rounded w-full text-left transition-colors"
                                    style={{ background: '#FBF9F6', border: '1px solid #D8D2C8' }}
                                >
                                    <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium" style={{ background: '#EDE9E3' }}>
                                        {member.name?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                        <p className="text-sm">{member.name}</p>
                                        <p className="text-xs capitalize" style={{ color: '#6C635C' }}>{member.role}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {/* Open Roles */}
                {startup.rolesNeeded && startup.rolesNeeded.filter(r => r.status === 'open').length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-base font-medium mb-3">Open Roles</h2>
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
                    </section>
                )}

                {/* Funding Rounds */}
                {fundingRounds.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-base font-medium mb-3">Funding Rounds</h2>
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
                    </section>
                )}

                {/* Website */}
                {startup.website && (
                    <section className="mb-8">
                        <a href={startup.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm" style={{ color: '#B05A4F' }}>
                            <Globe className="h-4 w-4" /> {startup.website}
                        </a>
                    </section>
                )}
            </div>
        </div>
    );
}
