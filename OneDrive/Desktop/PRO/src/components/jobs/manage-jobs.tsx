'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, Loader2, MapPin, Briefcase } from 'lucide-react';
import { useAuthStore } from '@/store';
import { apiFetch, apiPost, apiDelete } from '@/lib/api-client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';

export function ManageJobs() {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startupId, setStartupId] = useState<string | null>(null);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    experienceLevel: '',
    employmentType: 'full-time',
    locationType: 'remote'
  });

  useEffect(() => {
    async function fetchJobs() {
      try {
        const startupsRes = await apiFetch('/api/startups');
        const startupsData = await startupsRes.json();
        const startup = startupsData.startups?.[0] || startupsData?.[0];

        if (startup?._id) {
          setStartupId(startup._id);
          const res = await apiFetch(`/api/jobs/startup/${startup._id}`);
          if (res.ok) {
            const data = await res.json();
            setJobs(data.jobs || []);
          }
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    }

    if (user?.role === 'founder') {
      fetchJobs();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startupId) return;

    setIsSubmitting(true);
    try {
      const res = await apiPost('/api/jobs/create', {
        startupId,
        ...formData
      });

      if (res.ok) {
        const data = await res.json();
        setJobs([data.job, ...jobs]);
        setIsDialogOpen(false);
        setFormData({ title: '', description: '', experienceLevel: '', employmentType: 'full-time', locationType: 'remote' });
        toast.success('Job posted successfully');
      } else {
        toast.error('Failed to post job');
      }
    } catch (e) {
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job posting?')) return;
    
    try {
      const res = await apiDelete(`/api/jobs/${jobId}`);
      if (res.ok) {
        setJobs(jobs.filter(j => j._id !== jobId));
        toast.success('Job deleted');
      } else {
        toast.error('Failed to delete job');
      }
    } catch (e) {
      toast.error('An error occurred');
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-700 ease-out">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-b border-border/20 pb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Briefcase className="h-6 w-6 text-blue-500" />
            Manage Job Openings
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage job postings to attract top talent.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!startupId}>
              <Plus className="h-4 w-4 mr-2" />
              Post New Job
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Job Posting</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Job Title *</Label>
                <Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Experience Level *</Label>
                <Select value={formData.experienceLevel} onValueChange={v => setFormData({...formData, experienceLevel: v})} required>
                  <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">Entry Level</SelectItem>
                    <SelectItem value="mid">Mid Level</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Employment Type</Label>
                  <Select value={formData.employmentType} onValueChange={v => setFormData({...formData, employmentType: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Select value={formData.locationType} onValueChange={v => setFormData({...formData, locationType: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="remote">Remote</SelectItem>
                      <SelectItem value="onsite">On-site</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea required rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Post Job
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : !startupId ? (
        <div className="text-center py-20 border rounded-xl bg-card/30">
          <p>Please create a startup first before posting jobs.</p>
        </div>
      ) : jobs.length > 0 ? (
        <div className="grid gap-4">
          {jobs.map(job => (
            <Card key={job._id} className="relative overflow-hidden group border-border/50">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-primary mb-1">{job.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-4">
                      <span className="flex items-center gap-1"><Briefcase className="h-4 w-4" /> <span className="capitalize">{job.experienceLevel}</span></span>
                      <span className="flex items-center gap-1 capitalize"><MapPin className="h-4 w-4" /> {job.locationType}</span>
                      <span>{formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}</span>
                    </div>
                    <p className="text-sm line-clamp-2 md:line-clamp-3 max-w-3xl">{job.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(job._id)} className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border rounded-xl bg-card/30 backdrop-blur-md">
          <div className="bg-primary/5 h-16 w-16 mx-auto rounded-full flex items-center justify-center mb-4">
            <Briefcase className="h-8 w-8 text-primary/40" />
          </div>
          <h3 className="text-lg font-medium mb-1">No jobs posted yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            You haven't posted any job openings. Attract talent by listing your open roles.
          </p>
        </div>
      )}
    </div>
  );
}
