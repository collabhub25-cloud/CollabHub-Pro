'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield, Settings as SettingsIcon, Bell, User as UserIcon, LogOut, Trash2 } from 'lucide-react';
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
import { getPlanDisplayName } from '@/lib/subscription/features';

export function SettingsPage() {
    const { user, updateUser, logout } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);

    // Profile settings state
    const [profile, setProfile] = useState({
        name: user?.name || '',
        bio: user?.bio || '',
        skills: user?.skills?.join(', ') || ''
    });

    // Password state
    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // Notification preferences
    const [notifications, setNotifications] = useState({
        emailNotifications: true,
        marketingEmails: false,
        alertNotifications: true,
    });

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const skillsArray = profile.skills.split(',').map(s => s.trim()).filter(s => s);
            const res = await fetch('/api/auth/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
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

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwords.newPassword !== passwords.confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }

        setPasswordLoading(true);
        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: passwords.currentPassword,
                    newPassword: passwords.newPassword
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to change password');
            }

            toast.success('Password changed successfully');
            setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleLogoutAll = async () => {
        try {
            const res = await fetch('/api/auth/logout-all', { method: 'POST' });
            if (!res.ok) throw new Error('Failed to logout');
            toast.success('Logged out of all sessions');
            logout();
        } catch (err) {
            toast.error('Failed to logout of all sessions');
        }
    };

    const handleDeleteAccount = async () => {
        try {
            const res = await fetch('/api/auth/me', { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete account');
            logout();
            // Redirect handled by logout state change
        } catch (err) {
            toast.error('Failed to delete account');
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* PROFILE SETTINGS */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserIcon className="h-5 w-5" />
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
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <SettingsIcon className="h-5 w-5" />
                            Account Settings
                        </CardTitle>
                        <CardDescription>Manage your account credentials</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Email Address</Label>
                            <Input value={user?.email || ''} disabled className="bg-muted" />
                            <p className="text-xs text-muted-foreground">Email address cannot be changed directly.</p>
                        </div>

                        <Separator />

                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <h3 className="text-sm font-medium">Change Password</h3>
                            <div className="space-y-2">
                                <Input
                                    type="password"
                                    placeholder="Current Password"
                                    value={passwords.currentPassword}
                                    onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Input
                                    type="password"
                                    placeholder="New Password"
                                    value={passwords.newPassword}
                                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                                    required
                                    pattern=".{8,}"
                                    title="Password must be at least 8 characters"
                                />
                            </div>
                            <div className="space-y-2">
                                <Input
                                    type="password"
                                    placeholder="Confirm New Password"
                                    value={passwords.confirmPassword}
                                    onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                                    required
                                />
                            </div>
                            <Button type="submit" variant="secondary" disabled={passwordLoading}>
                                {passwordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Update Password
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* SECURITY SETTINGS */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
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
                            <div className="flex items-center justify-between bg-muted/50 p-3 rounded-md border">
                                <div>
                                    <p className="text-sm font-medium">Current Session</p>
                                    <p className="text-xs text-muted-foreground">Windows • Chrome • This device</p>
                                </div>
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>
                            </div>
                            <Button onClick={handleLogoutAll} variant="outline" className="w-full sm:w-auto" type="button">
                                <LogOut className="h-4 w-4 mr-2" />
                                Logout from all sessions
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* NOTIFICATIONS */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="h-5 w-5" />
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

                {/* FOUNDER SUBSCRIPTION PANEL */}
                {user?.role === 'founder' && (
                    <Card className="col-span-1 md:col-span-2 border-primary/20 bg-primary/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-primary" />
                                Subscription Plan
                            </CardTitle>
                            <CardDescription>Manage your CollabHub limits and billing</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-background rounded-lg border">
                                <div className="space-y-1 mb-4 sm:mb-0">
                                    <p className="font-medium flex items-center gap-2">
                                        Current Plan: <Badge>{getPlanDisplayName((user?.plan as any) || null) || 'Free Tier'}</Badge>
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        You are currently on the {getPlanDisplayName((user?.plan as any) || null) || 'Free'} plan. Upgrade to unlock more features.
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <Button variant="outline" asChild>
                                        <a href="#subscription" onClick={(e) => { e.preventDefault(); /* Hook up to dashboard activeTab navigation if needed */ }}>
                                            View Features
                                        </a>
                                    </Button>
                                </div>
                            </div>
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
