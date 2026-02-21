'use client';

import { useState } from 'react';
import { Plus, Loader2, Building2, Rocket } from 'lucide-react';
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

interface CreateStartupModalProps {
  onSuccess?: () => void;
}

const stages = [
  { value: 'idea', label: 'Idea Stage' },
  { value: 'validation', label: 'Validation' },
  { value: 'mvp', label: 'MVP' },
  { value: 'growth', label: 'Growth' },
  { value: 'scaling', label: 'Scaling' },
];

const fundingStages = [
  { value: 'pre-seed', label: 'Pre-Seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'series-a', label: 'Series A' },
  { value: 'series-b', label: 'Series B' },
  { value: 'series-c', label: 'Series C' },
  { value: 'ipo', label: 'IPO' },
];

const industries = [
  'Technology', 'Healthcare', 'Finance', 'E-commerce', 'Education',
  'Real Estate', 'Food & Beverage', 'Travel', 'Entertainment', 'Manufacturing', 'Other'
];

export function CreateStartupModal({ onSuccess }: CreateStartupModalProps) {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    vision: '',
    description: '',
    stage: '',
    industry: '',
    fundingStage: '',
    fundingAmount: '',
    website: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();


    if (user?.role !== 'founder') {
      toast.error('Only founders can create startups');
      return;
    }

    if (!formData.name || !formData.vision || !formData.description || !formData.stage || !formData.industry || !formData.fundingStage) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/startups', {
          credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          vision: formData.vision,
          description: formData.description,
          stage: formData.stage,
          industry: formData.industry,
          fundingStage: formData.fundingStage,
          fundingAmount: formData.fundingAmount ? parseFloat(formData.fundingAmount) : 0,
          website: formData.website,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Startup created successfully!');
        setOpen(false);
        setFormData({
          name: '',
          vision: '',
          description: '',
          stage: '',
          industry: '',
          fundingStage: '',
          fundingAmount: '',
          website: '',
        });
        onSuccess?.();
      } else {
        if (data.details && Array.isArray(data.details) && data.details.length > 0) {
          toast.error(data.details[0].message || 'Validation failed');
        } else {
          toast.error(data.error || 'Failed to create startup');
        }
      }
    } catch (error) {
      console.error('Error creating startup:', error);
      toast.error('Failed to create startup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Startup
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Create New Startup
          </DialogTitle>
          <DialogDescription>
            Fill in the details to create your startup profile
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Startup Name *</Label>
            <Input
              id="name"
              placeholder="My Awesome Startup"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vision">Vision *</Label>
            <Textarea
              id="vision"
              placeholder="What's your startup's vision?"
              value={formData.vision}
              onChange={(e) => setFormData({ ...formData, vision: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe your startup in detail"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Stage *</Label>
              <Select value={formData.stage} onValueChange={(v) => setFormData({ ...formData, stage: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Funding Stage *</Label>
              <Select value={formData.fundingStage} onValueChange={(v) => setFormData({ ...formData, fundingStage: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select funding stage" />
                </SelectTrigger>
                <SelectContent>
                  {fundingStages.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Industry *</Label>
              <Select value={formData.industry} onValueChange={(v) => setFormData({ ...formData, industry: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {industries.map((ind) => (
                    <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fundingAmount">Funding Amount ($)</Label>
              <Input
                id="fundingAmount"
                type="number"
                placeholder="100000"
                value={formData.fundingAmount}
                onChange={(e) => setFormData({ ...formData, fundingAmount: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              placeholder="https://mystartup.com"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            />
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
                  <Rocket className="h-4 w-4 mr-2" />
                  Create Startup
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
