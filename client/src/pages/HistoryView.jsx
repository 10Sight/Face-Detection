import React, { useState } from 'react';
import { useGetHistoryQuery } from '../store/api/analyticsApi';
import { motion, AnimatePresence } from 'framer-motion';
import {
    History,
    User,
    Heart,
    Clock,
    ShieldCheck,
    MoreHorizontal,
    ChevronLeft,
    ChevronRight,
    RefreshCcw,
    Search,
    Download,
    Filter,
    Activity,
    Database
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

const HistoryView = () => {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const { data: response, isLoading, isFetching, refetch } = useGetHistoryQuery({ page, limit });

    const history = response?.data?.history || [];
    const pagination = response?.data?.pagination || { total: 0, totalPages: 1 };

    const handleNextPage = () => {
        if (page < pagination.totalPages) setPage(p => p + 1);
    };

    const handlePrevPage = () => {
        if (page > 1) setPage(p => p - 1);
    };

    return (
        <div className="page-shell space-y-6 lg:space-y-8 flex flex-col h-full overflow-hidden">
            {/* Header Area */}
            <div className="surface-card px-4 py-4 sm:px-6 sm:py-5 flex flex-col xl:flex-row xl:justify-between xl:items-end gap-4 shrink-0">
                <div className="min-w-0">
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase mb-2">
                        Operational <span className="text-blue-500">Log</span>
                    </h1>
                    <div className="text-zinc-500 font-medium tracking-widest uppercase text-xs flex items-center gap-2 flex-wrap">
                        <History className="w-3 h-3 text-blue-500" />
                        Neural Sighting Archive & Access Audit
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 sm:gap-4 bg-white/[0.03] p-1.5 border border-white/10 rounded-2xl backdrop-blur-3xl self-start xl:self-auto">
                    <div className="flex items-center gap-3 px-4 py-2 bg-black/40 border border-white/5 rounded-xl min-w-[200px]">
                        <Search className="w-4 h-4 text-zinc-600" />
                        <input
                            type="text"
                            placeholder="Search identities..."
                            className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none w-full text-white placeholder:text-zinc-700"
                        />
                    </div>
                    <Button
                        variant="ghost"
                        onClick={() => refetch()}
                        className={`rounded-xl h-10 px-4 font-bold uppercase tracking-widest text-[10px] ${isFetching ? 'text-blue-500' : 'text-zinc-400'}`}
                    >
                        <RefreshCcw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                        Sync
                    </Button>
                    <Button
                        variant="secondary"
                        className="rounded-xl h-10 px-4 font-bold uppercase tracking-widest text-[10px]"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Stats Quickbar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
                <StatItem label="Total Captures" value={pagination.total} icon={<Database className="w-4 h-4" />} color="blue" />
                <StatItem label="Active Page" value={`${page} / ${pagination.totalPages}`} icon={<Activity className="w-4 h-4" />} color="emerald" />
                <StatItem label="Entities / Page" value={limit} icon={<Filter className="w-4 h-4" />} color="amber" />
                <StatItem label="System Status" value="Online" icon={<ShieldCheck className="w-4 h-4" />} color="indigo" />
            </div>

            {/* Main Table Workspace */}
            <div className="flex-1 bg-black border border-white/10 rounded-[2rem] overflow-hidden flex flex-col min-h-0 shadow-2xl relative">
                {/* Analysis Grid Decoration */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-8 py-5 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-white/[0.02] z-10">
                    <div className="col-span-1 italic">Index</div>
                    <div className="col-span-4 lg:col-span-3">Identity Signature</div>
                    <div className="col-span-3 lg:col-span-2 text-center">Inference Conf</div>
                    <div className="col-span-3 lg:col-span-2">Differentiated Sentiment</div>
                    <div className="col-span-1 lg:col-span-3">Capture Temporal</div>
                    <div className="col-span-1 text-right">Ops</div>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
                    <AnimatePresence mode="wait">
                        {isLoading || isFetching ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="h-full flex items-center justify-center flex-col gap-4"
                            >
                                <RefreshCcw className="w-8 h-8 text-blue-500 animate-spin" />
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Negotiating Database Uplink...</span>
                            </motion.div>
                        ) : history.length > 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="divide-y divide-white/[0.03]"
                            >
                                {history.map((item, i) => (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                        key={item._id}
                                        className="grid grid-cols-12 gap-4 px-8 py-4 items-center hover:bg-white/[0.02] transition-all group border-l-2 border-transparent hover:border-blue-500"
                                    >
                                        <div className="col-span-1 font-mono text-[10px] text-zinc-700">#{item._id.slice(-4)}</div>
                                        <div className="col-span-4 lg:col-span-3 flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center border border-white/5 relative overflow-hidden group-hover:border-blue-500/30 transition-colors">
                                                <User className="w-5 h-5 text-zinc-600" />
                                                <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-white uppercase tracking-tight leading-none mb-1">{item.name}</span>
                                                <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest line-clamp-1">{item._id}</span>
                                            </div>
                                        </div>
                                        <div className="col-span-3 lg:col-span-2 flex flex-col items-center">
                                            <div className="text-sm font-mono font-black text-blue-500 mb-2">{Math.round(item.confidence * 100)}%</div>
                                            <div className="w-20 h-1 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${item.confidence * 100}%` }}
                                                    className="h-full bg-blue-600 rounded-full"
                                                />
                                            </div>
                                        </div>
                                        <div className="col-span-3 lg:col-span-2">
                                            <Badge variant="outline" className="bg-white/[0.02] border-white/10 text-zinc-400 font-black text-[9px] px-3 py-1 flex items-center gap-2 w-max group-hover:border-blue-500/40 group-hover:text-blue-400 transition-all">
                                                <Heart className={`w-3 h-3 ${item.dominantEmotion === 'Happy' ? 'text-emerald-500' : 'text-zinc-500'}`} />
                                                {item.dominantEmotion}
                                            </Badge>
                                        </div>
                                        <div className="col-span-1 lg:col-span-3 flex flex-col gap-1 text-zinc-500 group-hover:text-zinc-300 transition-colors">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-3 h-3 text-blue-500/50" />
                                                <span className="text-[10px] font-mono font-bold tracking-tight">
                                                    {new Date(item.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="text-[9px] font-medium text-zinc-700 ml-5 uppercase">
                                                at {new Date(item.createdAt).toLocaleTimeString()}
                                            </div>
                                        </div>
                                        <div className="col-span-1 text-right">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-zinc-600 hover:text-white hover:bg-zinc-800">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="h-full flex flex-col items-center justify-center text-zinc-600 gap-6"
                            >
                                <div className="w-20 h-20 rounded-[2rem] bg-white/[0.02] border border-white/5 flex items-center justify-center">
                                    <History className="w-10 h-10 opacity-20" />
                                </div>
                                <div className="text-center group">
                                    <span className="text-xs font-black uppercase tracking-[0.4em] opacity-30 group-hover:opacity-50 transition-opacity block mb-2">Neural Static In-Range</span>
                                    <span className="text-[9px] font-bold text-zinc-800 uppercase tracking-widest">No historical logs matched current parameters</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Modern Pagination Footer */}
                <div className="px-8 py-6 border-t border-white/10 bg-white/[0.02] z-10 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Entities per Uplink:</span>
                            <div className="flex bg-black border border-white/5 rounded-lg p-1">
                                {[10, 20, 50].map(val => (
                                    <button
                                        key={val}
                                        onClick={() => {
                                            setLimit(val);
                                            setPage(1);
                                        }}
                                        className={`px-2 py-1 rounded text-[10px] font-black transition-all ${limit === val ? 'bg-blue-600 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}
                                    >
                                        {val}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="h-4 w-px bg-white/5 hidden sm:block" />
                        <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest hidden sm:block">
                            Showing <span className="text-white">{Math.min((page - 1) * limit + 1, pagination.total)}</span> - <span className="text-white">{Math.min(page * limit, pagination.total)}</span> of <span className="text-white">{pagination.total}</span> Results
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handlePrevPage}
                            disabled={page === 1}
                            className="w-10 h-10 rounded-xl bg-black border-white/5 text-zinc-400 disabled:opacity-20 hover:bg-zinc-900 transition-all"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <div className="px-5 h-10 flex items-center justify-center bg-black border border-white/5 rounded-xl font-mono text-[10px] font-black text-blue-500 tracking-tighter">
                            PAGE {page} <span className="text-zinc-800 mx-2">/</span> {pagination.totalPages}
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleNextPage}
                            disabled={page === pagination.totalPages}
                            className="w-10 h-10 rounded-xl bg-black border-white/5 text-zinc-400 disabled:opacity-20 hover:bg-zinc-900 transition-all"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatItem = ({ label, value, icon, color }) => {
    const colorMap = {
        blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
        emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        indigo: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    };

    return (
        <div className="p-5 bg-zinc-900/40 border border-white/[0.03] rounded-3xl hover:border-white/10 transition-all group overflow-hidden relative">
            <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label}</div>
                <div className={`p-2 rounded-xl border ${colorMap[color]}`}>
                    {icon}
                </div>
            </div>
            <div className="text-2xl font-black text-white tracking-tighter relative z-10">{value}</div>

            <div className="absolute -bottom-6 -right-6 w-16 h-16 rounded-full bg-white opacity-[0.02] blur-xl group-hover:opacity-[0.05] transition-opacity" />
        </div>
    );
};

export default HistoryView;
