'use client';

import { useState, useEffect } from 'react';
import { Plus, Loader2, Calendar, DollarSign, User } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/store';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';

interface CreateMilestoneModalProps {
  startupId?: string;
  onSuccess?: () => void;
}

interface Startup {
  _id: string;
  name: string;
}

interface Talent {
  _id: string;
  name: string;
  email: string;
}

export function CreateMilestoneModal({ startupId, onSuccess }: CreateMilestoneModalProps) {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [startups, setStartups] = useState<Startup[]>([]);
  const [talents, setTalents] = useState<Talent[]>([]);
  const [formData, setFormData] = useState({
    startupId: startupId || '',
    assignedTo: '',
    title: '',
    description: '',
    amount: '',
    dueDate: '',
  });

  // Fetch startups on mount
  useEffect(() => {
    if (open ) {
      const fetchData = async () => {
        try {
          // Fetch founder's startups
          const startupsRes = await fetch('/api/startups', {
          credentials: 'include',
          });
          if (startupsRes.ok) {
            const data = await startupsRes.json();
            setStartups(data.startups || []);
          }

          // Fetch available talents
          const talentsRes = await fetch('/api/search/talents?limit=50', {
          credentials: 'include',
          });
          if (talentsRes.ok) {
            const data = await talentsRes.json();
            setTalents(data.talents || []);
          }
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      };
      fetchData();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();


    if (user?.role !== 'founder') {
      toast.error('Only founders can create milestones');
      return;
    }

    if (!formData.startupId || !formData.assignedTo || !formData.title || !formData.description || !formData.amount || !formData.dueDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/milestones', {
          credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startupId: formData.startupId,
          assignedTo: formData.assignedTo,
          title: formData.title,
          description: formData.description,
          amount: parseFloat(formData.amount),
          dueDate: formData.dueDate,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Milestone created successfully!');
        setOpen(false);
        setFormData({
          startupId: startupId || '',
          assignedTo: '',
          title: '',
          description: '',
          amount: '',
          dueDate: '',
        });
        onSuccess?.();
      } else {
        toast.error(data.error || 'Failed to create milestone');
      }
    } catch (error) {
      console.error('Error creating milestone:', error);
      toast.error('Failed to create milestone');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Milestone
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Create New Milestone
          </DialogTitle>
          <DialogDescription>
            Define a milestone with payment amount and assignee
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Startup *</Label>
            <Select 
              value={formData.startupId} 
              onValueChange={(v) => setFormData({ ...formData, startupId: v })}
              disabled={!!startupId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select startup" />
              </SelectTrigger>
              <SelectContent>
                {startups.map((s) => (
                  <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Assign To *</Label>
            <Select 
              value={formData.assignedTo} 
              onValueChange={(v) => setFormData({ ...formData, assignedTo: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select talent" />
              </SelectTrigger>
              <SelectContent>
                {talents.map((t) => (
                  <SelectItem key={t._id} value={t._id}>
                    {t.name} ({t.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Design Landing Page"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe what needs to be done"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($) *</Label>
              <Input
                id="amount"
                type="number"
                placeholder="500"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date *</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Create Milestone
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
