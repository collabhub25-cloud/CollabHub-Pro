'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, MapPin, Briefcase, Building2, Loader2, Star } from 'lucide-react';
import { useAuthStore } from '@/store';
import { apiFetch } from '@/lib/api-client';
import { getInitials } from '@/lib/client-utils';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export function TalentJobsPage() {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchJobs() {
      try {
        const res = await apiFetch('/api/jobs');
        if (res.ok) {
          const data = await res.json();
          setJobs(data.jobs || []);
        }
      } catch (error) {
        console.error('Error fetching jobs:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchJobs();
  }, []);

  const handleApply = (jobId: string) => {
    toast.success('Successfully applied to job!');
  };

  const filteredJobs = jobs.filter(job => 
    job.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    job.startupId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.skillsRequired?.some((s: string) => s.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!user) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-700 ease-out">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-end border-b border-border/20 pb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Briefcase className="h-6 w-6 text-indigo-500" />
            Discover Opportunities
          </h1>
          <p className="text-muted-foreground mt-1">
            Find the perfect role at top startups shaping the future.
          </p>
        </div>
        <div className="w-full md:w-72 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search roles, skills, or startups..." 
            className="pl-9 bg-card/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filteredJobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map(job => (
            <Card key={job._id} className="relative overflow-hidden group hover:shadow-lg transition-all border-border/50 bg-card/50 backdrop-blur">
              <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-3">
                    <Avatar className="h-10 w-10 border shadow-sm">
                      <AvatarImage src={job.startupId?.logo} />
                      <AvatarFallback className="bg-primary/5 text-primary">
                        {getInitials(job.startupId?.name || 'S')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold text-base leading-tight group-hover:text-primary transition-colors">{job.title}</h3>
                      <p className="text-sm font-medium text-muted-foreground">{job.startupId?.name || 'Confidential Startup'}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-amber-500">
                    <Star className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-4">
                  <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-md">
                    <Briefcase className="h-3 w-3" /> <span className="capitalize">{job.experienceLevel}</span>
                  </span>
                  <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-md">
                    <MapPin className="h-3 w-3" /> <span className="capitalize">{job.locationType}</span>
                  </span>
                  <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-md">
                    <Building2 className="h-3 w-3" /> <span className="capitalize">{job.employmentType}</span>
                  </span>
                </div>

                <p className="text-sm line-clamp-2 mb-4 text-muted-foreground/80">
                  {job.description}
                </p>

                {job.skillsRequired && job.skillsRequired.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {job.skillsRequired.slice(0, 3).map((skill: string) => (
                      <Badge key={skill} variant="secondary" className="text-[10px] font-normal bg-primary/5 hover:bg-primary/10 transition-colors">{skill}</Badge>
                    ))}
                    {job.skillsRequired.length > 3 && (
                      <Badge variant="secondary" className="text-[10px] font-normal bg-muted">+{job.skillsRequired.length - 3}</Badge>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mt-aut pt-4 border-t border-border/40">
                  <span className="text-[10px] text-muted-foreground">
                    Posted {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                  </span>
                  <Button onClick={() => handleApply(job._id)} size="sm" className="h-8 text-xs font-semibold shadow-sm hover:shadow-md transition-shadow">
                    Apply Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border rounded-xl bg-card/30 backdrop-blur-md">
          <div className="bg-primary/5 h-16 w-16 mx-auto rounded-full flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-primary/40" />
          </div>
          <h3 className="text-lg font-medium mb-1">No jobs found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Try adjusting your search terms or check back later for new opportunities.
          </p>
        </div>
      )}
    </div>
  );
}
