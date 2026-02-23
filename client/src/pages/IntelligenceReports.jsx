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
        <div className="page-shell flex flex-col gap-6 lg:gap-8 overflow-hidden">
            {/* Header */}
            <div className="flex flex-col xl:flex-row xl:justify-between xl:items-end gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase mb-2">
                        Intelligence <span className="text-blue-500">Reports</span>
                    </h1>
                    <div className="text-zinc-500 font-medium tracking-widest uppercase text-xs flex items-center gap-2">
                        <FileText className="w-3 h-3 text-blue-500" />
                        Enterprise Biometric Data Extraction & Auditing
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 sm:gap-4">
                    <Button
                        onClick={() => handleExport('csv')}
                        variant="secondary"
                        className="rounded-xl h-12 px-6 font-black uppercase tracking-widest text-[10px] bg-white/[0.03] border-white/10 hover:bg-white/[0.08]"
                    >
                        <FileSpreadsheet className="w-4 h-4 mr-2 text-green-500" />
                        Export CSV
                    </Button>
                    <Button
                        onClick={() => handleExport('pdf')}
                        className="rounded-xl h-12 px-6 font-black uppercase tracking-widest text-[10px] bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-900/20"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Generate PDF
                    </Button>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 min-h-0">
                {/* Configuration Panel */}
                <Card className="xl:col-span-3 bg-white/[0.02] border-white/10 rounded-[2.5rem] p-6 lg:p-8 flex flex-col gap-6 lg:gap-8 shadow-2xl backdrop-blur-3xl">
                    <div className="flex flex-col gap-6">
                        <div>
                            <div className="text-lg font-bold text-white uppercase tracking-tight">Parameters</div>
                            <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-1">Configure audit window</div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Range Start</label>
                                <div className="bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3">
                                    <Calendar className="w-4 h-4 text-zinc-500" />
                                    <input
                                        type="date"
                                        value={dateRange.start}
                                        onChange={(e) => handleDateChange('start', e.target.value)}
                                        className="bg-transparent border-none outline-none text-white text-xs w-full uppercase"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Range End</label>
                                <div className="bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3">
                                    <Calendar className="w-4 h-4 text-zinc-500" />
                                    <input
                                        type="date"
                                        value={dateRange.end}
                                        onChange={(e) => handleDateChange('end', e.target.value)}
                                        className="bg-transparent border-none outline-none text-white text-xs w-full uppercase"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/10">
                            <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Quick Stats</div>
                            <div className="space-y-3">
                                {[
                                    { label: "Total Logs", value: pagination.total, color: "text-blue-500" },
                                    { label: "High Confidence", value: reportData.logs.filter(l => l.confidence > 0.9).length, color: "text-green-500" },
                                    { label: "Unknown Entities", value: reportData.summary.find(s => s._id === "Guest")?.count || 0, color: "text-amber-500" }
                                ].map((s, i) => (
                                    <div key={i} className="flex justify-between items-center bg-white/[0.01] p-3 rounded-xl border border-white/[0.03]">
                                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{s.label}</span>
                                        <span className={`text-xs font-black ${s.color}`}>{s.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Report Preview Panel */}
                <Card className="xl:col-span-9 bg-white/[0.01] border-white/10 rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl">
                    <div className="px-6 lg:px-10 py-6 lg:py-8 border-b border-white/10 bg-white/[0.02] flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                <TableIcon className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <div className="text-lg font-bold text-white uppercase">Intelligence Preview</div>
                                <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">
                                    {isLoading ? "Synchronizing logs..." : `Showing ${reportData.logs.length} of ${pagination.total} signatures`}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 bg-black/20 p-1.5 rounded-2xl border border-white/5">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || isLoading}
                                className="w-8 h-8 rounded-xl text-zinc-500 hover:text-white"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="text-[10px] font-black text-white px-2">
                                {page} / {pagination.totalPages || 1}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                disabled={page === pagination.totalPages || isLoading}
                                className="w-8 h-8 rounded-xl text-zinc-500 hover:text-white"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <ScrollArea className="flex-1">
                        <Table>
                            <TableHeader className="bg-white/[0.02]">
                                <TableRow className="border-white/10 hover:bg-transparent">
                                    <TableHead className="px-10 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Entity Signature</TableHead>
                                    <TableHead className="px-10 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Confidence</TableHead>
                                    <TableHead className="px-10 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Sentiment</TableHead>
                                    <TableHead className="px-10 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Timestamp</TableHead>
                                    <TableHead className="px-10 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Reference</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading || isFetching ? (
                                    <TableRow><TableCell colSpan={5} className="text-center py-20 text-zinc-500 tracking-[0.3em] font-black uppercase text-xs animate-pulse italic">Compiling Intelligence Matrix...</TableCell></TableRow>
                                ) : reportData.logs.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="text-center py-20 text-zinc-500 font-bold uppercase text-xs">No records found for this period</TableCell></TableRow>
                                ) : reportData.logs.map((log) => (
                                    <TableRow key={log._id} className="border-white/[0.05] hover:bg-white/[0.02] transition-colors group">
                                        <TableCell className="px-10 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-1.5 h-1.5 rounded-full ${log.name === 'Guest' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                                                <div className="text-sm font-black text-white uppercase tracking-tight">{log.name}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-10 py-6">
                                            <div className="flex items-center gap-2">
                                                <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500" style={{ width: `${log.confidence * 100}%` }} />
                                                </div>
                                                <span className="text-[10px] font-black text-zinc-400">{(log.confidence * 100).toFixed(0)}%</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-10 py-6">
                                            <Badge variant="outline" className="border-white/10 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                                                {log.dominantEmotion}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-10 py-6 text-[10px] font-bold text-zinc-600 uppercase tabular-nums">
                                            {new Date(log.createdAt).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="px-10 py-6 text-right">
                                            <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-zinc-600 hover:text-white hover:bg-blue-600/20">
                                                <ChevronRight className="w-4 h-4" />
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
