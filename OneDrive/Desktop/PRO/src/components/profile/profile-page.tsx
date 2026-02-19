'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Mail, MapPin, ExternalLink, Briefcase, 
  Building2, TrendingUp, Star, Shield, FileText, 
  MessageSquare, Loader2, Download, Github, Linkedin, Globe, Users,
  Edit, Save, X, Plus
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
import { safeLocalStorage, STORAGE_KEYS, getInitials } from '@/lib/client-utils';
import { getPlanDisplayName } from '@/lib/subscription/features';
import { toast } from 'sonner';

interface ProfileData {
  _id: string;
  name: string;
  role: 'talent' | 'founder' | 'investor';
  avatar?: string;
  bio?: string;
  trustScore: number;
  verificationLevel: number;
  location?: string;
  createdAt: string;
  skills?: string[];
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
    trustScore: number;
    logo?: string;
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
  const { user, token, setUser } = useAuthStore();
  const { setActiveTab } = useUIStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    bio: '',
    location: '',
    githubUrl: '',
    linkedinUrl: '',
    portfolioUrl: '',
    skills: '',
    experience: '',
  });

  const fetchProfile = useCallback(async () => {
    if (!token) {
      console.log('No token found in auth store');
      setLoading(false);
      return;
    }

    try {
      const endpoint = profileId 
        ? `/api/users/profile/${profileId}`
        : '/api/users/me';
      
      console.log('Fetching profile from:', endpoint);
      const response = await fetch(endpoint, {
        headers: { 
          'Authorization': `Bearer ${token}`,
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
  }, [profileId, token]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSaveProfile = async () => {
    if (!token) return;
    
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
      }

      // Only add experience for talent
      if (profile?.role === 'talent' && editForm.experience) {
        updates.experience = editForm.experience;
      }

      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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
    if (profile?.conversationId) {
      setActiveTab('messages');
      safeLocalStorage.setItem(STORAGE_KEYS.OPEN_CONVERSATION, profile.conversationId);
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

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile.avatar} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {getInitials(profile.name)}
              </AvatarFallback>
            </Avatar>
            
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
                    {getPlanDisplayName(profile.plan, profile.role)}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Badge className={`${verificationBadge.color} text-white`}>
                  <Shield className="h-3 w-3 mr-1" />
                  Level {profile.verificationLevel} - {verificationBadge.label}
                </Badge>
                <div className="flex items-center gap-1 text-sm">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium">{profile.trustScore}</span>
                  <span className="text-muted-foreground">Trust Score</span>
                </div>
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

      {/* Social Links Section (Editable) */}
      {isOwnProfile && (
        <Card>
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
        <Card>
          <CardHeader>
            <CardTitle>Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {profile.githubUrl && (
                <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" 
                  className="flex items-center gap-2 text-primary hover:underline">
                  <Github className="h-4 w-4" />
                  GitHub
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {profile.linkedinUrl && (
                <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline">
                  <Linkedin className="h-4 w-4" />
                  LinkedIn
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {profile.portfolioUrl && (
                <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline">
                  <Globe className="h-4 w-4" />
                  Portfolio
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Talent-specific sections */}
      {profile.role === 'talent' && (
        <>
          {/* Skills */}
          {(isOwnProfile || (profile.skills && profile.skills.length > 0)) && (
            <Card>
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
                      <Badge key={skill} variant="secondary">{skill}</Badge>
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
            <Card>
              <CardHeader>
                <CardTitle>Experience</CardTitle>
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
            <Card>
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

      {/* Founder-specific sections */}
      {profile.role === 'founder' && profile.startups && profile.startups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Startups</CardTitle>
            <CardDescription>Companies founded by {profile.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {profile.startups.map((startup) => (
                <div key={startup._id} className="flex items-start gap-4 p-4 border rounded-lg">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {startup.logo ? (
                      <img src={startup.logo} alt={startup.name} className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      <Building2 className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">{startup.name}</h3>
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
        <Card>
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
    </div>
  );
}
