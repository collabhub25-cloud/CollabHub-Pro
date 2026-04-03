'use client';

import { use, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store';
import {
    ArrowLeft, Building2, Users, Globe, Loader2,
    TrendingUp, DollarSign, Settings, Edit3, Target,
    Check, X, BadgeCheck, Heart, Send, Clock, CheckCircle2, Lock,
    Pencil, AlertTriangle, Activity, Plus
} from 'lucide-react';
import { AlloySphereVerifiedBadge } from '@/components/ui/alloysphere-verified-badge';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

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
    skillsNeeded?: string[];
    pastProgress?: string;
    achievements?: string;

    logo?: string;
    website?: string;
    isActive: boolean;
    AlloySphereVerified?: boolean;
    AlloySphereVerifiedAt?: string;
    createdAt: string;
    founderId?: {
        _id: string;
        name: string;
        role: string;
        avatar?: string;

    };
    team?: Array<{
        _id: string;
        name: string;
        role: string;
        avatar?: string;
        skills?: string[];
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

interface TeamMemberData {
    _id: string;
    userId: { _id: string; name: string; role: string; avatar?: string; skills?: string[] };
    startupId: string;
    role: string;
    skills: string[];
    equity: number;
    status: 'active' | 'inactive';
    joinedAt: string;
}



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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Team member states
    const [teamMembers, setTeamMembers] = useState<TeamMemberData[]>([]);
    const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
    const [editMemberData, setEditMemberData] = useState({ role: '', equity: 0, status: 'active' as string });
    const [savingMember, setSavingMember] = useState(false);



    // Investor action states
    const [isFavorite, setIsFavorite] = useState(false);
    const [accessStatus, setAccessStatus] = useState<string | null>(null);
    const [showAccessModal, setShowAccessModal] = useState(false);
    const [accessMessage, setAccessMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [showRoleModal, setShowRoleModal] = useState(false);
    const [newRole, setNewRole] = useState({
        title: '',
        description: '',
        skills: '',
        compensationType: 'mixed'
    });

    const activeTab = searchParams.get('tab') || 'overview';
    const founderId = typeof startup?.founderId === 'object' 
        ? (startup.founderId as any)?._id 
        : startup?.founderId;
    const isFounder = !!user && !!startup && !!founderId && user._id === String(founderId);
    const isInvestor = user?.role === 'investor';
    
    // Build tabs dynamically
    const baseTabs = [
        { id: 'overview', label: 'Overview', icon: Building2 },
        { id: 'journey', label: 'Journey', icon: Activity },
        { id: 'team', label: 'Team', icon: Users },
        { id: 'funding', label: 'Funding', icon: DollarSign },
    ];
    
    const tabs = [...baseTabs];
    if (isFounder) {
        tabs.push({ id: 'settings', label: 'Settings', icon: Settings });
    }

    useEffect(() => {
        const fetchStartup = async () => {
            try {
                const res = await fetch(`/api/startups/${id}`, { credentials: 'include' });
                if (!res.ok) throw new Error('Failed to load startup');
                const data = await res.json();
                setStartup(data.startup);
                setFundingRounds(data.fundingRounds || []);
                setTeamMembers(data.teamMembers || []);
            } catch (err: any) {
                console.error('Startup fetch error:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchStartup();
    }, [id]);

    const [journeyPosts, setJourneyPosts] = useState<any[]>([]);
    const [journeyLoading, setJourneyLoading] = useState(false);
    const [showJourneyModal, setShowJourneyModal] = useState(false);
    const [newJourneyPost, setNewJourneyPost] = useState({
        title: '',
        description: '',
        postType: 'general'
    });

    useEffect(() => {
        if (activeTab !== 'journey') return;
        const fetchJourney = async () => {
            setJourneyLoading(true);
            try {
                const res = await fetch(`/api/startup/journey?startupId=${id}`, { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    setJourneyPosts(data.posts || []);
                }
            } catch (err) {
                console.error('Error fetching journey posts:', err);
            } finally {
                setJourneyLoading(false);
            }
        };
        fetchJourney();
    }, [activeTab, id]);

    // Fetch investor-specific data (favorite status + access request status)
    useEffect(() => {
        if (!isInvestor || !user) return;
        const fetchInvestorData = async () => {
            try {
                // Check favorites
                const favRes = await fetch('/api/favorites', { credentials: 'include' });
                if (favRes.ok) {
                    const favData = await favRes.json();
                    setIsFavorite((favData.favoriteIds || []).includes(id));
                }
                // Check access requests
                const accessRes = await fetch(`/api/funding/request-access?startupId=${id}`, { credentials: 'include' });
                if (accessRes.ok) {
                    const accessData = await accessRes.json();
                    const myRequest = (accessData.requests || []).find((r: any) =>
                        r.startupId?._id === id || r.startupId === id
                    );
                    setAccessStatus(myRequest?.status || null);
                }
            } catch (err) {
                console.error('Error fetching investor data:', err);
            }
        };
        fetchInvestorData();
    }, [isInvestor, user, id]);

    const setTab = (tab: string) => {
        router.replace(`/startup/${id}?tab=${tab}`, { scroll: false });
    };





    // Investor actions
    const toggleFavorite = async () => {
        try {
            const res = await fetch('/api/favorites', {
                credentials: 'include',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ startupId: id }),
            });
            if (res.ok) {
                const data = await res.json();
                setIsFavorite(data.isFavorite);
                toast.success(data.isFavorite ? 'Added to watchlist' : 'Removed from watchlist');
            }
        } catch {
            toast.error('Failed to update watchlist');
        }
    };

    const handleRequestAccess = async () => {
        setSubmitting(true);
        try {
            const res = await fetch('/api/funding/request-access', {
                credentials: 'include',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ startupId: id, message: accessMessage }),
            });
            const data = await res.json();
            if (res.ok) {
                setAccessStatus('pending');
                setShowAccessModal(false);
                setAccessMessage('');
                toast.success('Access request sent to founder!');
            } else {
                toast.error(data.error || 'Failed to send request');
            }
        } catch {
            toast.error('Failed to send request');
        }
        setSubmitting(false);
    };

    const handleAddRole = async () => {
        setSubmitting(true);
        try {
            const rolePayload = {
                title: newRole.title,
                description: newRole.description,
                skills: newRole.skills.split(',').map(s => s.trim()).filter(Boolean),
                compensationType: newRole.compensationType,
                status: 'open'
            };
            
            const updatedRoles = [...(startup?.rolesNeeded || []), rolePayload];
            const res = await fetch(`/api/startups/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rolesNeeded: updatedRoles }),
            });
            
            if (res.ok) {
                const data = await res.json();
                setStartup(data.startup);
                setShowRoleModal(false);
                setNewRole({ title: '', description: '', skills: '', compensationType: 'mixed' });
                toast.success('Role added successfully!');
            } else {
                toast.error('Failed to add role');
            }
        } catch (err) {
             toast.error('An error occurred');
        }
        setSubmitting(false);
    };

    const handleCreateJourneyPost = async () => {
        setSubmitting(true);
        try {
            const res = await fetch('/api/startup/journey', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startupId: id,
                    ...newJourneyPost
                })
            });
            if (res.ok) {
                const data = await res.json();
                setJourneyPosts([data.post, ...journeyPosts]);
                setShowJourneyModal(false);
                setNewJourneyPost({ title: '', description: '', postType: 'general' });
                toast.success('Journey post published!');
            } else {
                toast.error('Failed to publish post');
            }
        } catch {
            toast.error('An error occurred');
        }
        setSubmitting(false);
    };

    const handleSaveTeamMember = async (memberId: string) => {
        setSavingMember(true);
        try {
            const res = await fetch(`/api/team/${memberId}`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editMemberData),
            });
            if (res.ok) {
                const data = await res.json();
                setTeamMembers(prev => prev.map(m => m._id === memberId ? data.member : m));
                setEditingMemberId(null);
                toast.success('Team member updated!');
            } else {
                toast.error('Failed to update team member');
            }
        } catch {
            toast.error('An error occurred');
        }
        setSavingMember(false);
    };



    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Loading startup...</span>
                </div>
            </div>
        );
    }

    if (error || !startup) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
                <div className="max-w-5xl mx-auto px-6 py-12">
                    <button onClick={() => router.back()} className="flex items-center gap-2 text-sm mb-6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                        <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                    <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-200 dark:border-gray-800 text-center shadow-sm">
                        <Building2 className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">{error || 'Startup not found.'}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 page-enter">
            <div className="max-w-5xl mx-auto px-6 py-8">
                {/* Back */}
                <button onClick={() => router.back()} className="flex items-center gap-2 text-sm mb-6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors group">
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" /> Back
                </button>

                {/* Header */}
                <div className="flex items-start justify-between mb-8 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="flex items-start gap-5">
                        {startup.logo ? (
                            <img src={startup.logo} alt={startup.name} className="h-16 w-16 rounded-2xl object-cover shadow-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800" />
                        ) : (
                            <div className="h-16 w-16 rounded-2xl flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 shadow-sm border border-gray-200 dark:border-gray-800">
                                <Building2 className="h-7 w-7 text-blue-500 dark:text-blue-400" />
                            </div>
                        )}
                        <div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{startup.name}</h1>
                                <AlloySphereVerifiedBadge
                                    verified={startup.AlloySphereVerified || false}
                                    verifiedAt={startup.AlloySphereVerifiedAt}
                                    variant="full"
                                />
                            </div>
                            <p className="text-sm mt-1.5 text-gray-600 dark:text-gray-400 font-medium">
                                {startup.industry} · {startup.stage} · {startup.fundingStage}
                            </p>
                            <div className="flex gap-3 mt-3">

                                <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm border ${startup.isActive ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/30' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'}`}>
                                    {startup.isActive ? '● Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Investor Actions */}
                        {isInvestor && !isFounder && (
                            <>
                                <button
                                    onClick={toggleFavorite}
                                    className={`flex items-center justify-center h-10 w-10 rounded-xl border transition-all duration-200 ${isFavorite
                                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30 text-red-500 shadow-sm'
                                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 hover:text-red-500 hover:border-red-200 dark:hover:border-red-800/30 hover:bg-red-50 dark:hover:bg-red-900/20'
                                        }`}
                                    title={isFavorite ? 'Remove from watchlist' : 'Add to watchlist'}
                                >
                                    <Heart className={`h-4 w-4 transition-all ${isFavorite ? 'fill-current scale-110' : ''}`} />
                                </button>
                                {accessStatus === 'approved' ? (
                                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/30">
                                        <CheckCircle2 className="h-4 w-4" /> Access Granted
                                    </div>
                                ) : accessStatus === 'pending' ? (
                                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800/30">
                                        <Clock className="h-4 w-4" /> Pending
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowAccessModal(true)}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md"
                                    >
                                        <Send className="h-4 w-4" /> Request Access
                                    </button>
                                )}
                            </>
                        )}
                        {/* Founder Edit */}
                        {isFounder && (
                            <button onClick={() => router.push(`/startup/${id}/edit`)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 shadow-sm hover:shadow-md">
                                <Edit3 className="h-4 w-4" /> Edit
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-xl mb-8 overflow-x-auto custom-scrollbar">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 whitespace-nowrap rounded-lg ${activeTab === tab.id
                                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
                                }`}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[

                                ['Stage', startup.stage, 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'],
                                ['Industry', startup.industry, 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'],
                                ['Funding', startup.fundingStage, 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'],
                            ].map(([label, value, className]) => (
                                <div key={label as string} className={`px-4 py-4 rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 ${className}`}>
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
                                    <p className="text-lg font-bold mt-1 text-gray-900 dark:text-gray-100 capitalize">{value}</p>
                                </div>
                            ))}
                            {/* AlloySphere Verified stat card */}
                            <div
                                className={`px-4 py-4 rounded-xl border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${startup.AlloySphereVerified
                                    ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200/50 dark:border-blue-800/30'
                                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                                    }`}
                            >
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Verified</p>
                                <div className="flex items-center gap-1.5 mt-1.5">
                                    {startup.AlloySphereVerified ? (
                                        <>
                                            <BadgeCheck className="h-4 w-4" style={{ color: 'var(--sea-green)' }} />
                                            <span className="text-sm font-medium" style={{ color: 'var(--sea-green)' }}>Yes</span>
                                        </>
                                    ) : (
                                        <span className="text-sm font-medium text-gray-400 dark:text-gray-500">No</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <section className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200">
                            <h2 className="text-lg font-bold mb-3 text-gray-900 dark:text-gray-100">Vision</h2>
                            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">{startup.vision}</p>
                        </section>

                        <section className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200">
                            <h2 className="text-lg font-bold mb-3 text-gray-900 dark:text-gray-100">Description</h2>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-600 dark:text-gray-400">{startup.description}</p>
                        </section>

                        {startup.founderId && (
                            <section className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200">
                                <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">Founder</h2>
                                <button
                                    onClick={() => router.push(`/profile/${(startup.founderId as any)._id}`)}
                                    className="flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-200 w-full text-left bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-sm"
                                >
                                    <div className="h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 dark:from-blue-900/50 dark:to-blue-800/30 dark:text-blue-300">
                                        {(startup.founderId as any).name?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{(startup.founderId as any).name}</p>

                                    </div>
                                </button>
                            </section>
                        )}

                        {startup.website && (
                            <a href={startup.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                                <Globe className="h-4 w-4" /> {startup.website}
                            </a>
                        )}

                        {startup.skillsNeeded && startup.skillsNeeded.length > 0 && (
                            <section className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200">
                                <h2 className="text-lg font-bold mb-3 text-gray-900 dark:text-gray-100">Skills Needed</h2>
                                <div className="flex gap-2 flex-wrap">
                                    {startup.skillsNeeded.map(s => (
                                        <span key={s} className="text-sm font-medium px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/30">{s}</span>
                                    ))}
                                </div>
                            </section>
                        )}

                        {startup.pastProgress && (
                            <section className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200">
                                <h2 className="text-lg font-bold mb-3 text-gray-900 dark:text-gray-100">Past Progress</h2>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-600 dark:text-gray-400">{startup.pastProgress}</p>
                            </section>
                        )}



                        {/* Open Roles section moved to overview */}
                        <div className="mt-8">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Open Roles</h3>
                                {isFounder && (
                                    <button onClick={() => setShowRoleModal(true)} className="flex items-center gap-2 text-sm font-medium px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">
                                        + Add Role
                                    </button>
                                )}
                            </div>
                            {startup.rolesNeeded && startup.rolesNeeded.filter(r => r.status === 'open').length > 0 ? (
                                <div className="space-y-4">
                                    {startup.rolesNeeded.filter(r => r.status === 'open').map((role, i) => (
                                        <div key={i} className="p-5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200">
                                            <div className="flex justify-between items-start">
                                                <p className="text-base font-bold text-gray-900 dark:text-gray-100">{role.title}</p>
                                                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800/30">
                                                    {role.compensationType}
                                                </span>
                                            </div>
                                            <p className="text-sm mt-2 text-gray-600 dark:text-gray-400 leading-relaxed">{role.description}</p>
                                            <div className="flex gap-2 mt-4 flex-wrap">
                                                {role.skills.map(s => (
                                                    <span key={s} className="text-xs font-medium px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">{s}</span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">No open roles at the moment.</p>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'journey' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Journey Feed</h2>
                            {isFounder && (
                                <button
                                    onClick={() => setShowJourneyModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-sm"
                                >
                                    <Plus className="h-4 w-4" /> New Update
                                </button>
                            )}
                        </div>

                        {journeyLoading ? (
                            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
                        ) : journeyPosts.length === 0 ? (
                            <div className="bg-white dark:bg-gray-900 py-12 px-6 rounded-2xl border border-gray-200 dark:border-gray-800 text-center shadow-sm">
                                <Activity className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No updates yet</h3>
                                <p className="text-sm text-gray-500 max-w-sm mx-auto">This startup hasn't shared any journey milestones or updates yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 dark:before:via-gray-800 before:to-transparent">
                                {journeyPosts.map((post: any, i: number) => (
                                    <div key={post._id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        {/* Icon */}
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-gray-950 bg-blue-100 dark:bg-blue-900 text-blue-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm relative z-10">
                                            {post.postType === 'milestone' ? <Target className="h-4 w-4" /> :
                                                post.postType === 'funding' ? <DollarSign className="h-4 w-4 text-emerald-500" /> :
                                                <Activity className="h-4 w-4" />}
                                        </div>
                                        {/* Card */}
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex items-center justify-between mb-2">
                                                <Badge variant="outline" className="capitalize text-xs bg-gray-50 dark:bg-gray-800">{post.postType.replace('_', ' ')}</Badge>
                                                <div className="flex items-center text-xs text-gray-500">
                                                    <Clock className="w-3 h-3 justify-center mr-1" />
                                                    {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                            </div>
                                            {post.title && <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">{post.title}</h3>}
                                            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{post.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'team' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Team ({startup.team?.length || 0})</h2>
                        {(() => {
                            // Use enriched teamMembers if available, fallback to basic team refs
                            const hasEnriched = teamMembers.length > 0;
                            const displayList = hasEnriched ? teamMembers : (startup.team || []).map((m: any) => ({
                                _id: m._id,
                                userId: { _id: m._id, name: m.name, role: m.role, avatar: m.avatar, skills: m.skills },
                                role: '',
                                skills: m.skills || [],
                                equity: 0,
                                status: 'active' as const,
                                joinedAt: '',
                                startupId: id,
                            }));

                            if (displayList.length === 0) {
                                return (
                                    <div className="bg-white dark:bg-gray-900 p-8 rounded-xl border border-gray-200 dark:border-gray-800 text-center shadow-sm">
                                        <Users className="h-8 w-8 mx-auto text-gray-400 mb-3" />
                                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">No team members yet.</p>
                                    </div>
                                );
                            }

                            return (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {displayList.map((member: any) => {
                                        const userInfo = member.userId || member;
                                        const userId = userInfo._id;
                                        const isEditing = editingMemberId === member._id;

                                        return (
                                            <div
                                                key={member._id}
                                                className="flex items-center justify-between px-5 py-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                                            >
                                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                                    <button onClick={() => router.push(`/profile/${userId}`)} className="shrink-0">
                                                        <div className="h-11 w-11 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 dark:from-blue-900/50 dark:to-blue-800/30 dark:text-blue-300 hover:ring-2 hover:ring-blue-400 transition-all">
                                                            {userInfo.name?.charAt(0) || '?'}
                                                        </div>
                                                    </button>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <button onClick={() => router.push(`/profile/${userId}`)} className="hover:underline">
                                                                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{userInfo.name}</h3>
                                                            </button>
                                                            {member.isFounder && (
                                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30 flex items-center gap-1">
                                                                    👑 Founder
                                                                </span>
                                                            )}
                                                        </div>
                                                        {isEditing ? (
                                                            <input
                                                                value={editMemberData.role}
                                                                onChange={e => setEditMemberData({ ...editMemberData, role: e.target.value })}
                                                                className="text-xs mt-0.5 w-full px-2 py-1 rounded-md border border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/20 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700 dark:text-gray-200"
                                                                placeholder="e.g., Frontend Developer"
                                                            />
                                                        ) : (
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
                                                                {member.role || 'No role assigned'}
                                                            </p>
                                                        )}
                                                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                                            {(member.skills?.length > 0 ? member.skills : userInfo.skills || []).slice(0, 3).map((skill: string) => (
                                                                <span key={skill} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/30">
                                                                    {skill}
                                                                </span>
                                                            ))}
                                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                                                                member.status === 'active'
                                                                    ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/30'
                                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                                                            }`}>
                                                                {member.status === 'active' ? '● Active' : '○ Inactive'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="text-right shrink-0 ml-3 flex flex-col items-end gap-1">
                                                    {isEditing ? (
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center gap-1">
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    max={100}
                                                                    value={editMemberData.equity}
                                                                    onChange={e => setEditMemberData({ ...editMemberData, equity: Number(e.target.value) })}
                                                                    className="w-16 text-xs px-2 py-1 rounded-md border border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/20 focus:outline-none focus:ring-1 focus:ring-blue-500 text-right text-gray-700 dark:text-gray-200"
                                                                />
                                                                <span className="text-xs text-gray-400">%</span>
                                                            </div>
                                                            <select
                                                                value={editMemberData.status}
                                                                onChange={e => setEditMemberData({ ...editMemberData, status: e.target.value })}
                                                                className="text-xs w-full px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                                                            >
                                                                <option value="active">Active</option>
                                                                <option value="inactive">Inactive</option>
                                                            </select>
                                                            <div className="flex gap-1">
                                                                <button
                                                                    onClick={() => handleSaveTeamMember(member._id)}
                                                                    disabled={savingMember}
                                                                    className="p-1 rounded-md bg-green-100 dark:bg-green-900/20 text-green-600 hover:bg-green-200 transition"
                                                                >
                                                                    <Check className="h-3.5 w-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingMemberId(null)}
                                                                    className="p-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 transition"
                                                                >
                                                                    <X className="h-3.5 w-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{member.equity || 0}% <span className="text-xs font-normal text-gray-400">Equity</span></p>
                                                            {member.joinedAt && (
                                                                <p className="text-[10px] text-gray-400 dark:text-gray-500">
                                                                    Joined {new Date(member.joinedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                                                </p>
                                                            )}
                                                            {isFounder && hasEnriched && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditingMemberId(member._id);
                                                                        setEditMemberData({ role: member.role || '', equity: member.equity || 0, status: member.status || 'active' });
                                                                    }}
                                                                    className="mt-1 p-1 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                                                                    title="Edit member"
                                                                >
                                                                    <Pencil className="h-3.5 w-3.5" />
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>
                )}

                {activeTab === 'funding' && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Funding Rounds</h2>
                        {fundingRounds.length > 0 ? (
                            <div className="space-y-3">
                                {fundingRounds.map((round: any) => (
                                    <div key={round._id} className="flex items-center justify-between px-5 py-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                                        <div>
                                            <p className="text-sm font-bold capitalize text-gray-900 dark:text-gray-100">{round.roundType || round.type}</p>
                                            <p className="text-xs mt-1 text-gray-500 dark:text-gray-400 font-medium">
                                                {new Date(round.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold font-mono text-gray-900 dark:text-gray-100">₹{(round.targetAmount || 0).toLocaleString('en-IN')}</p>
                                            <p className={`text-xs mt-1 font-bold uppercase tracking-wider ${round.status === 'active' ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>{round.status}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-gray-900 p-8 rounded-xl border border-gray-200 dark:border-gray-800 text-center shadow-sm">
                                <DollarSign className="h-8 w-8 mx-auto text-gray-400 mb-3" />
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">No funding rounds yet.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'settings' && isFounder && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Startup Settings</h2>
                        
                        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:shadow-md transition-shadow">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <Edit3 className="h-5 w-5 text-blue-500" />
                                    Edit Profile Information
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xl">
                                    Update your startup's name, vision, logo, industry, and funding stage to keep your profile current.
                                </p>
                            </div>
                            <button
                                onClick={() => router.push(`/startup/${id}/edit`)}
                                className="shrink-0 px-5 py-2.5 rounded-xl text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white transition-all shadow-sm"
                            >
                                Edit Startup
                            </button>
                        </div>

                        <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-xl border border-red-200 dark:border-red-800/30 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                                    Danger Zone
                                </h3>
                                <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1 max-w-xl">
                                    Permanently delete this startup and all associated data. This action cannot be undone.
                                </p>
                            </div>
                            <button
                                className="shrink-0 px-5 py-2.5 rounded-xl text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-all border border-red-200 dark:border-red-800/30 shadow-sm"
                                onClick={async () => {
                                    if (confirm('Are you sure you want to delete this startup? This action cannot be undone.')) {
                                        try {
                                            const res = await fetch(`/api/startups?id=${id}`, {
                                                method: 'DELETE',
                                                credentials: 'include'
                                            });
                                            if (res.ok) {
                                                toast.success('Startup deleted successfully');
                                                router.push('/dashboard');
                                            } else {
                                                toast.error('Failed to delete startup');
                                            }
                                        } catch (e) {
                                            toast.error('An error occurred');
                                        }
                                    }
                                }}
                            >
                                Delete Startup
                            </button>
                        </div>
                    </div>
                )}
            </div>


            {/* Access Request Modal */}
            {showAccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => !submitting && setShowAccessModal(false)}>
                    <div
                        className="bg-white dark:bg-gray-900 w-full max-w-md mx-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Request Access</h3>
                            <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">
                                Send an access request to view detailed information about <span className="font-semibold text-gray-700 dark:text-gray-300">{startup.name}</span>
                            </p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Message (optional)</label>
                                <textarea
                                    value={accessMessage}
                                    onChange={(e) => setAccessMessage(e.target.value)}
                                    placeholder="Introduce yourself and explain your interest in this startup..."
                                    rows={4}
                                    maxLength={500}
                                    className="w-full px-4 py-3 rounded-xl text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all resize-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                                />
                                <p className="text-xs mt-1 text-gray-400 dark:text-gray-500 text-right">{accessMessage.length}/500</p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowAccessModal(false)}
                                    disabled={submitting}
                                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRequestAccess}
                                    disabled={submitting}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-all disabled:opacity-50 shadow-sm hover:shadow-md"
                                >
                                    {submitting ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Send className="h-4 w-4" />
                                            Send Request
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Add Role Modal */}
            {showRoleModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => !submitting && setShowRoleModal(false)}>
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl w-full max-w-md shadow-xl border border-gray-200 dark:border-gray-800" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-4">Add Open Role</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Role Title</label>
                                <input
                                    value={newRole.title}
                                    onChange={e => setNewRole({ ...newRole, title: e.target.value })}
                                    className="w-full px-3 py-2 rounded-xl text-sm border bg-background focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g., Frontend Developer"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Description</label>
                                <textarea
                                    value={newRole.description}
                                    onChange={e => setNewRole({ ...newRole, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-3 py-2 rounded-xl text-sm border bg-background focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    placeholder="Role description and responsibilities"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Skills (comma-separated)</label>
                                <input
                                    value={newRole.skills}
                                    onChange={e => setNewRole({ ...newRole, skills: e.target.value })}
                                    className="w-full px-3 py-2 rounded-xl text-sm border bg-background focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g., React, TypeScript, CSS"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Compensation Type</label>
                                <select
                                    value={newRole.compensationType}
                                    onChange={e => setNewRole({ ...newRole, compensationType: e.target.value })}
                                    className="w-full px-3 py-2 rounded-xl text-sm border bg-background focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="equity">Equity Only</option>
                                    <option value="cash">Cash Only</option>
                                    <option value="mixed">Mixed</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2 mt-4">
                                <button
                                    onClick={() => setShowRoleModal(false)}
                                    disabled={submitting}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddRole}
                                    disabled={submitting || !newRole.title || !newRole.description}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition"
                                >
                                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Add Role'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Post Journey Update Modal */}
            {showJourneyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => !submitting && setShowJourneyModal(false)}>
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl w-full max-w-lg shadow-xl border border-gray-200 dark:border-gray-800" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold tracking-tight">New Journey Update</h3>
                            <button onClick={() => setShowJourneyModal(false)} className="text-gray-400 hover:text-gray-600 transition">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Update Type</label>
                                <select
                                    value={newJourneyPost.postType}
                                    onChange={e => setNewJourneyPost({ ...newJourneyPost, postType: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl text-sm border bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none border-gray-200 dark:border-gray-700 font-medium"
                                >
                                    <option value="general">General Update</option>
                                    <option value="milestone">Milestone Reached</option>
                                    <option value="funding">Funding / Revenue</option>
                                    <option value="product_release">Product Release</option>
                                    <option value="hiring">Hiring</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Title <span className="text-gray-400 font-normal">(Optional)</span></label>
                                <input
                                    value={newJourneyPost.title}
                                    onChange={e => setNewJourneyPost({ ...newJourneyPost, title: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl text-sm border bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none border-gray-200 dark:border-gray-700 font-medium placeholder-gray-400"
                                    placeholder="e.g., We just crossed 10k users!"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">Share your progress</label>
                                <textarea
                                    value={newJourneyPost.description}
                                    onChange={e => setNewJourneyPost({ ...newJourneyPost, description: e.target.value })}
                                    rows={5}
                                    className="w-full px-4 py-3 rounded-xl text-sm border bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none resize-none border-gray-200 dark:border-gray-700 font-medium placeholder-gray-400"
                                    placeholder="What's new? Tell your followers what you've been working on..."
                                />
                            </div>
                            
                            <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 mt-6">
                                <button
                                    onClick={() => setShowJourneyModal(false)}
                                    disabled={submitting}
                                    className="flex-1 py-3 rounded-xl text-sm font-semibold border-2 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-gray-600 dark:text-gray-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateJourneyPost}
                                    disabled={submitting || !newJourneyPost.description}
                                    className="flex-1 py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-sm hover:shadow-md flex justify-center items-center"
                                >
                                    {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Publish Update'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
