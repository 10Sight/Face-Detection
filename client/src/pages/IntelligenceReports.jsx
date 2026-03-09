import React, { useState } from 'react';
import {
    FileText, Download, Calendar,
    Table as TableIcon, PieChart as PieIcon,
    FileSpreadsheet, FileJson, ChevronRight,
    Search, Filter, Activity, ChevronLeft
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '../components/ui/table';
import { useGetReportQuery } from '../store/api/analyticsApi';

const IntelligenceReports = () => {
    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [page, setPage] = useState(1);
    const limit = 10;

    const { data, isLoading, isFetching } = useGetReportQuery({
        ...dateRange,
        page,
        limit
    });

    const reportData = data?.data || { logs: [], summary: [], pagination: { total: 0, totalPages: 0 } };
    const pagination = reportData.pagination;

    const handleExport = (format) => {
        alert(`Initializing ${format.toUpperCase()} Intelligence Export for ${dateRange.start} to ${dateRange.end}`);
    };

    const handleDateChange = (type, value) => {
        setDateRange(prev => ({ ...prev, [type]: value }));
        setPage(1); // Reset to first page on filter change
    };

    return (
        <div className="page-shell flex flex-col gap-6 lg:gap-8 overflow-hidden h-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight uppercase mb-2">
                        Intelligence <span className="text-indigo-600">Reports</span>
                    </h1>
                    <div className="text-slate-500 font-semibold tracking-wide uppercase text-xs flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-indigo-500" />
                        Enterprise Biometric Data Extraction & Auditing
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 sm:gap-4">
                    <Button
                        onClick={() => handleExport('csv')}
                        variant="outline"
                        className="rounded-xl h-12 px-6 font-bold uppercase tracking-widest text-[10px] bg-white border-slate-200 hover:bg-slate-50 text-slate-600 shadow-sm"
                    >
                        <FileSpreadsheet className="w-4.5 h-4.5 mr-2 text-emerald-500" />
                        Export CSV
                    </Button>
                    <Button
                        onClick={() => handleExport('pdf')}
                        className="rounded-xl h-12 px-6 font-bold uppercase tracking-widest text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
                    >
                        <Download className="w-4.5 h-4.5 mr-2" />
                        Generate PDF
                    </Button>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 min-h-0 overflow-hidden">
                {/* Configuration Panel */}
                <Card className="xl:col-span-3 bg-white border-slate-200/60 rounded-2xl p-6 lg:p-7 flex flex-col gap-7 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                    <div className="flex flex-col gap-8 relative z-10">
                        <div>
                            <div className="text-lg font-bold text-slate-900 tracking-tight">Parameters</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Configure audit window</div>
                        </div>

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Range Start</label>
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-inner">
                                    <Calendar className="w-4.5 h-4.5 text-slate-300" />
                                    <input
                                        type="date"
                                        value={dateRange.start}
                                        onChange={(e) => handleDateChange('start', e.target.value)}
                                        className="bg-transparent border-none outline-none text-slate-900 font-bold text-xs w-full uppercase"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Range End</label>
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-inner">
                                    <Calendar className="w-4.5 h-4.5 text-slate-300" />
                                    <input
                                        type="date"
                                        value={dateRange.end}
                                        onChange={(e) => handleDateChange('end', e.target.value)}
                                        className="bg-transparent border-none outline-none text-slate-900 font-bold text-xs w-full uppercase"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-100">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-5">Quick Stats</div>
                            <div className="space-y-3">
                                {[
                                    { label: "Total Logs", value: pagination.total, color: "text-indigo-600", bg: "bg-indigo-50" },
                                    { label: "High Confidence", value: reportData.logs.filter(l => l.confidence > 0.9).length, color: "text-emerald-600", bg: "bg-emerald-50" },
                                    { label: "Unknown Entities", value: reportData.summary.find(s => s._id === "Guest")?.count || 0, color: "text-amber-600", bg: "bg-amber-50" }
                                ].map((s, i) => (
                                    <div key={i} className="flex justify-between items-center p-3.5 rounded-2xl border border-slate-50">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</span>
                                        </div>
                                        <span className={`text-xs font-bold ${s.color} ${s.bg} px-2.5 py-1 rounded-lg`}>{s.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Report Preview Panel */}
                <Card className="xl:col-span-9 bg-white border-slate-200/60 rounded-2xl flex flex-col overflow-hidden shadow-xl">
                    <div className="px-6 lg:px-8 py-5 lg:py-6 border-b border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shadow-sm">
                                <TableIcon className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <div className="text-lg font-bold text-slate-900 tracking-tight uppercase leading-none mb-1">Intelligence Preview</div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                    {isLoading ? "Synchronizing logs..." : `Showing ${reportData.logs.length} of ${pagination.total} signatures`}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || isLoading}
                                className="w-9 h-9 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </Button>
                            <span className="text-[10px] font-bold text-slate-900 px-3 min-w-[60px] text-center tracking-widest border-x border-slate-100 uppercase">
                                {page} <span className="text-slate-300 mx-1">/</span> {pagination.totalPages || 1}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                disabled={page === pagination.totalPages || isLoading}
                                className="w-9 h-9 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>

                    <ScrollArea className="flex-1">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow className="border-slate-100 hover:bg-transparent">
                                    <TableHead className="px-10 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entity Signature</TableHead>
                                    <TableHead className="px-10 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Confidence Level</TableHead>
                                    <TableHead className="px-10 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Differentiated Sentiment</TableHead>
                                    <TableHead className="px-10 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Deployment Temporal</TableHead>
                                    <TableHead className="px-10 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Ops</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading || isFetching ? (
                                    <TableRow><TableCell colSpan={5} className="text-center py-32 text-slate-300 tracking-[0.3em] font-bold uppercase text-xs animate-pulse">Compiling Intelligence Matrix...</TableCell></TableRow>
                                ) : reportData.logs.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="text-center py-32 text-slate-400 font-bold uppercase text-xs tracking-widest">No biometric records in range</TableCell></TableRow>
                                ) : reportData.logs.map((log) => (
                                    <TableRow key={log._id} className="border-slate-100 hover:bg-slate-50/50 transition-all group">
                                        <TableCell className="px-10 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-2 h-2 rounded-full ${log.name === 'Guest' ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.5)]'}`} />
                                                <div className="text-sm font-bold text-slate-900 tracking-tight uppercase group-hover:text-indigo-600 transition-colors">{log.name}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-10 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${log.confidence * 100}%` }}
                                                        className="h-full bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(79,70,229,0.2)]"
                                                    />
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-500 tabular-nums">{(log.confidence * 100).toFixed(0)}%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-10 py-6">
                                            <Badge variant="outline" className={`border-slate-100 text-[9px] font-bold uppercase tracking-widest rounded-lg px-2.5 py-1 ${log.dominantEmotion === 'Happy' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                                {log.dominantEmotion}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-10 py-6 text-[10px] font-bold text-slate-500 uppercase tracking-tighter tabular-nums">
                                            {new Date(log.createdAt).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="px-10 py-6 text-right">
                                            <Button variant="ghost" size="icon" className="w-9 h-9 rounded-xl text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
                                                <ChevronRight className="w-5 h-5" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </Card>
            </div>
        </div>
    );
};

export default IntelligenceReports;
