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
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 shrink-0">
                <div className="min-w-0">
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight uppercase mb-2">
                        Operational <span className="text-indigo-600">Log</span>
                    </h1>
                    <div className="text-slate-500 font-semibold tracking-wide uppercase text-xs flex items-center gap-2 flex-wrap">
                        <History className="w-3.5 h-3.5 text-indigo-500" />
                        Neural Sighting Archive & Access Audit
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 sm:gap-4 self-start xl:self-auto">
                    <div className="flex items-center gap-3 px-4 py-2 bg-white border border-slate-200 rounded-xl min-w-[240px] shadow-sm">
                        <Search className="w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            className="bg-transparent text-[10px] font-bold uppercase tracking-widest outline-none w-full text-slate-900 placeholder:text-slate-300"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => refetch()}
                            className={`rounded-xl h-11 px-4 font-bold uppercase tracking-widest text-[10px] border-slate-200 bg-white hover:bg-slate-50 transition-all shadow-sm ${isFetching ? 'text-indigo-600' : 'text-slate-500'}`}
                        >
                            <RefreshCcw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                            Sync
                        </Button>
                        <Button
                            variant="secondary"
                            className="rounded-xl h-11 px-4 font-bold uppercase tracking-widest text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 border-none shadow-sm"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Export
                        </Button>
                    </div>
                </div>
            </div>

            {/* Stats Quickbar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
                <StatItem label="Total Captures" value={pagination.total} icon={<Database className="w-4 h-4" />} color="blue" />
                <StatItem label="Active Page" value={`${page} / ${pagination.totalPages}`} icon={<Activity className="w-4 h-4" />} color="emerald" />
                <StatItem label="Entities / Page" value={limit} icon={<Filter className="w-4 h-4" />} color="amber" />
                <StatItem label="System Status" value="Online" icon={<ShieldCheck className="w-4 h-4" />} color="indigo" />
            </div>

            {/* Main Table Workspace */}
            <div className="flex-1 bg-white border border-slate-200/60 rounded-2xl overflow-hidden flex flex-col min-h-0 shadow-lg relative">
                {/* Analysis Grid Decoration */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50/50 z-10">
                    <div className="col-span-1 italic">Index</div>
                    <div className="col-span-4 lg:col-span-3">Identity Signature</div>
                    <div className="col-span-3 lg:col-span-2 text-center">Inference Conf</div>
                    <div className="col-span-3 lg:col-span-2">Sentiment</div>
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
                                <RefreshCcw className="w-8 h-8 text-indigo-500 animate-spin" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Negotiating Database Uplink...</span>
                            </motion.div>
                        ) : history.length > 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="divide-y divide-slate-100"
                            >
                                {history.map((item, i) => (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                        key={item._id}
                                        className="grid grid-cols-12 gap-4 px-8 py-4 items-center hover:bg-slate-50/50 transition-all group border-l-4 border-transparent hover:border-indigo-500"
                                    >
                                        <div className="col-span-1 font-mono text-[10px] text-slate-300">#{item._id.slice(-4)}</div>
                                        <div className="col-span-4 lg:col-span-3 flex items-center gap-4">
                                            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 relative overflow-hidden group-hover:border-indigo-500/30 transition-colors shadow-sm">
                                                <User className="w-5 h-5 text-slate-400" />
                                                <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900 tracking-tight leading-none mb-1">{item.name}</span>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest line-clamp-1">UUID: {item._id}</span>
                                            </div>
                                        </div>
                                        <div className="col-span-3 lg:col-span-2 flex flex-col items-center">
                                            <div className="text-sm font-mono font-bold text-indigo-600 mb-2 tabular-nums">{Math.round(item.confidence * 100)}%</div>
                                            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${item.confidence * 100}%` }}
                                                    className="h-full bg-indigo-500 rounded-full"
                                                />
                                            </div>
                                        </div>
                                        <div className="col-span-3 lg:col-span-2">
                                            <Badge variant="outline" className="bg-white border-slate-200 text-slate-500 font-bold text-[9px] px-3 py-1 flex items-center gap-2 w-max group-hover:border-indigo-500/40 group-hover:text-indigo-600 transition-all rounded-lg uppercase tracking-widest shadow-sm">
                                                <Heart className={`w-3 h-3 ${item.dominantEmotion === 'Happy' ? 'text-emerald-500' : 'text-slate-400'}`} />
                                                {item.dominantEmotion}
                                            </Badge>
                                        </div>
                                        <div className="col-span-1 lg:col-span-3 flex flex-col gap-1 text-slate-400 group-hover:text-slate-600 transition-colors">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-3.5 h-3.5 text-indigo-400/50" />
                                                <span className="text-[10px] font-mono font-bold tracking-tight text-slate-600">
                                                    {new Date(item.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="text-[9px] font-semibold text-slate-400 ml-5 uppercase tracking-wide">
                                                at {new Date(item.createdAt).toLocaleTimeString()}
                                            </div>
                                        </div>
                                        <div className="col-span-1 text-right">
                                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-300 hover:text-slate-900 hover:bg-slate-100 transition-all">
                                                <MoreHorizontal className="w-4.5 h-4.5" />
                                            </Button>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="h-full flex flex-col items-center justify-center text-slate-300 gap-5 py-16"
                            >
                                <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-inner">
                                    <History className="w-8 h-8 opacity-30" />
                                </div>
                                <div className="text-center group">
                                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 block mb-1.5">Neural Static In-Range</span>
                                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">No historical logs matched current parameters</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Modern Pagination Footer */}
                <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 z-10 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entities / Uplink:</span>
                            <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                                {[10, 20, 50].map(val => (
                                    <button
                                        key={val}
                                        onClick={() => {
                                            setLimit(val);
                                            setPage(1);
                                        }}
                                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${limit === val ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        {val}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="h-5 w-px bg-slate-200 hidden sm:block" />
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">
                            Showing <span className="text-slate-900">{Math.min((page - 1) * limit + 1, pagination.total)}</span> - <span className="text-slate-900">{Math.min(page * limit, pagination.total)}</span> of <span className="text-slate-900">{pagination.total}</span> Logs
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handlePrevPage}
                            disabled={page === 1}
                            className="w-11 h-11 rounded-xl bg-white border-slate-200 text-slate-400 disabled:opacity-20 hover:bg-slate-50 transition-all shadow-sm"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <div className="px-6 h-11 flex items-center justify-center bg-white border border-slate-200 rounded-xl font-bold text-[10px] text-indigo-600 tracking-widest shadow-sm">
                            PAGE {page} <span className="text-slate-200 mx-3">|</span> {pagination.totalPages}
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleNextPage}
                            disabled={page === pagination.totalPages}
                            className="w-11 h-11 rounded-xl bg-white border-slate-200 text-slate-400 disabled:opacity-20 hover:bg-slate-50 transition-all shadow-sm"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatItem = ({ label, value, icon, color }) => {
    const colorMap = {
        blue: 'text-indigo-600 bg-indigo-50 border-indigo-100',
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        amber: 'text-amber-600 bg-amber-50 border-amber-100',
        indigo: 'text-purple-600 bg-purple-50 border-purple-100',
    };

    return (
        <div className="p-5 bg-white border border-slate-200/60 rounded-2xl hover:border-indigo-200 transition-all group overflow-hidden relative shadow-sm">
            <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</div>
                <div className={`p-2 rounded-xl border ${colorMap[color]}`}>
                    {icon}
                </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight relative z-10 leading-none">{value}</div>

            <div className="absolute -bottom-6 -right-6 w-16 h-16 rounded-full bg-slate-50 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity" />
        </div>
    );
};

export default HistoryView;
