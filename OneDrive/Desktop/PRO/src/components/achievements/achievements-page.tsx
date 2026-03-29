'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Trophy, Plus, Trash2, Calendar, Link as LinkIcon, Building } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';

interface Achievement {
  _id: string;
  title: string;
  description?: string;
  type: string;
  organization?: string;
  date?: string;
  proofLink?: string;
}

export function AchievementsPage() {
  const { user } = useAuthStore();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'award',
    organization: '',
    date: '',
    proofLink: '',
  });

  const fetchAchievements = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/achievements/user/me');
      if (res.ok) {
        const data = await res.json();
        setAchievements(data.achievements || []);
      }
    } catch (error) {
      console.error('Failed to load achievements', error);
      toast.error('Failed to load achievements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    
    try {
      setSubmitting(true);
      const res = await apiFetch('/api/achievements/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success('Achievement added successfully!');
        setIsAdding(false);
        setFormData({ title: '', description: '', type: 'award', organization: '', date: '', proofLink: '' });
        fetchAchievements();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to add achievement');
      }
    } catch (error) {
      toast.error('Server error. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this achievement?')) return;
    try {
      const res = await apiFetch(`/api/achievements/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Achievement deleted');
        setAchievements(prev => prev.filter(a => a._id !== id));
      } else {
        toast.error('Failed to delete achievement');
      }
    } catch (error) {
      toast.error('Server error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            My Achievements
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Showcase your awards, hackathons, and certifications to stand out to startups.
          </p>
        </div>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Achievement
          </Button>
        )}
      </div>

      {isAdding && (
        <Card className="border-primary/20 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Add New Achievement</CardTitle>
            <CardDescription>Fill in the details below to add to your profile.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title *</label>
                  <Input 
                    value={formData.title} 
                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. 1st Place - Global Hackathon"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <select 
                    value={formData.type}
                    onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background md:text-sm"
                  >
                    <option value="award">Award</option>
                    <option value="hackathon">Hackathon</option>
                    <option value="certification">Certification</option>
                    <option value="publication">Publication</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Organization / Issuer</label>
                  <Input 
                    value={formData.organization} 
                    onChange={e => setFormData(prev => ({ ...prev, organization: e.target.value }))}
                    placeholder="e.g. Google, MIT, Coursera"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Received</label>
                  <Input 
                    type="date"
                    value={formData.date} 
                    onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea 
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm md:text-sm"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what you accomplished or learned..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Proof / Credential URL</label>
                <Input 
                  type="url"
                  value={formData.proofLink} 
                  onChange={e => setFormData(prev => ({ ...prev, proofLink: e.target.value }))}
                  placeholder="https://"
                />
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Achievement
                </Button>
                <Button type="button" variant="ghost" onClick={() => setIsAdding(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {achievements.length === 0 && !isAdding ? (
        <Card className="bg-muted/30 border-dashed border-2 shadow-none">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
            <div className="h-16 w-16 rounded-full bg-background flex items-center justify-center mb-4">
              <Trophy className="h-8 w-8 opacity-40 text-yellow-500" />
            </div>
            <p className="text-lg font-semibold text-foreground/80">No achievements yet</p>
            <p className="text-sm mt-1 max-w-sm mb-6">
              Share your milestones, awards, and certifications to increase your chances of getting hired.
            </p>
            <Button onClick={() => setIsAdding(true)} variant="outline">Create your first achievement</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map((item) => (
            <Card key={item._id} className="group hover:border-primary/30 transition-colors bg-card/50 backdrop-blur">
              <CardContent className="p-5 flex flex-col h-full">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize text-xs font-medium">
                      {item.type}
                    </Badge>
                    {item.date && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(item.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(item._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <h3 className="text-base font-bold text-foreground mt-1 leading-tight">{item.title}</h3>
                
                {item.organization && (
                  <p className="text-sm text-primary flex items-center gap-1.5 mt-2 font-medium">
                    <Building className="h-3.5 w-3.5" /> {item.organization}
                  </p>
                )}

                {item.description && (
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-3 leading-relaxed flex-1">
                    {item.description}
                  </p>
                )}

                {item.proofLink && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <a 
                      href={item.proofLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1.5 transition-colors font-medium w-fit"
                    >
                      <LinkIcon className="h-3.5 w-3.5" /> View Credential
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
