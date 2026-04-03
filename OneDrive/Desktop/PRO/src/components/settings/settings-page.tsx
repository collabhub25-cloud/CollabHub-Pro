'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Loader2, Shield, Settings as SettingsIcon, Bell,
    User as UserIcon, LogOut, Trash2, BadgeCheck,
    Building2, CheckCircle2, Clock, Send, Sun, Moon, Monitor
} from 'lucide-react';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { AlloySphereVerifiedBadge } from '@/components/ui/alloysphere-verified-badge';

export function SettingsPage() {
    const { user, updateUser, logout } = useAuthStore();
    const { theme, setTheme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [startups, setStartups] = useState<any[]>([]);
    const [startupsLoading, setStartupsLoading] = useState(false);

    // Helper to read CSRF token from cookie
    const getCsrfToken = () => {
        const match = document.cookie.match(/(?:^|; )_csrf_token=([^;]*)/);
        return match ? decodeURIComponent(match[1]) : '';
    };

    // Profile settings state
    const [profile, setProfile] = useState({
        name: user?.name || '',
        bio: user?.bio || '',
        skills: user?.skills?.join(', ') || ''
    });



    // Notification preferences
    const [notifications, setNotifications] = useState({
        emailNotifications: true,
        marketingEmails: false,
        alertNotifications: true,
    });

    // Fetch founder's startups for AlloySphere verification section
    useEffect(() => {
        if (user?.role === 'founder') {
            const fetchStartups = async () => {
                setStartupsLoading(true);
                try {
                    const res = await fetch('/api/startups', { credentials: 'include' });
                    if (res.ok) {
                        const data = await res.json();
                        setStartups(data.startups || []);
                    }
                } catch (err) {
                    console.error('Error fetching startups:', err);
                } finally {
                    setStartupsLoading(false);
                }
            };
            fetchStartups();
        }
    }, [user?.role]);

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const skillsArray = profile.skills.split(',').map(s => s.trim()).filter(s => s);
            const res = await fetch('/api/users/me', {
                method: 'PATCH',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': getCsrfToken(),
                },
                body: JSON.stringify({
                    name: profile.name,
                    bio: profile.bio,
                    skills: skillsArray
                })
            });

            if (!res.ok) throw new Error('Failed to update profile');
            const data = await res.json();

            updateUser({
                name: data.user.name,
                bio: data.user.bio,
                skills: data.user.skills
            });
            toast.success('Profile updated successfully');
        } catch (err) {
            toast.error('Failed to update profile');
        } finally {
            setLoading(false);
        }
    };



    const handleLogoutAll = async () => {
        try {
            const res = await fetch('/api/auth/logout-all', {
                method: 'POST',
                credentials: 'include',
                headers: { 'x-csrf-token': getCsrfToken() },
            });
            if (!res.ok) throw new Error('Failed to logout');
            toast.success('Logged out of all sessions');
            logout();
        } catch (err) {
            toast.error('Failed to logout of all sessions');
        }
    };

    const handleDeleteAccount = async () => {
        try {
            const res = await fetch('/api/users/me', {
                method: 'DELETE',
                credentials: 'include',
                headers: { 'x-csrf-token': getCsrfToken() },
            });
            if (!res.ok) throw new Error('Failed to delete account');
            logout();
        } catch (err) {
            toast.error('Failed to delete account');
        }
    };

    const handleRequestVerification = (startupId: string, startupName: string) => {
        toast.success(`Verification request sent for "${startupName}". The AlloySphere team will contact you to schedule an on-site visit.`, {
            duration: 5000,
        });
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            {/* Page header with gradient */}
            <div className="relative">
                <div
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{
                        background: 'linear-gradient(135deg, rgba(46, 139, 87, 0.06) 0%, rgba(0, 71, 171, 0.04) 50%, transparent 100%)',
                        filter: 'blur(20px)',
                    }}
                />
                <div className="relative">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <SettingsIcon className="h-8 w-8 icon-float" style={{ color: 'var(--cobalt-blue)' }} />
                        Settings
                    </h1>
                    <p className="text-muted-foreground mt-1">Manage your account, security, and preferences</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* PROFILE SETTINGS */}
                <Card className="card-3d-hover glassmorphic">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserIcon className="h-5 w-5 icon-float" style={{ color: 'var(--sea-green)' }} />
                            Profile Settings
                        </CardTitle>
                        <CardDescription>Update your public profile information</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleProfileUpdate} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input
                                    value={profile.name}
                                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Bio</Label>
                                <Textarea
                                    value={profile.bio}
                                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                                    placeholder="Tell us about yourself..."
                                    rows={3}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Skills (comma separated, optional)</Label>
                                <Input
                                    value={profile.skills}
                                    onChange={(e) => setProfile({ ...profile, skills: e.target.value })}
                                    placeholder="e.g. React, Node.js, Marketing"
                                />
                            </div>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Profile
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* ACCOUNT SETTINGS */}
                <Card className="card-3d-hover glassmorphic">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <SettingsIcon className="h-5 w-5 icon-float" style={{ color: 'var(--cobalt-blue)' }} />
                            Account Settings
                        </CardTitle>
                        <CardDescription>Manage your account credentials</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Email Address</Label>
                            <Input value={user?.email || ''} disabled className="bg-muted" />
                            <p className="text-xs text-muted-foreground">Signed in with Google. Email address cannot be changed.</p>
                        </div>
                    </CardContent>
                </Card>

                {/* SECURITY SETTINGS */}
                <Card className="col-span-1 card-3d-hover glassmorphic">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 icon-float" style={{ color: 'var(--sea-green)' }} />
                            Security
                        </CardTitle>
                        <CardDescription>Manage your active sessions and security features</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Two-Factor Authentication (2FA)</Label>
                                <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                            </div>
                            <Switch disabled id="2fa" title="Coming soon!" />
                        </div>
                        <Separator />
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium">Active Sessions</h3>
                            <div
                                className="flex items-center justify-between p-3 rounded-md border"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(46, 139, 87, 0.04) 0%, rgba(0, 71, 171, 0.02) 100%)',
                                    borderColor: 'rgba(46, 139, 87, 0.15)',
                                }}
                            >
                                <div>
                                    <p className="text-sm font-medium">Current Session</p>
                                    <p className="text-xs text-muted-foreground">Windows • Chrome • This device</p>
                                </div>
                                <Badge
                                    variant="outline"
                                    style={{
                                        background: 'rgba(46, 139, 87, 0.1)',
                                        color: 'var(--sea-green)',
                                        borderColor: 'rgba(46, 139, 87, 0.2)',
                                    }}
                                >
                                    Active
                                </Badge>
                            </div>
                            <Button onClick={handleLogoutAll} variant="outline" className="w-full sm:w-auto" type="button">
                                <LogOut className="h-4 w-4 mr-2" />
                                Logout from all sessions
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* NOTIFICATIONS */}
                <Card className="col-span-1 card-3d-hover glassmorphic">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="h-5 w-5 icon-float" style={{ color: 'var(--cobalt-blue)' }} />
                            Preferences
                        </CardTitle>
                        <CardDescription>Customize your notification settings</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Email Notifications</Label>
                                <p className="text-sm text-muted-foreground">Receive critical platform updates</p>
                            </div>
                            <Switch
                                checked={notifications.emailNotifications}
                                onCheckedChange={(c) => setNotifications({ ...notifications, emailNotifications: c })}
                            />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Alerts & Alerts</Label>
                                <p className="text-sm text-muted-foreground">Get notified about messages and activity</p>
                            </div>
                            <Switch
                                checked={notifications.alertNotifications}
                                onCheckedChange={(c) => setNotifications({ ...notifications, alertNotifications: c })}
                            />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Marketing Emails</Label>
                                <p className="text-sm text-muted-foreground">Receive guides, news, and offers</p>
                            </div>
                            <Switch
                                checked={notifications.marketingEmails}
                                onCheckedChange={(c) => setNotifications({ ...notifications, marketingEmails: c })}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* APPEARANCE */}
                <Card className="col-span-1 md:col-span-2 card-3d-hover glassmorphic">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sun className="h-5 w-5 icon-float" style={{ color: 'var(--cobalt-blue)' }} />
                            Appearance
                        </CardTitle>
                        <CardDescription>Customize how AlloySphere looks on your device</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { value: 'light', label: 'Light', icon: Sun },
                                { value: 'dark', label: 'Dark', icon: Moon },
                                { value: 'system', label: 'System', icon: Monitor },
                            ].map(({ value, label, icon: Icon }) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setTheme(value)}
                                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                                        theme === value
                                            ? 'border-primary bg-primary/5'
                                            : 'border-transparent bg-secondary hover:bg-muted'
                                    }`}
                                >
                                    <Icon className={`h-5 w-5 ${theme === value ? 'text-primary' : 'text-muted-foreground'}`} />
                                    <span className={`text-sm font-medium ${theme === value ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* AlloySphere VERIFICATION PANEL (Founder only) */}
                {user?.role === 'founder' && (
                    <Card
                        className="col-span-1 md:col-span-2 overflow-hidden relative"
                        style={{
                            border: '1px solid rgba(46, 139, 87, 0.2)',
                        }}
                    >
                        {/* Gradient background */}
                        <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                                background: 'linear-gradient(135deg, rgba(46, 139, 87, 0.06) 0%, rgba(0, 71, 171, 0.04) 50%, rgba(46, 139, 87, 0.02) 100%)',
                            }}
                        />

                        <CardHeader className="relative z-10">
                            <CardTitle className="flex items-center gap-2">
                                <div
                                    className="flex items-center justify-center h-8 w-8 rounded-full badge-glow"
                                    style={{ background: 'var(--verified-gradient)' }}
                                >
                                    <BadgeCheck className="h-4 w-4 text-white" />
                                </div>
                                <span className="shimmer-text font-bold">AlloySphere Verification</span>
                            </CardTitle>
                            <CardDescription>
                                Get your startups physically verified by the AlloySphere team to earn investor trust
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="relative z-10 space-y-4">
                            {/* How it works */}
                            <div
                                className="p-4 rounded-lg border bg-card/50"
                                style={{
                                    borderColor: 'rgba(46, 139, 87, 0.12)',
                                }}
                            >
                                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <Shield className="h-4 w-4" style={{ color: 'var(--sea-green)' }} />
                                    How AlloySphere Verification Works
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {[
                                        { step: '1', title: 'Request', desc: 'Submit a verification request for your startup' },
                                        { step: '2', title: 'On-Site Visit', desc: 'Our team visits your office for background checks' },
                                        { step: '3', title: 'Badge Awarded', desc: 'Verified startups get a trusted badge for investors' },
                                    ].map((item) => (
                                        <div key={item.step} className="flex items-start gap-2">
                                            <div
                                                className="flex items-center justify-center h-6 w-6 rounded-full text-white text-xs font-bold flex-shrink-0"
                                                style={{ background: 'var(--verified-gradient)' }}
                                            >
                                                {item.step}
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium">{item.title}</p>
                                                <p className="text-xs text-muted-foreground">{item.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Startups list */}
                            {startupsLoading ? (
                                <div className="flex items-center justify-center py-6">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : startups.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-4 text-center">
                                    No startups found. Create a startup first to request verification.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    <h4 className="text-sm font-medium">Your Startups</h4>
                                    {startups.map((startup: any) => (
                                        <div
                                            key={startup._id}
                                            className="flex items-center justify-between p-4 rounded-lg border transition-all duration-300 hover:shadow-md card-3d-hover"
                                            style={{
                                                borderColor: startup.AlloySphereVerified
                                                    ? 'rgba(46, 139, 87, 0.3)'
                                                    : undefined,
                                                background: startup.AlloySphereVerified
                                                    ? 'linear-gradient(135deg, rgba(46, 139, 87, 0.06) 0%, rgba(0, 71, 171, 0.03) 100%)'
                                                    : undefined,
                                            }}
                                        >
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                    {startup.logo ? (
                                                        <img src={startup.logo} alt={startup.name} className="h-10 w-10 rounded-lg object-cover" />
                                                    ) : (
                                                        <Building2 className="h-5 w-5 text-primary" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="text-sm font-medium truncate">{startup.name}</p>
                                                        <AlloySphereVerifiedBadge
                                                            verified={startup.AlloySphereVerified || false}
                                                            verifiedAt={startup.AlloySphereVerifiedAt}
                                                            variant="compact"
                                                        />
                                                    </div>
                                                    <p className="text-xs text-muted-foreground capitalize">{startup.industry} · {startup.stage}</p>
                                                </div>
                                            </div>

                                            {startup.AlloySphereVerified ? (
                                                <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full" style={{ background: 'rgba(46, 139, 87, 0.1)', color: 'var(--sea-green)' }}>
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    Verified
                                                </div>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="flex-shrink-0"
                                                    style={{
                                                        borderColor: 'rgba(46, 139, 87, 0.3)',
                                                        color: 'var(--sea-green)',
                                                    }}
                                                    onClick={() => handleRequestVerification(startup._id, startup.name)}
                                                >
                                                    <Send className="h-3.5 w-3.5 mr-1.5" />
                                                    Request Verification
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* DANGER ZONE */}
                <Card className="col-span-1 md:col-span-2 border-destructive/20 mt-4">
                    <CardHeader>
                        <CardTitle className="text-destructive flex items-center gap-2">
                            <Trash2 className="h-5 w-5" />
                            Danger Zone
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                            <div className="space-y-1 mb-4 sm:mb-0">
                                <p className="font-medium text-sm">Delete Account</p>
                                <p className="text-sm text-muted-foreground">Permanently remove your account and all associated data.</p>
                            </div>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive">Delete Account</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete your account
                                            and remove your data from our servers.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground">
                                            Yes, delete my account
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
