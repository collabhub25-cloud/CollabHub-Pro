'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, MapPin, Building2, Github, Linkedin, Globe, Calendar, ArrowLeft } from 'lucide-react';

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
    trustScore?: number;
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
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [startups, setStartups] = useState<Startup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!id) return;

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

                    {/* Trust & Verification */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Platform Status</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-muted-foreground">Trust Score</span>
                                    <span className="font-medium">{profile.trustScore || 50}/100</span>
                                </div>
                                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary"
                                        style={{ width: `${profile.trustScore || 50}%` }}
                                    />
                                </div>
                            </div>

                            <div>
                                <span className="text-sm text-muted-foreground block mb-1">Verification Level</span>
                                <Badge variant="outline" className="capitalize">
                                    {profile.verificationLevel?.replace('_', ' ') || 'None'}
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

function UserIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    );
}
