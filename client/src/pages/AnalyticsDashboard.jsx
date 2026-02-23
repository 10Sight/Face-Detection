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

    const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

    if (isLoading) return (
        <div className="flex items-center justify-center h-full">
            <div className="text-zinc-500 font-black uppercase tracking-[0.3em] animate-pulse">Initializing Neural Analytics...</div>
        </div>
    );

    return (
        <div className="page-shell flex flex-col gap-6 lg:gap-8 overflow-y-auto">
            {/* Header */}
            <div>
                <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase mb-2">
                    Intelligence <span className="text-blue-500">Dashboard</span>
                </h1>
                <div className="text-zinc-500 font-medium tracking-widest uppercase text-xs flex items-center gap-2">
                    <Activity className="w-3 h-3 text-blue-500" />
                    Biometric Behavioral & Demographic Analysis
                </div>
            </div>

            {/* Top Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
                {[
                    { label: "Total Sightings (24h)", value: stats.totalSightings24h, icon: Activity, color: "text-blue-500" },
                    { label: "Unique Identities", value: stats.uniqueIdentities, icon: Users, color: "text-purple-500" },
                    { label: "Peak Velocity", value: "12 f/s", icon: Zap, color: "text-amber-500" },
                    { label: "Regional Nodes", value: "Global", icon: Globe, color: "text-green-500" }
                ].map((m, i) => (
                    <div key={i} className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-3xl">
                        <div className="flex items-center justify-between mb-4">
                            <m.icon className={`w-5 h-5 ${m.color}`} />
                            <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Active</div>
                        </div>
                        <div className="text-3xl font-black text-white mb-1">{m.value}</div>
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{m.label}</div>
                    </div>
                ))}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6">
                {/* Main Trend Line */}
                <div className="xl:col-span-8 bg-white/[0.02] border border-white/10 rounded-3xl p-6 lg:p-8 backdrop-blur-3xl min-h-[420px]">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <div className="text-xl font-bold text-white uppercase tracking-tight">Sightings Velocity</div>
                            <div className="text-xs text-zinc-500 font-medium uppercase tracking-widest mt-1">Real-time hourly traffic analysis</div>
                        </div>
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorSightings" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis
                                    dataKey="hour"
                                    stroke="#52525b"
                                    fontSize={10}
                                    fontFamily="Inter"
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#52525b"
                                    fontSize={10}
                                    fontFamily="Inter"
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="sightings"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorSightings)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Demographics Chart */}
                <div className="xl:col-span-4 bg-white/[0.02] border border-white/10 rounded-3xl p-6 lg:p-8 backdrop-blur-3xl flex flex-col">
                    <div className="text-xl font-bold text-white uppercase tracking-tight mb-8">Demographics</div>
                    <div className="flex-1 min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={demoData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    stroke="#52525b"
                                    fontSize={9}
                                    width={100}
                                    family="Inter"
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
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
