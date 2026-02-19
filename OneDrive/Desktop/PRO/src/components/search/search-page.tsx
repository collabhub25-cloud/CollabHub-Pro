'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Search, Filter, ChevronDown, X, Loader2, Users, Building2, 
  TrendingUp, MapPin, Star, Briefcase, DollarSign, FileText, Send
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAuthStore, useUIStore } from '@/store';
import { AllianceButton } from '@/components/alliances/alliance-button';
import { ApplyModal } from '@/components/applications/apply-modal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { safeLocalStorage, STORAGE_KEYS, getInitials } from '@/lib/client-utils';

type SearchType = 'startups' | 'talents' | 'investors';

interface Role {
  _id: string;
  title: string;
  description?: string;
  skills?: string[];
  compensationType?: string;
  equityPercent?: number;
  cashAmount?: number;
}

interface SearchResult {
  _id: string;
  name: string;
  email?: string;
  avatar?: string;
  // Startup fields
  description?: string;
  vision?: string;
  industry?: string;
  stage?: string;
  fundingStage?: string;
  trustScore?: number;
  founderId?: { name: string; email: string };
  rolesNeeded?: Role[];
  isActive?: boolean;
  // Talent fields
  bio?: string;
  skills?: string[];
  verificationLevel?: number;
  role?: string;
  // Investor fields
  investorDetails?: {
    ticketSize: { min: number; max: number };
    preferredIndustries: string[];
    stagePreference: string[];
  };
  // Application status for talent
  hasApplied?: boolean;
}

interface SearchFilters {
  query: string;
  industry: string[];
  stage: string[];
  fundingStage: string[];
  skills: string[];
  verificationLevel: string[];
  trustScoreRange: [number, number];
  ticketSizeRange: [number, number];
}

const industries = [
  'Technology', 'Healthcare', 'Finance', 'E-commerce', 'Education',
  'Real Estate', 'Food & Beverage', 'Travel', 'Entertainment', 'Other'
];

const stages = ['idea', 'validation', 'mvp', 'growth', 'scaling'];
const fundingStages = ['pre-seed', 'seed', 'series-a', 'series-b', 'series-c', 'ipo'];

export function SearchPage() {
  const { token, user } = useAuthStore();
  const { setActiveTab } = useUIStore();
  const [activeTab, setActiveTabState] = useState<SearchType>('startups');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(true);
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    industry: [],
    stage: [],
    fundingStage: [],
    skills: [],
    verificationLevel: [],
    trustScoreRange: [0, 100],
    ticketSizeRange: [0, 1000000],
  });
  
  // Apply modal state
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedStartup, setSelectedStartup] = useState<SearchResult | null>(null);

  const viewProfile = (profileId: string) => {
    safeLocalStorage.setItem(STORAGE_KEYS.VIEW_PROFILE, profileId);
    setActiveTab('profile');
  };

  const searchResults = useCallback(async (pageNum: number = 1) => {
    if (!token) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', pageNum.toString());
      params.set('limit', '10');

      if (filters.query) params.set('q', filters.query);
      if (filters.industry.length) params.set('industry', filters.industry.join(','));
      if (filters.stage.length) params.set('stage', filters.stage.join(','));
      if (filters.fundingStage.length) params.set('fundingStage', filters.fundingStage.join(','));
      if (filters.trustScoreRange[0] > 0) params.set('minTrustScore', filters.trustScoreRange[0].toString());
      if (filters.trustScoreRange[1] < 100) params.set('maxTrustScore', filters.trustScoreRange[1].toString());

      const response = await fetch(`/api/search/${activeTab}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.startups || data.talents || data.investors || []);
        setTotalPages(data.pagination.pages);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  }, [token, activeTab, filters]);

  useEffect(() => {
    searchResults(1);
  }, [activeTab, searchResults]);

  const handleTabChange = (v: string) => {
    setActiveTabState(v as SearchType);
  };

  const handleFilterChange = (key: keyof SearchFilters, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayFilter = (key: 'industry' | 'stage' | 'fundingStage', value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(v => v !== value)
        : [...prev[key], value],
    }));
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      industry: [],
      stage: [],
      fundingStage: [],
      skills: [],
      verificationLevel: [],
      trustScoreRange: [0, 100],
      ticketSizeRange: [0, 1000000],
    });
  };

  const handleApply = (startup: SearchResult) => {
    setSelectedStartup(startup);
    setApplyModalOpen(true);
  };

  const handleApplySuccess = () => {
    // Refresh results to update hasApplied status
    searchResults(page);
  };

  const activeFilterCount = 
    filters.industry.length + 
    filters.stage.length + 
    filters.fundingStage.length +
    (filters.trustScoreRange[0] > 0 || filters.trustScoreRange[1] < 100 ? 1 : 0);

  const isTalent = user?.role === 'talent';

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${activeTab}...`}
            className="pl-10"
            value={filters.query}
            onChange={(e) => handleFilterChange('query', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchResults(1)}
          />
        </div>
        <Button onClick={() => searchResults(1)}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="relative"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="startups" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Startups
          </TabsTrigger>
          <TabsTrigger value="talents" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Talents
          </TabsTrigger>
          <TabsTrigger value="investors" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Investors
          </TabsTrigger>
        </TabsList>

        <div className="flex gap-6 mt-6">
          {/* Filters Sidebar */}
          {showFilters && (
            <Card className="w-72 flex-shrink-0">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Filters</CardTitle>
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Clear all
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Trust Score Range */}
                <div className="space-y-3">
                  <Label>Trust Score Range</Label>
                  <Slider
                    value={filters.trustScoreRange}
                    onValueChange={(v) => handleFilterChange('trustScoreRange', v)}
                    max={100}
                    step={5}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{filters.trustScoreRange[0]}</span>
                    <span>{filters.trustScoreRange[1]}</span>
                  </div>
                </div>

                {/* Industry Filter */}
                <div className="space-y-3">
                  <Label>Industry</Label>
                  <ScrollArea className="h-32">
                    <div className="space-y-2">
                      {industries.map((ind) => (
                        <label key={ind} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={filters.industry.includes(ind)}
                            onCheckedChange={() => toggleArrayFilter('industry', ind)}
                          />
                          <span className="text-sm">{ind}</span>
                        </label>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Stage Filter (for Startups) */}
                {activeTab === 'startups' && (
                  <>
                    <div className="space-y-3">
                      <Label>Startup Stage</Label>
                      <ScrollArea className="h-28">
                        <div className="space-y-2">
                          {stages.map((s) => (
                            <label key={s} className="flex items-center gap-2 cursor-pointer">
                              <Checkbox
                                checked={filters.stage.includes(s)}
                                onCheckedChange={() => toggleArrayFilter('stage', s)}
                              />
                              <span className="text-sm capitalize">{s}</span>
                            </label>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>

                    <div className="space-y-3">
                      <Label>Funding Stage</Label>
                      <ScrollArea className="h-28">
                        <div className="space-y-2">
                          {fundingStages.map((s) => (
                            <label key={s} className="flex items-center gap-2 cursor-pointer">
                              <Checkbox
                                checked={filters.fundingStage.includes(s)}
                                onCheckedChange={() => toggleArrayFilter('fundingStage', s)}
                              />
                              <span className="text-sm capitalize">{s.replace('-', ' ')}</span>
                            </label>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Results */}
          <div className="flex-1">
            <TabsContent value={activeTab} className="mt-0">
              {loading && results.length === 0 ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : results.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center p-12">
                    <Search className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No results found</p>
                    <p className="text-sm text-muted-foreground">
                      Try adjusting your search or filters
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {results.map((result) => (
                    <Card key={result._id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={result.avatar} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {getInitials(result.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{result.name}</h3>
                              {result.trustScore !== undefined && (
                                <Badge variant="secondary" className="flex items-center gap-1">
                                  <Star className="h-3 w-3" />
                                  {result.trustScore}
                                </Badge>
                              )}
                              {result.verificationLevel !== undefined && result.verificationLevel > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  Level {result.verificationLevel}
                                </Badge>
                              )}
                              {!result.isActive && activeTab === 'startups' && (
                                <Badge variant="outline" className="text-xs text-yellow-600">
                                  Inactive
                                </Badge>
                              )}
                            </div>
                            
                            {result.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {result.description}
                              </p>
                            )}
                            
                            {result.vision && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {result.vision}
                              </p>
                            )}

                            {result.bio && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {result.bio}
                              </p>
                            )}

                            <div className="flex flex-wrap gap-2 mt-3">
                              {result.industry && (
                                <Badge variant="outline">{result.industry}</Badge>
                              )}
                              {result.stage && (
                                <Badge variant="outline" className="capitalize">
                                  {result.stage}
                                </Badge>
                              )}
                              {result.skills?.slice(0, 3).map((skill) => (
                                <Badge key={skill} variant="outline">{skill}</Badge>
                              ))}
                              {result.investorDetails?.preferredIndustries?.slice(0, 2).map((ind) => (
                                <Badge key={ind} variant="outline">{ind}</Badge>
                              ))}
                            </div>

                            {/* Roles available for startups */}
                            {activeTab === 'startups' && result.rolesNeeded && result.rolesNeeded.length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs text-muted-foreground mb-1">Open Roles:</p>
                                <div className="flex flex-wrap gap-1">
                                  {result.rolesNeeded.map((role) => (
                                    <Badge key={role._id} variant="secondary" className="text-xs">
                                      {role.title}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {result.founderId && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Founded by {result.founderId.name}
                              </p>
                            )}

                            {result.investorDetails && (
                              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  ${result.investorDetails.ticketSize.min.toLocaleString()} - ${result.investorDetails.ticketSize.max.toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => viewProfile(result._id)}
                            >
                              View Profile
                            </Button>
                            
                            {/* Apply button for Talent viewing Startups */}
                            {activeTab === 'startups' && isTalent && user?._id !== result.founderId?._id && (
                              <Button 
                                size="sm"
                                onClick={() => handleApply(result)}
                                disabled={!result.isActive || !result.rolesNeeded?.length || result.hasApplied}
                              >
                                {result.hasApplied ? (
                                  <>
                                    <FileText className="h-4 w-4 mr-1" />
                                    Applied
                                  </>
                                ) : (
                                  <>
                                    <Send className="h-4 w-4 mr-1" />
                                    Apply
                                  </>
                                )}
                              </Button>
                            )}
                            
                            {/* Alliance button for Startups - connect with founder */}
                            {activeTab === 'startups' && result.founderId && user?._id !== result.founderId?._id && (
                              <AllianceButton 
                                targetUserId={result.founderId._id} 
                                compact={true}
                              />
                            )}
                            
                            {(activeTab === 'talents' || activeTab === 'investors') && user?._id !== result._id && (
                              <AllianceButton 
                                targetUserId={result._id} 
                                compact={true}
                              />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => searchResults(page - 1)}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === totalPages}
                        onClick={() => searchResults(page + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </div>
        </div>
      </Tabs>

      {/* Apply Modal for Talent */}
      <ApplyModal
        startup={selectedStartup}
        open={applyModalOpen}
        onOpenChange={setApplyModalOpen}
        onSuccess={handleApplySuccess}
      />
    </div>
  );
}
