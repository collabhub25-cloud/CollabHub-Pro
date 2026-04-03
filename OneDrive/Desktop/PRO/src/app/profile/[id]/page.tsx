'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, MapPin, Building2, Github, Linkedin, Globe, Calendar, ArrowLeft, User as UserIcon, Send } from 'lucide-react';
import { useAuthStore } from '@/store';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface UserProfile {
    _id: string;
    name: string;
    role: string;
    bio?: string;
    skills?: string[];
    experience?: string;
    githubUrl?: string;
    linkedinUrl?: string;
    portfolioUrl?: string;
    location?: string;
    avatar?: string;
    joinedAt?: string;

    verificationLevel?: string;
}

interface Startup {
    _id: string;
    name: string;
    industry: string;
    stage: string;
    vision: string;
    fundingStage: string;
    isActive: boolean;
}

export default function ProfilePage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const id = params?.id as string;

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [startups, setStartups] = useState<Startup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const { user } = useAuthStore();
    const isFounder = user?.role === 'founder';
    const isInvestor = profile?.role === 'investor';
    
    // Pitch state
    const [founderStartupId, setFounderStartupId] = useState('');
    const [pitchAmount, setPitchAmount] = useState('');
    const [pitchEquity, setPitchEquity] = useState('');
    const [pitchMessage, setPitchMessage] = useState('');
    const [pitchLoading, setPitchLoading] = useState(false);
    const [pitchDialogOpen, setPitchDialogOpen] = useState(false);
    const [accessReqStatus, setAccessReqStatus] = useState<string | null>(null);

    useEffect(() => {
        if (isFounder) {
            fetch('/api/startups')
                .then(res => res.json())
                .then(async data => {
                    if (data.startups && data.startups.length > 0) {
                        const sid = data.startups[0]._id;
                        setFounderStartupId(sid);
                        
                        if (isInvestor) {
                            try {
                                const accRes = await fetch(`/api/funding/request-access?startupId=${sid}`);
                                if (accRes.ok) {
                                    const accData = await accRes.json();
                                    const req = (accData.requests || []).find((r: any) => 
                                        r.investorId?._id === id || r.investorId === id
                                    );
                                    if (req) {
                                        setAccessReqStatus(req.status);
                                    } else {
                                        setAccessReqStatus('none');
                                    }
                                }
                            } catch (e) {
                            }
                        }
                    }
                })
                .catch(() => {});
        }
    }, [isFounder, isInvestor, id]);

    const handlePitchSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!founderStartupId) {
            toast.error('You need a startup array to pitch. Please create one.');
            return;
        }
        setPitchLoading(true);
        try {
            const res = await fetch('/api/pitches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startupId: founderStartupId,
                    investorId: id,
                    amountRequested: Number(pitchAmount),
                    equityOffered: Number(pitchEquity),
                    message: pitchMessage
                })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success('Pitch sent successfully!');
                setPitchDialogOpen(false);
            } else {
                toast.error(data.error || 'Failed to send pitch');
            }
        } catch (error) {
            toast.error('Error sending pitch');
        } finally {
            setPitchLoading(false);
        }
    };

    useEffect(() => {
        if (!id) {
            setError('Invalid profile ID');
            setLoading(false);
            return;
        }

        const fetchProfile = async () => {
            try {
                const res = await fetch(`/api/users/${id}`);
                if (!res.ok) {
                    throw new Error('Failed to load profile');
                }
                const data = await res.json();
                setProfile(data.user);
                setStartups(data.startups || []);
            } catch (err: any) {
                setError(err.message || 'Error fetching profile');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [id]);

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="container py-8 max-w-4xl mx-auto space-y-4">
                <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <UserIcon className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-xl font-semibold mb-2">User Not Found</p>
                        <p className="text-muted-foreground">{error || "This profile doesn't exist or is unavailable."}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const initials = profile.name
        ? profile.name.split(' ').map((n) => n[0]).join('').toUpperCase()
        : '?';

    return (
        <div className="container py-8 max-w-4xl mx-auto space-y-6">
            <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column - Main Profile Info */}
                <div className="md:col-span-1 space-y-6">
                    <Card>
                        <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
                            <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                                <AvatarImage src={profile.avatar || ''} alt={profile.name} />
                                <AvatarFallback className="text-4xl">{initials}</AvatarFallback>
                            </Avatar>

                            <div>
                                <h1 className="text-2xl font-bold">{profile.name}</h1>
                                <Badge variant="secondary" className="mt-2 text-sm capitalize">
                                    {profile.role}
                                </Badge>
                            </div>

                            {profile.location && (
                                <div className="flex items-center text-muted-foreground text-sm">
                                    <MapPin className="h-4 w-4 mr-1" />
                                    {profile.location}
                                </div>
                            )}

                            {profile.joinedAt && (
                                <div className="flex items-center text-muted-foreground text-sm">
                                    <Calendar className="h-4 w-4 mr-1" />
                                    Joined {new Date(profile.joinedAt).toLocaleDateString()}
                                </div>
                            )}

                            <div className="flex gap-2 justify-center pt-2">
                                {profile.githubUrl && (
                                    <Button variant="outline" size="icon" asChild>
                                        <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer">
                                            <Github className="h-4 w-4" />
                                        </a>
                                    </Button>
                                )}
                                {profile.linkedinUrl && (
                                    <Button variant="outline" size="icon" asChild>
                                        <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer">
                                            <Linkedin className="h-4 w-4" />
                                        </a>
                                    </Button>
                                )}
                                {profile.portfolioUrl && (
                                    <Button variant="outline" size="icon" asChild>
                                        <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer">
                                            <Globe className="h-4 w-4" />
                                        </a>
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Founder Action: Pitch Investor */}
                    {isFounder && isInvestor && (
                        <Card className="border-purple-500/30 shadow-lg shadow-purple-500/5 bg-gradient-to-br from-card to-purple-500/5">
                            <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4">
                                <h3 className="font-semibold text-lg text-foreground">Pitch for Investment</h3>
                                <p className="text-sm text-muted-foreground">Send your startup's pitch directly to this investor.</p>
                                
                                {accessReqStatus === 'approved' ? (
                                    <Dialog open={pitchDialogOpen} onOpenChange={setPitchDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                                                <Send className="mr-2 h-4 w-4" /> Pitch Investor
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[425px]">
                                        <form onSubmit={handlePitchSubmit}>
                                            <DialogHeader>
                                                <DialogTitle>Pitch {profile.name}</DialogTitle>
                                                <DialogDescription>
                                                    Outline your proposal details below. Make it compelling!
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="grid gap-4 py-4">
                                                <div className="flex gap-4">
                                                    <div className="grid gap-2 flex-1">
                                                        <Label htmlFor="amountRequested">Amount ($)</Label>
                                                        <Input
                                                            id="amountRequested"
                                                            type="number"
                                                            required
                                                            min="1000"
                                                            placeholder="e.g. 500000"
                                                            value={pitchAmount}
                                                            onChange={(e) => setPitchAmount(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="grid gap-2 flex-1">
                                                        <Label htmlFor="equityOffered">Equity (%)</Label>
                                                        <Input
                                                            id="equityOffered"
                                                            type="number"
                                                            required
                                                            step="0.1"
                                                            min="0"
                                                            max="100"
                                                            placeholder="e.g. 5.5"
                                                            value={pitchEquity}
                                                            onChange={(e) => setPitchEquity(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="message">Pitch Message</Label>
                                                    <Textarea
                                                        id="message"
                                                        placeholder="Why should they invest? (Optional)"
                                                        value={pitchMessage}
                                                        onChange={(e) => setPitchMessage(e.target.value)}
                                                        rows={4}
                                                    />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button type="button" variant="outline" onClick={() => setPitchDialogOpen(false)}>Cancel</Button>
                                                <Button type="submit" disabled={pitchLoading}>
                                                    {pitchLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                    Send Pitch
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                    </Dialog>
                                ) : accessReqStatus === 'pending' ? (
                                    <Button disabled className="w-full bg-yellow-500/50 hover:bg-yellow-500/50 text-white opacity-100 cursor-not-allowed">
                                        Request Pending
                                    </Button>
                                ) : accessReqStatus === 'rejected' ? (
                                    <Button disabled className="w-full bg-red-500/50 hover:bg-red-500/50 text-white opacity-100 cursor-not-allowed">
                                        Request Rejected
                                    </Button>
                                ) : (
                                    <Button disabled className="w-full bg-gray-300 dark:bg-gray-800 text-gray-500 cursor-not-allowed opacity-100" title="Investor must request access to your startup first">
                                        Waiting for Investor to Request Access
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Trust & Verification */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Platform Status</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">

                            <div>
                                <span className="text-sm text-muted-foreground block mb-1">Verification Level</span>
                                <Badge variant="outline" className="capitalize">
                                    {profile.verificationLevel != null ? `Level ${profile.verificationLevel}` : 'None'}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Details and Startups */}
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>About</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-2">Bio</h3>
                                <p className="text-sm leading-relaxed">
                                    {profile.bio || 'No bio provided.'}
                                </p>
                            </div>

                            {profile.experience && (
                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Experience</h3>
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                        {profile.experience}
                                    </p>
                                </div>
                            )}

                            {profile.skills && profile.skills.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Skills</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {profile.skills.map(skill => (
                                            <Badge key={skill} variant="secondary">
                                                {skill}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {startups.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5" />
                                    Associated Startups
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {startups.map(startup => (
                                    <div key={startup._id} className="p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <h4 className="font-semibold text-lg">{startup.name}</h4>
                                            <p className="text-sm text-muted-foreground line-clamp-1">{startup.vision}</p>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                <Badge variant="outline">{startup.industry}</Badge>
                                                <Badge variant="secondary" className="capitalize">{startup.stage}</Badge>
                                                <Badge variant="secondary" className="capitalize">{startup.fundingStage}</Badge>
                                            </div>
                                        </div>
                                        <div>
                                            <Badge variant={startup.isActive ? 'default' : 'secondary'}>
                                                {startup.isActive ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
