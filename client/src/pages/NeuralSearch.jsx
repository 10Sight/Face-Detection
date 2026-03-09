import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Upload, Fingerprint,
    History, MapPin, ShieldAlert,
    ChevronRight, Info, Filter, X,
    AlertCircle, RotateCcw
} from 'lucide-react';
import { useForensicSearchMutation } from '../store/api/analyticsApi';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';

/**
 * NeuralSignature Component V3: 
 * Ultra-high fidelity "Generative Reconstruction". 
 * Simulates the 512-dim vector acting as a blueprint to re-assemble pixels into a face.
 */
const NeuralSignature = ({ embedding, image, similarity }) => {
    const [status, setStatus] = useState('encoding'); // encoding -> assembling -> finalizing -> resolved
    const containerRef = useRef(null);

    useEffect(() => {
        const t1 = setTimeout(() => setStatus('assembling'), 600);
        const t2 = setTimeout(() => setStatus('finalizing'), 2400);
        const t3 = setTimeout(() => setStatus('resolved'), 3200);
        return () => [t1, t2, t3].forEach(clearTimeout);
    }, []);

    // Create 512 "Neural Pixels"
    const neuralPixels = useMemo(() => {
        const vector = embedding && embedding.length >= 512 ? embedding : Array(512).fill(0).map(() => Math.random() * 2 - 1);

        return vector.map((val, i) => {
            // Chaotic source position (data stream)
            const sourceX = Math.random() * 100;
            const sourceY = Math.random() * 100;

            // Structured target position (Identity Outline)
            const angle = (i / 512) * Math.PI * 2;
            const dist = 15 + Math.random() * 30; // Fill the face area

            // Adjust coordinates to form a face-like oval
            const tx = 50 + (dist * Math.cos(angle) * 0.8);
            const ty = 45 + (dist * Math.sin(angle) * 1.1);

            return {
                id: i,
                val,
                sourceX,
                sourceY,
                tx,
                ty,
                delay: Math.random() * 0.8,
                color: val > 0 ? '#4f46e5' : '#6366f1'
            };
        });
    }, [embedding]);

    return (
        <div ref={containerRef} className="relative w-full aspect-[4/3] bg-white rounded-2xl border border-slate-200/60 overflow-hidden group shadow-lg">
            {/* Neural Background Matrix */}
            <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#4f46e5_1px,transparent_1px)] bg-[size:20px_20px]" />

            {/* 1. The Neural Core (Encoding Phase) */}
            <AnimatePresence>
                {status === 'encoding' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.5 }}
                        className="absolute inset-0 flex items-center justify-center z-40 bg-white/80 backdrop-blur-md"
                    >
                        <div className="flex flex-col items-center gap-6">
                            <div className="w-20 h-20 rounded-full border-2 border-indigo-500/30 flex items-center justify-center animate-pulse">
                                <Fingerprint className="w-10 h-10 text-indigo-500" />
                            </div>
                            <div className="text-center">
                                <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.5em] mb-1">Vector Inversion</div>
                                <div className="text-[8px] text-slate-400 font-bold uppercase">Synthesizing {embedding?.length || 512} Data Nodes</div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 2. Particle Assembly (Assembling Phase) */}
            <div className="absolute inset-0 z-10 pointer-events-none">
                {neuralPixels.map((p, i) => (
                    <motion.div
                        key={p.id}
                        initial={{ left: `${p.sourceX}%`, top: `${p.sourceY}%`, opacity: 0 }}
                        animate={{
                            left: status === 'encoding' ? `${p.sourceX}%` : `${p.tx}%`,
                            top: status === 'encoding' ? `${p.sourceY}%` : `${p.ty}%`,
                            opacity: status === 'resolved' ? 0 : [0, 1, 1],
                            scale: status === 'assembling' ? [1, 1.5, 1] : 1
                        }}
                        transition={{
                            duration: 1.8,
                            ease: "circOut",
                            delay: p.delay
                        }}
                        className="absolute w-1 h-1 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.3)]"
                        style={{ backgroundColor: p.color }}
                    />
                ))}
            </div>

            {/* 3. The Generative Resolve (Finalizing/Resolved Phase) */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{
                    opacity: (status === 'finalizing' || status === 'resolved') ? 1 : 0,
                    filter: status === 'finalizing' ? 'blur(10px) brightness(1.2)' : 'blur(0px) brightness(1)'
                }}
                transition={{ duration: 1.5 }}
                className="absolute inset-0 z-20"
            >
                {/* Reconstruction Glitch Text */}
                {status === 'finalizing' && (
                    <div className="absolute inset-0 flex items-center justify-center z-50 text-slate-900 font-bold italic text-xl tracking-[0.2em] mix-blend-overlay">
                        RECONSTRUCTING...
                    </div>
                )}

                <img
                    src={image || `https://api.dicebear.com/7.x/identicon/svg?seed=${embedding?.[0]}`}
                    className="w-full h-full object-cover"
                    alt="Neural Reconstruction"
                />

                {/* Cyber HUD Overlays */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-white/90 to-transparent p-6 flex flex-col justify-end gap-2">
                    <div className="flex justify-between items-end">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Vector Match Validated</span>
                            </div>
                            <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 font-bold text-[9px] tracking-widest uppercase rounded-lg">
                                Neural ID: {embedding?.[0]?.toString().slice(-8).toUpperCase() || 'X89-A2'}
                            </Badge>
                        </div>
                        <div className="text-right">
                            <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Search Accuracy</div>
                            <div className="text-3xl font-bold text-slate-900 tracking-tighter italic leading-none">{similarity}%</div>
                        </div>
                    </div>
                </div>

                {/* Horizontal Scanline */}
                <motion.div
                    animate={{ top: ['0%', '100%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 w-full h-[1px] bg-indigo-500/20 z-30 shadow-[0_0_10px_rgba(99,102,241,0.2)]"
                />
            </motion.div>

            {/* Status Indicator */}
            <div className="absolute top-4 right-4 z-50">
                <div className="flex items-center gap-2 bg-white/40 backdrop-blur-md px-3 py-1 rounded-full border border-slate-200/60 shadow-sm">
                    <div className={`w-1.5 h-1.5 rounded-full ${status === 'resolved' ? 'bg-emerald-500' : 'bg-indigo-500 animate-pulse'}`} />
                    <span className="text-[8px] font-bold text-slate-700 uppercase tracking-widest">
                        {status.toUpperCase()}
                    </span>
                </div>
            </div>
        </div>
    );
};

const NeuralSearch = () => {
    const [forensicSearch, { isLoading, data, error, reset }] = useForensicSearchMutation();
    const [selectedImage, setSelectedImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            reset();
            setSelectedImage(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleClear = () => {
        setSelectedImage(null);
        setPreviewUrl(null);
        reset();
    };

    const handleSearch = async () => {
        if (!selectedImage) return;
        const formData = new FormData();
        formData.append('file', selectedImage);
        try {
            await forensicSearch(formData).unwrap();
        } catch (err) {
            console.error("Forensic search error:", err);
        }
    };

    const matches = data?.data || [];

    return (
        <div className="page-shell flex flex-col gap-6 lg:gap-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight uppercase mb-2">
                        Neural <span className="text-indigo-600">Forensics</span>
                    </h1>
                    <div className="text-slate-500 font-semibold tracking-wide uppercase text-xs flex items-center gap-2">
                        <Fingerprint className="w-3.5 h-3.5 text-indigo-500" />
                        Forensic Sighting Search & Identity Fingerprinting
                    </div>
                </div>
                <div className="flex gap-2">
                    <Badge variant="secondary" className="bg-white border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-widest py-2 px-4 rounded-xl shadow-sm">
                        Vault: {matches.length > 0 ? 'Active Results' : 'System Ready'}
                    </Badge>
                </div>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
                {/* Search Panel */}
                <Card className="xl:col-span-4 bg-white border-slate-200/60 rounded-2xl p-6 lg:p-7 flex flex-col gap-6 lg:gap-7 shadow-xl backdrop-blur-3xl overflow-hidden relative">
                    <div className="relative z-10 flex flex-col gap-6">
                        <div>
                            <div className="text-xl font-bold text-slate-900 tracking-tight">Suspect Interface</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Upload target for cross-database audit</div>
                        </div>

                        <div
                            className={`relative aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-4 cursor-pointer transition-all overflow-hidden ${previewUrl ? 'border-indigo-500/30 p-2' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'
                                }`}
                        >
                            {previewUrl ? (
                                <>
                                    <img src={previewUrl} className="w-full h-full object-cover rounded-xl" alt="Suspect" />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleClear(); }}
                                        className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-md rounded-xl border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-500 transition-all z-20 shadow-sm"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </>
                            ) : (
                                <div onClick={() => document.getElementById('suspect-upload').click()} className="flex flex-col items-center gap-4 w-full h-full justify-center">
                                    <div className="w-16 h-16 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                                        <Upload className="w-8 h-8" />
                                    </div>
                                    <div className="text-center">
                                        <div className="text-sm font-bold text-slate-900 uppercase">Drop Suspect Image</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">JPG, PNG up to 5MB</div>
                                    </div>
                                </div>
                            )}
                            <input type="file" id="suspect-upload" hidden onChange={handleImageChange} accept="image/*" />
                        </div>

                        {error && (
                            <Alert variant="destructive" className="bg-red-50 border-red-100 text-red-600 rounded-2xl animate-in fade-in slide-in-from-top-2">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle className="text-xs font-bold uppercase tracking-widest">Neural Error</AlertTitle>
                                <AlertDescription className="text-[10px] font-semibold uppercase tracking-tight">
                                    {error.data?.message || "Detection pipeline failed. Ensure face is clear."}
                                </AlertDescription>
                            </Alert>
                        )}

                        <Button
                            disabled={!selectedImage || isLoading}
                            onClick={handleSearch}
                            className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-widest text-xs shadow-lg shadow-indigo-500/20"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-3">
                                    <RotateCcw className="w-4 h-4 animate-spin" />
                                    Inverting Neural Patterns...
                                </div>
                            ) : "Execute Forensic Search"}
                        </Button>
                    </div>

                    {/* Aesthetic background */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" />
                </Card>

                {/* Results Panel */}
                <Card className="xl:col-span-8 bg-white/50 border-slate-200/60 rounded-2xl flex flex-col overflow-hidden shadow-xl">
                    <div className="px-6 lg:px-10 py-6 lg:py-8 border-b border-slate-100 bg-white/80 backdrop-blur-sm flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                                <History className="w-5 h-5 text-indigo-500" />
                            </div>
                            <div>
                                <div className="text-lg font-bold text-slate-900 tracking-tight">Intelligence Vault</div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                    {matches.length === 0 ? "Identify target to extract historical sightings" : `Found ${matches.length} matching biometric fingerprints`}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" className="h-10 px-4 rounded-xl text-slate-500 hover:text-slate-900 border border-slate-200 uppercase text-[10px] font-bold tracking-widest shadow-sm bg-white">
                                <Filter className="w-4 h-4 mr-2" />
                                Sort
                            </Button>
                        </div>
                    </div>

                    <ScrollArea className="flex-1 p-6 lg:p-10">
                        {matches.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 py-32 gap-6">
                                <div className="p-8 rounded-full bg-slate-50 border border-slate-100">
                                    <Search className="w-16 h-16 opacity-40" />
                                </div>
                                <div className="text-center">
                                    <div className="text-sm font-bold uppercase tracking-widest text-slate-400">Awaiting Target Selection</div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-2">Neural engine in standby mode</div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 pb-8">
                                {matches.map((match, idx) => (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        key={match._id}
                                        className="flex flex-col gap-6"
                                    >
                                        <NeuralSignature
                                            embedding={match.embedding || []}
                                            image={match.imageSnapshot}
                                            similarity={(match.similarity * 100).toFixed(1)}
                                        />

                                        <div className="px-2">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <div className="text-3xl font-bold text-slate-900 tracking-tight leading-none mb-2 italic">
                                                        {match.name === 'Guest' ? <span className="text-slate-400">Unidentified Guest</span> : match.name}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {match.demographics?.gender && (
                                                            <Badge variant="outline" className="text-[8px] font-bold uppercase tracking-widest border-slate-200 text-slate-500 bg-white">
                                                                {match.demographics.gender}
                                                            </Badge>
                                                        )}
                                                        {match.demographics?.age && (
                                                            <Badge variant="outline" className="text-[8px] font-bold uppercase tracking-widest border-slate-200 text-slate-500 bg-white">
                                                                AGE {match.demographics.age}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <div className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mb-1">Emotion State</div>
                                                    <Badge className="bg-indigo-50 text-indigo-600 border-none font-bold text-[10px] tracking-widest uppercase py-1 px-3 rounded-lg">
                                                        {match.dominantEmotion || "Neutral"}
                                                    </Badge>
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-slate-400">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-3.5 h-3.5 text-indigo-400/50" />
                                                    <span className="text-[10px] font-bold uppercase tracking-tight">Main Security Sector</span>
                                                </div>
                                                <div className="text-[10px] font-bold uppercase tabular-nums">
                                                    {new Date(match.createdAt).toLocaleDateString()} @ {new Date(match.createdAt).toLocaleTimeString()}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </Card>
            </div>
        </div>
    );
};

export default NeuralSearch;
