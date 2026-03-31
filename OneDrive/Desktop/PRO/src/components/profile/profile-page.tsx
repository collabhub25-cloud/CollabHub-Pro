'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Mail, MapPin, ExternalLink, Briefcase,
  Building2, TrendingUp, Star, Shield, FileText, ShieldCheck, CreditCard, DollarSign,
  MessageSquare, Loader2, Download, Github, Linkedin, Globe, Users,
  Edit, Save, X, Plus, BadgeCheck, Sparkles, Camera, Upload, Trash2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore, useUIStore } from '@/store';
import { AllianceButton } from '@/components/alliances/alliance-button';
import { AlloySphereVerifiedBadge } from '@/components/ui/alloysphere-verified-badge';
import { VerificationProgress } from '@/components/verification/verification-progress';

import { PremiumGithub, PremiumLinkedIn, PremiumGlobe } from '@/components/ui/social-icons';

import { safeLocalStorage, STORAGE_KEYS, getInitials } from '@/lib/client-utils';
import { getPlanDisplayName } from '@/lib/subscription/features';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';

interface ProfileData {
  _id: string;
  name: string;
  role: 'talent' | 'founder' | 'investor';
  avatar?: string;
  bio?: string;

  verificationLevel: number;
  location?: string;
  createdAt: string;
  skills?: string[];
  interestedRoles?: string[];
  experience?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  hasResume?: boolean;
  resumeUrl?: string;
  startups?: Array<{
    _id: string;
    name: string;
    vision: string;
    stage: string;
    industry: string;

    logo?: string;
    AlloySphereVerified?: boolean;
    AlloySphereVerifiedAt?: string;
  }>;
  ticketSize?: { min: number; max: number };
  preferredIndustries?: string[];
  stagePreference?: string[];
  investmentThesis?: string;
  investmentCount?: number;
  canMessage?: boolean;
  conversationId?: string;
  allianceCount?: number;
  plan?: string;
}

interface ProfilePageProps {
  profileId?: string;
}

export function ProfilePage({ profileId }: ProfilePageProps) {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const { setActiveTab } = useUIStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileTab, setProfileTab] = useState('overview');
  const [investmentData, setInvestmentData] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    bio: '',
    location: '',
    githubUrl: '',
    linkedinUrl: '',
    portfolioUrl: '',
    skills: '',
    interestedRoles: '',
    experience: '',
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload JPEG, PNG, GIF, or WebP.');
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image too large. Maximum size is 2MB.');
      return;
    }

    setUploadingAvatar(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        
        const response = await apiFetch('/api/users/avatar', {
          method: 'POST',
          body: JSON.stringify({ image: base64 }),
        });

        const data = await response.json();

        if (response.ok) {
          setProfile(prev => prev ? { ...prev, avatar: data.avatar } : null);
          if (user) {
            setUser({ ...user, avatar: data.avatar });
          }
          toast.success('Profile photo updated!');
        } else {
          toast.error(data.error || 'Failed to upload image');
        }
        setUploadingAvatar(false);
      };
      reader.onerror = () => {
        toast.error('Failed to read image file');
        setUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Failed to upload image');
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    try {
      const response = await apiFetch('/api/users/avatar', {
        method: 'DELETE',
      });

      if (response.ok) {
        setProfile(prev => prev ? { ...prev, avatar: undefined } : null);
        if (user) {
          setUser({ ...user, avatar: undefined });
        }
        toast.success('Profile photo removed');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to remove image');
      }
    } catch (error) {
      toast.error('Failed to remove image');
    }
    setUploadingAvatar(false);
  };

  const fetchProfile = useCallback(async () => {

    try {
      const endpoint = (profileId && profileId !== 'undefined')
        ? `/api/users/profile/${profileId}`
        : '/api/users/me';

      console.log('Fetching profile from:', endpoint);
      const response = await fetch(endpoint, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Profile data received:', data);
        const profileData = data.profile || data.user;
        setProfile(profileData);

        // Initialize edit form with current values
        setEditForm({
          name: profileData.name || '',
          bio: profileData.bio || '',
          location: profileData.location || '',
          githubUrl: profileData.githubUrl || '',
          linkedinUrl: profileData.linkedinUrl || '',
          portfolioUrl: profileData.portfolioUrl || '',
          skills: (profileData.skills || []).join(', '),
          interestedRoles: (profileData.interestedRoles || []).join(', '),
          experience: profileData.experience || '',
        });
      } else {
        const errorText = await response.text();
        console.error('Failed to load profile:', response.status, errorText);
        toast.error('Failed to load profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSaveProfile = async () => {

    setSaving(true);
    try {
      const updates: Record<string, unknown> = {
        name: editForm.name,
        bio: editForm.bio,
        location: editForm.location,
        githubUrl: editForm.githubUrl || undefined,
        linkedinUrl: editForm.linkedinUrl || undefined,
        portfolioUrl: editForm.portfolioUrl || undefined,
      };

      // Parse skills from comma-separated string
      if (editForm.skills.trim()) {
        updates.skills = editForm.skills.split(',').map(s => s.trim()).filter(Boolean);
      } else {
        updates.skills = [];
      }

      // Parse interestedRoles from comma-separated string
      if (editForm.interestedRoles.trim()) {
        updates.interestedRoles = editForm.interestedRoles.split(',').map(s => s.trim()).filter(Boolean);
      } else {
        updates.interestedRoles = [];
      }

      // Only add experience for talent
      if (profile?.role === 'talent' && editForm.experience) {
        updates.experience = editForm.experience;
      }

      const response = await fetch('/api/users/me', {
        credentials: 'include',
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.user);
        setUser(data.user);
        setIsEditing(false);
        toast.success('Profile updated successfully!');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleMessage = () => {
    if (profile?._id) {
      safeLocalStorage.setItem(STORAGE_KEYS.MESSAGE_USER, profile._id);
      setActiveTab('messages');
      window.dispatchEvent(new CustomEvent('navigateToMessages'));
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'talent': return Briefcase;
      case 'founder': return Building2;
      case 'investor': return TrendingUp;
      default: return Briefcase;
    }
  };

  const getVerificationBadge = (level: number) => {
    const badges = [
      { color: 'bg-gray-500', label: 'Unverified' },
      { color: 'bg-blue-500', label: 'Basic' },
      { color: 'bg-green-500', label: 'Verified' },
      { color: 'bg-purple-500', label: 'Trusted' },
      { color: 'bg-yellow-500', label: 'Expert' },
    ];
    return badges[level] || badges[0];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-12">
          <p className="text-muted-foreground">Profile not found</p>
          <Button variant="outline" className="mt-4" onClick={() => router.back()}>
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  const RoleIcon = getRoleIcon(profile.role);
  const verificationBadge = getVerificationBadge(profile.verificationLevel);
  const isOwnProfile = !profileId || (user && profileId === user._id) || (user && profile._id === user._id);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back Button */}
      {!isOwnProfile && (
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      )}

      {/* Profile Header — Enhanced with gradient mesh background */}
      <Card className="overflow-hidden relative bg-white/5 dark:bg-black/20 backdrop-blur-xl border-white/10 dark:border-white/5">
        {/* Gradient mesh background */}
        <div className="absolute inset-0 gradient-mesh-bg opacity-60 pointer-events-none" />
        <div
          className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(46, 139, 87, 0.08) 0%, rgba(0, 71, 171, 0.06) 50%, transparent 100%)',
          }}
        />

        <CardContent className="p-6 relative z-10">
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Avatar with 3D effect and upload option */}
            <div className="relative group">
              <div
                className="absolute -inset-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: 'var(--verified-gradient)',
                  filter: 'blur(8px)',
                }}
              />
              <Avatar className="h-24 w-24 relative ring-2 ring-white/50 dark:ring-white/10">
                <AvatarImage src={profile.avatar} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {getInitials(profile.name)}
                </AvatarFallback>
              </Avatar>
              
              {/* Upload overlay for own profile */}
              {isOwnProfile && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    data-testid="avatar-upload-input"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    data-testid="avatar-upload-button"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    ) : (
                      <Camera className="h-6 w-6 text-white" />
                    )}
                  </button>
                  {profile.avatar && (
                    <button
                      onClick={handleRemoveAvatar}
                      disabled={uploadingAvatar}
                      className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90"
                      title="Remove photo"
                      data-testid="avatar-remove-button"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                {isEditing ? (
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="text-xl font-bold max-w-xs"
                    placeholder="Your name"
                  />
                ) : (
                  <h1 className="text-2xl font-bold">{profile.name}</h1>
                )}
                <Badge className="flex items-center gap-1">
                  <RoleIcon className="h-3 w-3" />
                  {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                </Badge>
                {profile.plan && profile.role === 'founder' && (
                  <Badge variant="outline" className="capitalize">
                    {getPlanDisplayName(profile.plan as import('@/lib/subscription/features').PlanType, profile.role)}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Badge className={`${verificationBadge.color} text-white`}>
                  <Shield className="h-3 w-3 mr-1" />
                  Level {profile.verificationLevel} - {verificationBadge.label}
                </Badge>

                {profile.allianceCount !== undefined && profile.allianceCount > 0 && (
                  <div className="flex items-center gap-1 text-sm">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="font-medium">{profile.allianceCount}</span>
                    <span className="text-muted-foreground">Alliances</span>
                  </div>
                )}
                {!isEditing && profile.location && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {profile.location}
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-3 w-full">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      placeholder="Location"
                      className="flex-1"
                    />
                  </div>
                  <Textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    rows={3}
                  />
                </div>
              ) : (
                profile.bio && (
                  <p className="text-muted-foreground">{profile.bio}</p>
                )
              )}

              {/* Action Buttons */}
              {isOwnProfile && !isEditing && (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              )}

              {isOwnProfile && isEditing && (
                <div className="flex gap-2">
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              )}

              {!isOwnProfile && (
                <div className="flex flex-wrap items-center gap-3">
                  {profile.canMessage && (
                    <Button onClick={handleMessage}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                  )}
                  <AllianceButton
                    targetUserId={profile._id}
                    showMutualCount={true}
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Tabs — own profile only */}
      {isOwnProfile && (
        <div className="flex gap-0 border-b" style={{ borderColor: '#D8D2C8' }}>
          {[
            { id: 'overview', label: 'Overview', icon: Building2 },
            { id: 'verification', label: 'Verification', icon: Shield },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setProfileTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm transition-colors"
              style={{
                borderBottom: profileTab === tab.id ? '2px solid #2A2623' : '2px solid transparent',
                color: profileTab === tab.id ? '#2A2623' : '#6C635C',
                fontWeight: profileTab === tab.id ? 500 : 400,
              }}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Verification Tab */}
      {profileTab === 'verification' && isOwnProfile && (
        <VerificationProgress />
      )}


      {(profileTab === 'overview' || !isOwnProfile) && (
        <>


          {/* Social Links Section (Editable) */}
          {isOwnProfile && (
            <Card className="card-3d-hover bg-white/5 dark:bg-black/20 backdrop-blur-xl border-white/10 dark:border-white/5">
              <CardHeader>
                <CardTitle className="text-lg">Social Links</CardTitle>
                <CardDescription>Add your social profiles to showcase your work</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="github" className="flex items-center gap-2">
                      <Github className="h-4 w-4" />
                      GitHub
                    </Label>
                    <Input
                      id="github"
                      value={editForm.githubUrl}
                      onChange={(e) => setEditForm({ ...editForm, githubUrl: e.target.value })}
                      placeholder="https://github.com/username"
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkedin" className="flex items-center gap-2">
                      <Linkedin className="h-4 w-4" />
                      LinkedIn
                    </Label>
                    <Input
                      id="linkedin"
                      value={editForm.linkedinUrl}
                      onChange={(e) => setEditForm({ ...editForm, linkedinUrl: e.target.value })}
                      placeholder="https://linkedin.com/in/username"
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portfolio" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Portfolio Website
                  </Label>
                  <Input
                    id="portfolio"
                    value={editForm.portfolioUrl}
                    onChange={(e) => setEditForm({ ...editForm, portfolioUrl: e.target.value })}
                    placeholder="https://yourwebsite.com"
                    disabled={!isEditing}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Public Social Links View */}
          {!isOwnProfile && (profile.githubUrl || profile.linkedinUrl || profile.portfolioUrl) && (
            <Card className="card-3d-hover bg-white/5 dark:bg-black/20 backdrop-blur-xl border-white/10 dark:border-white/5">
              <CardHeader>
                <CardTitle>Links</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {profile.githubUrl && (
                    <PremiumGithub href={profile.githubUrl} />
                  )}
                  {profile.linkedinUrl && (
                    <PremiumLinkedIn href={profile.linkedinUrl} />
                  )}
                  {profile.portfolioUrl && (
                    <PremiumGlobe href={profile.portfolioUrl} />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Talent-specific sections */}
          {profile.role === 'talent' && (
            <>
              {/* Interested Roles */}
              {(isOwnProfile || (profile.interestedRoles && profile.interestedRoles.length > 0)) && (
                <Card className="card-3d-hover bg-white/5 dark:bg-black/20 backdrop-blur-xl border-white/10 dark:border-white/5">
                  <CardHeader>
                    <CardTitle>Interested Roles</CardTitle>
                    <CardDescription>Roles you are looking to be hired for</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <div className="space-y-2">
                        <Input
                          value={editForm.interestedRoles}
                          onChange={(e) => setEditForm({ ...editForm, interestedRoles: e.target.value })}
                          placeholder="e.g., Frontend Developer, Product Manager, UI Designer"
                        />
                        <p className="text-xs text-muted-foreground">Separate roles with commas</p>
                      </div>
                    ) : profile.interestedRoles && profile.interestedRoles.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {profile.interestedRoles.map((role) => (
                          <Badge key={role} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">{role}</Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No roles specified yet</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Skills */}
              {(isOwnProfile || (profile.skills && profile.skills.length > 0)) && (
                <Card className="card-3d-hover bg-white/5 dark:bg-black/20 backdrop-blur-xl border-white/10 dark:border-white/5">
                  <CardHeader>
                    <CardTitle>Skills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <div className="space-y-2">
                        <Input
                          value={editForm.skills}
                          onChange={(e) => setEditForm({ ...editForm, skills: e.target.value })}
                          placeholder="Enter skills separated by commas (e.g., React, Node.js, Python)"
                        />
                        <p className="text-xs text-muted-foreground">Separate skills with commas</p>
                      </div>
                    ) : profile.skills && profile.skills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {profile.skills.map((skill) => (
                          <Badge key={skill} variant="outline">{skill}</Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No skills added yet</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Experience */}
              {(isOwnProfile || profile.experience) && (
                <Card className="card-3d-hover bg-white/5 dark:bg-black/20 backdrop-blur-xl border-white/10 dark:border-white/5">
                  <CardHeader>
                    <CardTitle>Past Work Achievements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <Textarea
                        value={editForm.experience}
                        onChange={(e) => setEditForm({ ...editForm, experience: e.target.value })}
                        placeholder="Describe your professional experience..."
                        rows={4}
                      />
                    ) : profile.experience ? (
                      <p className="text-muted-foreground">{profile.experience}</p>
                    ) : (
                      <p className="text-muted-foreground">No experience added yet</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Resume */}
              {profile.hasResume && (
                <Card className="card-3d-hover bg-white/5 dark:bg-black/20 backdrop-blur-xl border-white/10 dark:border-white/5">
                  <CardHeader>
                    <CardTitle>Resume</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {profile.resumeUrl ? (
                      <Button variant="outline" asChild>
                        <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          Download Resume
                        </a>
                      </Button>
                    ) : (
                      <p className="text-muted-foreground">Resume available for founders and investors</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Founder-specific: Startups with AlloySphere Verified badge */}
          {profile.role === 'founder' && profile.startups && profile.startups.length > 0 && (
            <Card className="card-3d-hover bg-white/5 dark:bg-black/20 backdrop-blur-xl border-white/10 dark:border-white/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 icon-float" style={{ color: 'var(--cobalt-blue)' }} />
                  Startups
                </CardTitle>
                <CardDescription>Companies founded by {profile.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {profile.startups.map((startup) => (
                    <div
                      key={startup._id}
                      className="flex items-start gap-4 p-4 rounded-lg border transition-all duration-300 hover:shadow-md"
                      style={{
                        borderColor: startup.AlloySphereVerified
                          ? 'rgba(46, 139, 87, 0.3)'
                          : undefined,
                        background: startup.AlloySphereVerified
                          ? 'linear-gradient(135deg, rgba(46, 139, 87, 0.04) 0%, rgba(0, 71, 171, 0.03) 100%)'
                          : undefined,
                      }}
                    >
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {startup.logo ? (
                          <img src={startup.logo} alt={startup.name} className="h-12 w-12 rounded-lg object-cover" />
                        ) : (
                          <Building2 className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{startup.name}</h3>
                          <AlloySphereVerifiedBadge
                            verified={startup.AlloySphereVerified || false}
                            verifiedAt={startup.AlloySphereVerifiedAt}
                            variant="compact"
                          />
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{startup.vision}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline">{startup.industry}</Badge>
                          <Badge variant="outline" className="capitalize">{startup.stage}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Investor-specific sections */}
          {profile.role === 'investor' && (
            <Card className="card-3d-hover bg-white/5 dark:bg-black/20 backdrop-blur-xl border-white/10 dark:border-white/5">
              <CardHeader>
                <CardTitle>Investment Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.ticketSize && (
                  <div>
                    <h4 className="font-medium mb-1">Ticket Size</h4>
                    <p className="text-muted-foreground">
                      ${profile.ticketSize.min.toLocaleString()} - ${profile.ticketSize.max.toLocaleString()}
                    </p>
                  </div>
                )}

                {profile.preferredIndustries && profile.preferredIndustries.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Preferred Industries</h4>
                    <div className="flex flex-wrap gap-2">
                      {profile.preferredIndustries.map((ind) => (
                        <Badge key={ind} variant="secondary">{ind}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {profile.stagePreference && profile.stagePreference.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Stage Preference</h4>
                    <div className="flex flex-wrap gap-2">
                      {profile.stagePreference.map((stage) => (
                        <Badge key={stage} variant="outline" className="capitalize">
                          {stage.replace('-', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {profile.investmentThesis && (
                  <div>
                    <h4 className="font-medium mb-1">Investment Thesis</h4>
                    <p className="text-muted-foreground">{profile.investmentThesis}</p>
                  </div>
                )}

                {profile.investmentCount !== undefined && (
                  <div>
                    <h4 className="font-medium mb-1">Investments Made</h4>
                    <p className="text-muted-foreground">{profile.investmentCount} investments</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

/** Investment profile section — real data from /api/investments */
function InvestmentProfileSection({ userId }: { userId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchInvestments = async () => {
      try {
        const res = await fetch(`/api/investments?userId=${userId}`, { credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          setData(null);
        }
      } catch (err) {
        console.error('Investment fetch error:', err);
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchInvestments();
  }, [userId]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!data || !data.portfolio) return <p className="text-sm text-muted-foreground py-4">No investment data available.</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          ['Total Invested', `₹${(data.totalInvested || 0).toLocaleString('en-IN')}`],
          ['Portfolio', `${data.portfolio?.length || 0} startups`],
          ['Avg Equity', `${(data.averageEquity || 0).toFixed(1)}%`],
          ['Active Rounds', `${data.activeRounds || 0}`],
        ].map(([label, value]) => (
          <Card key={label} className="card-3d-hover">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-semibold mt-1 font-mono">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.portfolio && data.portfolio.length > 0 && (
        <Card className="card-3d-hover">
          <CardHeader>
            <CardTitle>Portfolio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.portfolio.map((item: any, i: number) => (
              <button
                key={i}
                onClick={() => item.startup?._id && router.push(`/startup/${item.startup._id}`)}
                className="flex items-center justify-between w-full px-4 py-3 rounded text-left border transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded flex items-center justify-center bg-muted">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.startup?.name || 'Unknown Startup'}</p>
                    <p className="text-xs text-muted-foreground capitalize">{item.startup?.industry}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono">₹{(item.amount || 0).toLocaleString('en-IN')}</p>
                  <p className="text-xs text-muted-foreground">{(item.equity || 0).toFixed(1)}% equity</p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
