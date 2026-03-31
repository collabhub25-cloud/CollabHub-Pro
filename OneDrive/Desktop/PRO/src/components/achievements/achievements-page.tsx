'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Trophy, Plus, Trash2, ImagePlus, X } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';
import Image from 'next/image';

interface Achievement {
  _id: string;
  title: string;
  description?: string;
  imageUrl: string;
  createdAt: string;
}

export function AchievementsPage() {
  const { user } = useAuthStore();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPEG, PNG, WebP, and GIF images are allowed');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!imageFile) {
      toast.error('Image is required');
      return;
    }

    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append('title', formData.title.trim());
      fd.append('description', formData.description.trim());
      fd.append('image', imageFile);

      const res = await fetch('/api/achievements/create', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });

      if (res.ok) {
        toast.success('Achievement added successfully!');
        setIsAdding(false);
        setFormData({ title: '', description: '' });
        clearImage();
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

  const handleCancel = () => {
    setIsAdding(false);
    setFormData({ title: '', description: '' });
    clearImage();
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
            Showcase your milestones and accomplishments with visual cards.
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
            <CardDescription>Fill in the details and upload an image.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
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
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm md:text-sm"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what you accomplished..."
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Image *</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageSelect}
                  className="hidden"
                  id="achievement-image"
                />
                
                {imagePreview ? (
                  <div className="relative group w-full max-w-sm">
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-border bg-muted">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="achievement-image"
                    className="flex flex-col items-center justify-center w-full max-w-sm aspect-video rounded-xl border-2 border-dashed border-muted-foreground/25 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all"
                  >
                    <ImagePlus className="h-10 w-10 text-muted-foreground/40 mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">Click to upload image</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">JPEG, PNG, WebP, GIF · Max 5MB</p>
                  </label>
                )}
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Achievement
                </Button>
                <Button type="button" variant="ghost" onClick={handleCancel}>
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
              Share your milestones and accomplishments to stand out.
            </p>
            <Button onClick={() => setIsAdding(true)} variant="outline">Create your first achievement</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map((item) => (
            <Card key={item._id} className="group hover:border-primary/30 transition-all overflow-hidden bg-card/50 backdrop-blur hover:shadow-lg hover:-translate-y-0.5 duration-200">
              {/* Image */}
              <div className="relative aspect-video w-full overflow-hidden bg-muted">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 bg-black/40 hover:bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                  onClick={() => handleDelete(item._id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <CardContent className="p-4">
                <h3 className="text-base font-bold text-foreground leading-tight">{item.title}</h3>
                {item.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-3 leading-relaxed">
                    {item.description}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground/60 mt-3 uppercase tracking-wider">
                  {new Date(item.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
