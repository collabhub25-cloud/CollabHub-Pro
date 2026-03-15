"use client"
import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
    Home,
    DollarSign,
    Monitor,
    ShoppingCart,
    Tag,
    BarChart3,
    Users,
    ChevronDown,
    ChevronsRight,
    TrendingUp,
    Activity,
    Package,
    Bell,
    Settings,
    HelpCircle,
    Briefcase,
    FileText
} from "lucide-react";

interface SidebarProps {
    role?: 'founder' | 'investor' | 'talent';
}

export const DashboardSidebarLayout = ({
    children,
    role = 'founder'
}: {
    children?: React.ReactNode;
    role?: 'founder' | 'investor' | 'talent';
}) => {
    const [isDark, setIsDark] = useState(false);

    return (
        <div className={`flex min-h-screen w-full`}>
            <div className="flex w-full min-h-screen bg-gray-50 text-gray-900">
                <Sidebar role={role} />
                <div className="flex-1 flex flex-col h-screen overflow-hidden">
                    <Header isDark={isDark} setIsDark={setIsDark} role={role} />
                    <main className="flex-1 overflow-auto p-6 bg-gray-50">
                        {children || <ExampleContent />}
                    </main>
                </div>
            </div>
        </div>
    );
};

const Sidebar = ({ role }: SidebarProps) => {
    const [open, setOpen] = useState(true);
    const [selected, setSelected] = useState("Dashboard");

    // Define options based on role
    const options = React.useMemo(() => {
        switch (role) {
            case 'investor':
                return [
                    { icon: Home, title: "Dashboard" },
                    { icon: Briefcase, title: "Portfolio" },
                    { icon: DollarSign, title: "Investments", notifs: 2 },
                    { icon: BarChart3, title: "Analytics" },
                ];
            case 'talent':
                return [
                    { icon: Home, title: "Dashboard" },
                    { icon: FileText, title: "Projects" },
                    { icon: Monitor, title: "Find Work" },
                    { icon: DollarSign, title: "Earnings" },
                ];
            case 'founder':
            default:
                return [
                    { icon: Home, title: "Dashboard" },
                    { icon: Users, title: "Team", notifs: 4 },
                    { icon: Monitor, title: "Startup Profile" },
                    { icon: BarChart3, title: "Metrics" },
                    { icon: DollarSign, title: "Funding", notifs: 1 },
                ];
        }
    }, [role]);

    return (
        <nav
            className={`relative h-screen shrink-0 border-r transition-all duration-300 ease-in-out ${open ? 'w-64' : 'w-20'
                } border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 shadow-sm flex flex-col`}
        >
            <TitleSection open={open} role={role} />

            <div className="space-y-1 mb-8 flex-1 overflow-y-auto mt-4 px-1 custom-scrollbar">
                {options.map((opt) => (
                    <Option
                        key={opt.title}
                        Icon={opt.icon}
                        title={opt.title}
                        selected={selected}
                        setSelected={setSelected}
                        open={open}
                        notifs={opt.notifs}
                    />
                ))}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-800 pt-4 pb-12 space-y-1 px-1">
                {open && (
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Account
                    </div>
                )}
                <Option
                    Icon={Settings}
                    title="Settings"
                    selected={selected}
                    setSelected={setSelected}
                    open={open}
                />
                <Option
                    Icon={HelpCircle}
                    title="Help & Support"
                    selected={selected}
                    setSelected={setSelected}
                    open={open}
                />
            </div>

            <ToggleClose open={open} setOpen={setOpen} />
        </nav>
    );
};

const Option = ({ Icon, title, selected, setSelected, open, notifs }: any) => {
    const isSelected = selected === title;

    return (
        <button
            onClick={() => setSelected(title)}
            title={!open ? title : undefined}
            className={`relative flex h-11 w-full items-center rounded-lg transition-all duration-200 ${isSelected
                ? "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
        >
            <div className="grid h-full w-12 place-content-center shrink-0">
                <Icon className={`h-5 w-5 ${isSelected ? "text-blue-600 dark:text-blue-400" : ""}`} />
            </div>

            {open && (
                <span
                    className={`text-sm font-medium transition-opacity duration-200 whitespace-nowrap ${open ? 'opacity-100' : 'opacity-0'
                        }`}
                >
                    {title}
                </span>
            )}

            {notifs && open && (
                <span className="absolute right-3 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 dark:bg-blue-500 px-1.5 text-caption text-white font-bold tracking-wide">
                    {notifs}
                </span>
            )}
            {/* Small dot notification when closed */}
            {notifs && !open && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-500 border-2 border-white dark:border-gray-900"></span>
            )}
        </button>
    );
};

const TitleSection = ({ open, role = 'founder' }: { open: boolean, role?: string }) => {
    return (
        <div className="mb-2 border-b border-gray-200 dark:border-gray-800 pb-4 pt-1">
            <div className="flex cursor-pointer items-center justify-between rounded-xl p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
                <div className="flex items-center gap-3 overflow-hidden">
                    <Logo />
                    {open && (
                        <div className={`transition-opacity duration-200 whitespace-nowrap ${open ? 'opacity-100' : 'opacity-0'}`}>
                            <div className="flex flex-col">
                                <span className="block text-sm font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                                    AlloySphere
                                </span>
                                <span className="block text-caption font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    {role} Portal
                                </span>
                            </div>
                        </div>
                    )}
                </div>
                {open && (
                    <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                )}
            </div>
        </div>
    );
};

const Logo = () => {
    return (
        <div className="grid size-10 shrink-0 place-content-center rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 shadow-md">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Abstract Sphere Intersection Logo */}
                <circle cx="16" cy="12" r="6" fill="white" opacity="0.9" />
                <circle cx="12" cy="20" r="6" fill="white" opacity="0.7" />
                <circle cx="20" cy="20" r="6" fill="white" opacity="0.5" />
                <path d="M12 20a6 6 0 018 0" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
            </svg>
        </div>
    );
};

const ToggleClose = ({ open, setOpen }: any) => {
    return (
        <button
            onClick={() => setOpen(!open)}
            className="absolute bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 z-10"
        >
            <div className="flex items-center p-3">
                <div className="grid size-10 place-content-center shrink-0">
                    <ChevronsRight
                        className={`h-5 w-5 transition-transform duration-300 text-gray-500 dark:text-gray-400 ${open ? "rotate-180" : ""
                            }`}
                    />
                </div>
                {open && (
                    <span
                        className={`text-sm font-medium text-gray-600 dark:text-gray-300 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'
                            }`}
                    >
                        Collapse Sidebar
                    </span>
                )}
            </div>
        </button>
    );
};

const Header = ({ isDark, setIsDark, role }: any) => {
    return (
        <header className="h-16 flex items-center justify-between px-6 bg-white/80 backdrop-blur-md border-b border-gray-200 z-10 sticky top-0">
            <div>
                {/* Can put breadcrumbs or search here */}
            </div>
            <div className="flex items-center gap-3">
                <button className="relative p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                    <Bell className="h-4 w-4" />
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full border border-white"></span>
                </button>
                <button className="h-9 w-9 rounded-full overflow-hidden border-2 border-white shadow-sm ml-2 relative">
                    <Image
                        src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                        alt="User Avatar"
                        fill
                        className="object-cover"
                    />
                </button>
            </div>
        </header>
    )
}

const ExampleContent = () => {
    return (
        <div className="w-full h-full max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Dashboard Overview</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Welcome back to your central hub.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Income"
                    value="$24,567"
                    trend="+12%"
                    trendUp={true}
                    icon={DollarSign}
                    color="blue"
                />
                <StatCard
                    title="Active Projects"
                    value="14"
                    trend="+2"
                    trendUp={true}
                    icon={Briefcase}
                    color="indigo"
                />
                <StatCard
                    title="Profile Views"
                    value="1,245"
                    trend="+18%"
                    trendUp={true}
                    icon={Users}
                    color="emerald"
                />
                <StatCard
                    title="System Status"
                    value="Optimal"
                    trend="All systems go"
                    trendUp={true}
                    icon={Activity}
                    color="amber"
                    valueClass="text-lg"
                />
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activity */}
                <div className="lg:col-span-2 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Activity</h3>
                        <button className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline">
                            View all
                        </button>
                    </div>
                    <div className="p-4 space-y-2">
                        <ActivityItem
                            icon={DollarSign} title="Payment received" desc="Invoice #1042 was paid" time="2 min ago" color="emerald"
                        />
                        <ActivityItem
                            icon={Users} title="New connection" desc="Sarah Jenkins connected with you" time="1 hour ago" color="blue" userImage="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                        />
                        <ActivityItem
                            icon={Package} title="Project updated" desc="V2 milestones pushed" time="3 hours ago" color="indigo"
                        />
                    </div>
                </div>

                {/* Quick Actions or Analytics */}
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-6 flex flex-col items-center justify-center text-center">
                    <div className="h-32 w-32 relative mb-6">
                        {/* A nice illustration placeholder */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-100 to-indigo-50 dark:from-blue-900/40 dark:to-indigo-800/20 rounded-full animate-pulse"></div>
                        <BarChart3 className="absolute inset-0 m-auto h-12 w-12 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Upgrade to Pro</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Unlock advanced analytics, priority support, and unlimited projects.</p>
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition-colors shadow-sm shadow-blue-600/20">
                        View Plans
                    </button>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, trend, trendUp, icon: Icon, color, valueClass = "text-3xl" }: any) => {
    const colorMap: Record<string, string> = {
        blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
        indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400",
        emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
        amber: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
    };

    return (
        <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-all duration-200 group">
            <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-xl ${colorMap[color] || colorMap.blue}`}>
                    <Icon className="h-5 w-5" />
                </div>
                <div className={`flex items-center gap-1 text-xs font-semibold ${trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {trendUp && <TrendingUp className="h-3 w-3" />}
                    {trend}
                </div>
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</p>
                <h4 className={`font-bold text-gray-900 dark:text-white tracking-tight ${valueClass}`}>{value}</h4>
            </div>
        </div>
    );
};

const ActivityItem = ({ icon: Icon, title, desc, time, color, userImage }: any) => {
    const colorMap: Record<string, string> = {
        emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
        blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
        indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400",
    };

    return (
        <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer border border-transparent hover:border-gray-100 dark:hover:border-gray-800 group">
            {userImage ? (
                <div className="relative h-10 w-10 shrink-0">
                    <Image src={userImage} alt={title} fill className="rounded-full object-cover border border-gray-200 dark:border-gray-700" />
                </div>
            ) : (
                <div className={`h-10 w-10 shrink-0 flex items-center justify-center rounded-full ${colorMap[color] || colorMap.blue}`}>
                    <Icon className="h-4 w-4" />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {desc}
                </p>
            </div>
            <div className="text-xs font-medium text-gray-400 dark:text-gray-500 shrink-0">
                {time}
            </div>
        </div>
    );
};

export const Example = DashboardSidebarLayout;
export default DashboardSidebarLayout;
