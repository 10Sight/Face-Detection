import React, { useMemo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    ResponsiveContainer, BarChart, Bar,
    Tooltip, Legend, Cell, PieChart, Pie
} from 'recharts';
import {
    Activity, Users, TrendingUp,
    Heart, ShieldAlert, Zap, Globe
} from 'lucide-react';
import { useGetAdvancedStatsQuery } from '../store/api/analyticsApi';

const AnalyticsDashboard = () => {
    const { data, isLoading } = useGetAdvancedStatsQuery();

    const stats = data?.data || {
        totalSightings24h: 0,
        uniqueIdentities: 0,
        demographics: [],
        trends: []
    };

    // Prepare Trend Data (Last 24h)
    const trendData = useMemo(() => {
        const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, sightings: 0 }));
        stats.trends.forEach(t => {
            const h = t._id.hour;
            hours[h].sightings += t.count;
        });
        return hours;
    }, [stats.trends]);

    // Prepare Demographic Data
    const demoData = useMemo(() => {
        return stats.demographics.map(d => ({
            name: `${d._id.gender} ${d._id.age}`,
            count: d.count
        })).sort((a, b) => b.count - a.count);
    }, [stats.demographics]);

    const COLORS = ['#4f46e5', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

    if (isLoading) return (
        <div className="flex items-center justify-center h-full">
            <div className="text-slate-400 font-bold uppercase tracking-widest animate-pulse">Initializing Neural Analytics...</div>
        </div>
    );

    return (
        <div className="page-shell flex flex-col gap-6 lg:gap-8 min-h-0 overflow-y-auto pr-2">
            {/* Header */}
            <div>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight uppercase mb-2">
                    Intelligence <span className="text-indigo-600">Dashboard</span>
                </h1>
                <div className="text-slate-500 font-semibold tracking-wide uppercase text-xs flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-indigo-500" />
                    Biometric Behavioral & Demographic Analysis
                </div>
            </div>

            {/* Top Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
                {[
                    { label: "Total Sightings (24h)", value: stats.totalSightings24h, icon: Activity, color: "text-indigo-600", bg: "bg-indigo-50" },
                    { label: "Unique Identities", value: stats.uniqueIdentities, icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
                    { label: "Peak Velocity", value: "12 f/s", icon: Zap, color: "text-amber-600", bg: "bg-amber-50" },
                    { label: "Regional Nodes", value: "Global", icon: Globe, color: "text-emerald-600", bg: "bg-emerald-50" }
                ].map((m, i) => (
                    <div key={i} className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-2 rounded-xl ${m.bg}`}>
                                <m.icon className={`w-5 h-5 ${m.color}`} />
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active</div>
                        </div>
                        <div className="text-3xl font-bold text-slate-900 mb-1 leading-none">{m.value}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-2">{m.label}</div>
                    </div>
                ))}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6 pb-8">
                {/* Main Trend Line */}
                <div className="xl:col-span-8 bg-white border border-slate-200/60 rounded-2xl p-6 lg:p-7 shadow-sm min-h-[420px]">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <div className="text-xl font-bold text-slate-900 tracking-tight">Sightings Velocity</div>
                            <div className="text-xs text-slate-400 font-semibold uppercase tracking-widest mt-1">Real-time hourly traffic analysis</div>
                        </div>
                        <TrendingUp className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div className="h-[300px] w-full min-w-0 relative">
                        <ResponsiveContainer width="100%" height={300} minWidth={0}>
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorSightings" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                <XAxis
                                    dataKey="hour"
                                    stroke="#94a3b8"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(255,255,255,0.9)',
                                        backdropFilter: 'blur(8px)',
                                        border: '1px solid rgba(0,0,0,0.05)',
                                        borderRadius: '12px',
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                    }}
                                    itemStyle={{ color: '#4f46e5' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="sightings"
                                    stroke="#4f46e5"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorSightings)"
                                    animationDuration={1500}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Demographics Chart */}
                <div className="xl:col-span-4 bg-white border border-slate-200/60 rounded-2xl p-6 lg:p-7 shadow-sm flex flex-col">
                    <div className="text-xl font-bold text-slate-900 tracking-tight mb-8">Demographics</div>
                    <div className="flex-1 min-h-[300px] min-w-0 relative">
                        <ResponsiveContainer width="100%" height={300} minWidth={0}>
                            <BarChart data={demoData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    stroke="#64748b"
                                    fontSize={9}
                                    width={100}
                                    axisLine={false}
                                    tickLine={false}
                                    fontWeight="600"
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                                    contentStyle={{
                                        backgroundColor: 'rgba(255,255,255,0.9)',
                                        backdropFilter: 'blur(8px)',
                                        border: '1px solid rgba(0,0,0,0.05)',
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                    }}
                                />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                                    {demoData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
