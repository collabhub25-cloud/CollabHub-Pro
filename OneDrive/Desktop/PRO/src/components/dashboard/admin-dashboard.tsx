'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, Building2, AlertTriangle, DollarSign, BarChart3,
  TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle,
  Shield, Activity, FileText, Zap
} from 'lucide-react';

interface AdminDashboardProps {
  activeTab: string;
}

export function AdminDashboard({ activeTab }: AdminDashboardProps) {
  const { user } = useAuthStore();

  const recentUsers = [
    { name: 'John Doe', email: 'john@example.com', role: 'talent', status: 'active' },
    { name: 'Sarah Chen', email: 'sarah@example.com', role: 'founder', status: 'active' },
    { name: 'Mike Johnson', email: 'mike@example.com', role: 'investor', status: 'pending' },
  ];

  const disputes = [
    { startup: 'TechNova', parties: 'John vs Sarah', reason: 'Milestone disagreement', status: 'open' },
    { startup: 'DataFlow', parties: 'Alice vs Bob', reason: 'Payment dispute', status: 'under_review' },
  ];

  // Dashboard Overview
  if (activeTab === 'dashboard') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Platform overview and management</p>
          </div>
          <Button variant="outline">
            <Activity className="h-4 w-4 mr-2" />
            System Status
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12,847</div>
              <p className="text-xs text-green-500">
                <TrendingUp className="h-3 w-3 inline mr-1" />
                +234 this week
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Startups</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2,543</div>
              <p className="text-xs text-green-500">
                <TrendingUp className="h-3 w-3 inline mr-1" />
                +45 this week
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Open Disputes</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">18</div>
              <p className="text-xs text-yellow-500">5 require attention</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$124,500</div>
              <p className="text-xs text-green-500">+12% from last month</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>User Growth</CardTitle>
              <CardDescription>New registrations over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                [User Growth Chart Placeholder]
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Revenue Breakdown</CardTitle>
              <CardDescription>Revenue by source</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Escrow Fees</span>
                    <span className="font-medium">$45,200 (36%)</span>
                  </div>
                  <Progress value={36} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Success Fees</span>
                    <span className="font-medium">$52,300 (42%)</span>
                  </div>
                  <Progress value={42} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subscriptions</span>
                    <span className="font-medium">$27,000 (22%)</span>
                  </div>
                  <Progress value={22} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentUsers.map((u, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{u.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{u.role}</Badge>
                      <Badge className={u.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}>
                        {u.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Active Disputes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {disputes.map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{d.startup}</p>
                      <p className="text-xs text-muted-foreground">{d.parties} • {d.reason}</p>
                    </div>
                    <Badge variant={d.status === 'open' ? 'destructive' : 'secondary'}>
                      {d.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Users Management
  if (activeTab === 'users') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">User Management</h1>
          <Button>Export Users</Button>
        </div>
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All Users</TabsTrigger>
            <TabsTrigger value="founders">Founders</TabsTrigger>
            <TabsTrigger value="talents">Talents</TabsTrigger>
            <TabsTrigger value="investors">Investors</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {recentUsers.map((u, i) => (
                    <div key={i} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{u.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{u.name}</p>
                          <p className="text-sm text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary">{u.role}</Badge>
                        <div className="flex items-center gap-1">
                          <Zap className="h-3 w-3 text-primary" />
                          <span className="text-sm">85</span>
                        </div>
                        <Badge className={u.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}>
                          {u.status}
                        </Badge>
                        <Button size="sm" variant="outline">View</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Startups Management
  if (activeTab === 'startups') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Startup Management</h1>
          <Button>Export Data</Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Startup {i}</CardTitle>
                  <Badge>Active</Badge>
                </div>
                <CardDescription>AI/ML • Seed Stage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trust Score</span>
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3 text-primary" />
                      <span>85</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Team Size</span>
                    <span>5</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Milestones</span>
                    <span>12 completed</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" className="flex-1">View</Button>
                  <Button size="sm" variant="outline">Edit</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Disputes
  if (activeTab === 'disputes') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dispute Resolution</h1>
        <Tabs defaultValue="open">
          <TabsList>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="review">Under Review</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
          </TabsList>
          <TabsContent value="open" className="space-y-4 mt-4">
            {disputes.filter(d => d.status === 'open').map((d, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <AlertTriangle className="h-8 w-8 text-red-500" />
                      <div>
                        <h3 className="font-semibold">{d.startup}</h3>
                        <p className="text-sm text-muted-foreground">{d.parties}</p>
                        <p className="text-sm text-muted-foreground mt-1">{d.reason}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">Review</Button>
                      <Button size="sm">Resolve</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Analytics
  if (activeTab === 'analytics') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Platform Analytics</h1>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>User Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Founders</span>
                    <span>35%</span>
                  </div>
                  <Progress value={35} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Talents</span>
                    <span>55%</span>
                  </div>
                  <Progress value={55} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Investors</span>
                    <span>10%</span>
                  </div>
                  <Progress value={10} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Platform Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted/30">
                  <p className="text-2xl font-bold text-green-500">99.9%</p>
                  <p className="text-sm text-muted-foreground">Uptime</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/30">
                  <p className="text-2xl font-bold">145ms</p>
                  <p className="text-sm text-muted-foreground">Avg Response</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/30">
                  <p className="text-2xl font-bold text-green-500">98%</p>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/30">
                  <p className="text-2xl font-bold">4.8</p>
                  <p className="text-sm text-muted-foreground">User Rating</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Default fallback
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold capitalize">{activeTab}</h1>
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">This section is coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}
