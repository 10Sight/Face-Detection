import React, { useState, useEffect } from 'react';
import {
    LayoutGrid, Maximize2,
    Activity, Settings2,
    Camera, Radio, RefreshCcw, Dot,
    ChevronLeft, Sliders, Shield, Target,
    X, Loader2
} from 'lucide-react';
import FaceDetection from '../components/FaceDetection/FaceDetection';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "../components/ui/dialog";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
import { motion, AnimatePresence } from 'framer-motion';
import Peer from 'peerjs';
import { QRCodeSVG } from 'qrcode.react';

const ControlCenter = () => {
    const [gridLayout, setGridLayout] = useState('2x2'); // '2x2' or '3x3'
    const [focusedStream, setFocusedStream] = useState(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [selectedStream, setSelectedStream] = useState(null);
    const [activeStreams, setActiveStreams] = useState([1]);
    const [initializingStreams, setInitializingStreams] = useState(new Set());
    const [inferenceInterval, setInferenceInterval] = useState(500);

    // Uplink State
    const [isUplinkOpen, setIsUplinkOpen] = useState(false);
    const [uplinkId] = useState(`node-${Math.random().toString(36).substr(2, 6)}`);
    const [remoteStreams, setRemoteStreams] = useState({});
    const [isBluetoothScanning, setIsBluetoothScanning] = useState(false);

    useEffect(() => {
        const peer = new Peer(uplinkId);

        peer.on('call', (call) => {
            call.answer(); // Answer the call without a local stream
            call.on('stream', (remoteStream) => {
                setRemoteStreams(prev => ({
                    ...prev,
                    [call.peer]: remoteStream
                }));
                // Auto-activate a grid slot for the remote stream
                setActiveStreams(prev => {
                    const nextSlot = [2, 3, 4, 5, 6, 7, 8, 9].find(s => !prev.includes(s));
                    return nextSlot ? [...prev, nextSlot] : prev;
                });
            });
        });

        return () => peer.destroy();
    }, [uplinkId]);

    const handleBluetoothScan = async () => {
        setIsBluetoothScanning(true);
        try {
            // Web Bluetooth Discovery (Hardware Picker)
            await navigator.bluetooth.requestDevice({
                acceptAllDevices: true
            });
        } catch (err) {
            console.warn("Bluetooth discovery cancelled or not supported");
        } finally {
            setIsBluetoothScanning(false);
        }
    };

    const uplinkUrl = `${window.location.origin}/remote-uplink?id=${uplinkId}`;

    const streams = Array.from({ length: gridLayout === '2x2' ? 4 : 9 }, (_, i) => ({
        id: i + 1,
        name: `Sector ${String.fromCharCode(65 + i)}-${(i % 3) + 1}`,
        status: activeStreams.includes(i + 1) ? 'Active' : 'Standby'
    }));

    const handleInitialize = (id) => {
        setInitializingStreams(prev => new Set(prev).add(id));
        // Simulate connection delay
        setTimeout(() => {
            setActiveStreams(prev => [...prev, id]);
            setInitializingStreams(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }, 2000);
    };

    const handleOpenSettings = (stream) => {
        setSelectedStream(stream);
        setIsSettingsOpen(true);
    };

    const cardMinHeight = gridLayout === '2x2' ? 'min-h-[320px]' : 'min-h-[240px]';

    return (
        <div className="page-shell flex flex-col gap-6 lg:gap-8 overflow-hidden h-full">
            {/* Mission Control Header */}
            <div className="surface-card px-4 py-4 sm:px-6 sm:py-5 flex flex-col xl:flex-row xl:justify-between xl:items-end gap-4 shrink-0">
                <div className="min-w-0">
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase mb-2">
                        Mission <span className="text-blue-500">Control</span>
                    </h1>
                    <div className="text-zinc-500 font-medium tracking-widest uppercase text-xs flex items-center gap-2 flex-wrap">
                        <Radio className="w-3 h-3 text-red-500 animate-pulse" />
                        Live Multi-Stream Neural Surveillance Grid
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 sm:gap-4 bg-white/[0.03] p-1.5 border border-white/10 rounded-2xl backdrop-blur-3xl self-start xl:self-auto">
                    {focusedStream && (
                        <Button
                            variant="ghost"
                            onClick={() => setFocusedStream(null)}
                            className="rounded-xl h-9 sm:h-10 px-4 sm:px-6 font-bold uppercase tracking-widest text-[10px] text-blue-500"
                        >
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Back to Grid
                        </Button>
                    )}
                    <Button
                        variant={gridLayout === '2x2' && !focusedStream ? 'secondary' : 'ghost'}
                        onClick={() => {
                            setGridLayout('2x2');
                            setFocusedStream(null);
                        }}
                        className="rounded-xl h-9 sm:h-10 px-4 sm:px-6 font-bold uppercase tracking-widest text-[10px]"
                    >
                        <LayoutGrid className="w-4 h-4 mr-2" />
                        2x2 Grid
                    </Button>
                    <Button
                        variant={gridLayout === '3x3' && !focusedStream ? 'secondary' : 'ghost'}
                        onClick={() => {
                            setGridLayout('3x3');
                            setFocusedStream(null);
                        }}
                        className="rounded-xl h-9 sm:h-10 px-4 sm:px-6 font-bold uppercase tracking-widest text-[10px]"
                    >
                        <Maximize2 className="w-4 h-4 mr-2" />
                        3x3 Grid
                    </Button>
                    <div className="h-4 w-px bg-white/10 hidden sm:block self-center mx-2" />
                    <Button
                        onClick={() => setIsUplinkOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-widest text-[10px] h-9 sm:h-10 px-4 sm:px-6 rounded-xl shadow-lg shadow-blue-500/20"
                    >
                        <Camera className="w-4 h-4 mr-2" />
                        Link Device
                    </Button>
                </div>
            </div>

            {/* Monitoring Grid / Focused View */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                <AnimatePresence mode="wait">
                    {focusedStream ? (
                        <motion.div
                            key="focused"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="h-full w-full"
                        >
                            <Card className="relative group overflow-hidden bg-black border-white/20 rounded-[2rem] shadow-2xl border flex flex-col h-full">
                                <div className="absolute top-6 left-6 right-6 z-20 flex items-start justify-between gap-3">
                                    <Badge variant="outline" className="bg-black/70 backdrop-blur-md border-white/20 text-white font-black text-xs px-4 py-2 uppercase tracking-widest">
                                        <Activity className="w-4 h-4 mr-2 text-green-500" />
                                        Sector {focusedStream.name} - ENHANCED FEED
                                    </Badge>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setFocusedStream(null)}
                                        className="rounded-full bg-black/60 border-white/10 text-white hover:bg-white/10"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="flex-1 bg-zinc-950 relative">
                                    <FaceDetection isEmbedded={true} detectionInterval={inferenceInterval} />
                                </div>
                            </Card>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="grid"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={`grid auto-rows-fr gap-4 md:gap-6 ${gridLayout === '2x2' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}
                        >
                            {streams.map((stream) => (
                                <Card key={stream.id} className={`relative group overflow-hidden bg-black border-white/10 rounded-[1.5rem] lg:rounded-[2rem] shadow-2xl border flex flex-col ${cardMinHeight}`}>
                                    {/* Stream Header */}
                                    <div className="absolute top-4 left-4 right-4 z-20 flex items-start justify-between gap-3">
                                        <Badge variant="outline" className="bg-black/70 backdrop-blur-md border-white/10 text-white font-black text-[9px] px-3 py-1 uppercase tracking-widest">
                                            <Activity className="w-3 h-3 mr-2 text-green-500" />
                                            {stream.name}
                                        </Badge>
                                        <Badge className={`${stream.status === 'Active'
                                            ? 'bg-blue-600/20 text-blue-500 border-blue-500/30'
                                            : 'bg-zinc-700/20 text-zinc-400 border-zinc-500/30'} font-black text-[9px] uppercase tracking-widest`}>
                                            <Dot className="w-3 h-3 mr-1" />
                                            {stream.status}
                                        </Badge>
                                    </div>

                                    {/* Stream Controls Overlay */}
                                    {stream.status === 'Active' && (
                                        <div className="absolute bottom-4 right-4 z-20 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all flex gap-2 md:translate-y-2 md:group-hover:translate-y-0 text-white">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => handleOpenSettings(stream)}
                                                className="w-10 h-10 rounded-xl bg-black/60 border-white/10 hover:bg-white/10"
                                            >
                                                <Settings2 className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => setFocusedStream(stream)}
                                                className="w-10 h-10 rounded-xl bg-black/60 border-white/10 hover:bg-white/10"
                                            >
                                                <Maximize2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}

                                    {/* Stream Body */}
                                    <div className="flex-1 bg-zinc-900/40 relative">
                                        {stream.status === 'Active' ? (
                                            <FaceDetection
                                                isEmbedded={true}
                                                detectionInterval={inferenceInterval}
                                                externalStream={Object.values(remoteStreams)[stream.id - 2] || null} // Shift by 1 since stream 1 is local
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white p-6 sm:p-8 text-center">
                                                <div className="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
                                                    {initializingStreams.has(stream.id) ? (
                                                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                                    ) : (
                                                        <Camera className="w-8 h-8 text-zinc-600" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-black uppercase tracking-widest text-zinc-500 mb-1">
                                                        {initializingStreams.has(stream.id) ? 'Uplink Negotiating...' : 'Optical Stream Offline'}
                                                    </div>
                                                    <div className="text-[10px] text-zinc-700 font-bold uppercase tracking-[0.2em]">
                                                        {initializingStreams.has(stream.id) ? 'Establishing Secure Neural Tunnel' : `Awaiting Uplink from Node ${stream.id}`}
                                                    </div>
                                                </div>
                                                {!initializingStreams.has(stream.id) && (
                                                    <Button
                                                        variant="link"
                                                        onClick={() => handleInitialize(stream.id)}
                                                        className="text-blue-500 text-[10px] font-black uppercase tracking-widest mt-2 hover:no-underline"
                                                    >
                                                        <RefreshCcw className="w-3 h-3 mr-2" />
                                                        Initialize Link
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Scanning Overlay (Aesthetic) */}
                                    <div className="absolute inset-0 pointer-events-none border-[0.5px] border-white/10 z-10" />
                                    {stream.status === 'Active' && (
                                        <div className="absolute top-0 left-0 w-full h-[1px] bg-blue-500/30 animate-scan z-30" />
                                    )}
                                </Card>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Neural Configuration Dialog */}
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogContent className="bg-[#050505] border-white/10 text-white rounded-3xl max-w-md backdrop-blur-3xl shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter italic">
                            Stream <span className="text-blue-500">Config</span>
                        </DialogTitle>
                        <DialogDescription className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                            Neural Node: {selectedStream?.name}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-6">
                        <div className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/5 rounded-2xl group hover:border-blue-500/30 transition-all">
                            <div className="flex gap-4 items-center">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                    <Shield className="w-5 h-5 text-blue-500" />
                                </div>
                                <div className="grid gap-1">
                                    <Label htmlFor="overlay" className="text-sm font-black uppercase tracking-tight">Neural Overlay</Label>
                                    <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">Real-time detection boxes</span>
                                </div>
                            </div>
                            <Switch id="overlay" defaultChecked />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/5 rounded-2xl group hover:border-blue-500/30 transition-all">
                            <div className="flex gap-4 items-center">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                    <Target className="w-5 h-5 text-emerald-500" />
                                </div>
                                <div className="grid gap-1">
                                    <Label htmlFor="tracking" className="text-sm font-black uppercase tracking-tight">Focus Tracking</Label>
                                    <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">Prioritize closest identity</span>
                                </div>
                            </div>
                            <Switch id="tracking" />
                        </div>

                        <div className="flex flex-col gap-4 p-4 bg-white/[0.03] border border-white/5 rounded-2xl group hover:border-blue-500/30 transition-all">
                            <div className="flex items-center justify-between">
                                <div className="flex gap-4 items-center">
                                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                        <Sliders className="w-5 h-5 text-amber-500" />
                                    </div>
                                    <div className="grid gap-1">
                                        <Label htmlFor="threshold" className="text-sm font-black uppercase tracking-tight">Inference Interval</Label>
                                        <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">Adjust API call frequency</span>
                                    </div>
                                </div>
                                <Badge variant="outline" className="bg-amber-500/10 border-amber-500/30 text-amber-500 font-black">{inferenceInterval}ms</Badge>
                            </div>
                            <input
                                type="range"
                                min="200"
                                max="2000"
                                step="100"
                                value={inferenceInterval}
                                onChange={(e) => setInferenceInterval(Number(e.target.value))}
                                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                            <div className="flex justify-between text-[8px] text-zinc-600 font-bold uppercase tracking-widest">
                                <span>Fast (200ms)</span>
                                <span>Efficient (2000ms)</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-2 text-center">
                        <Button
                            className="w-full h-12 bg-white hover:bg-zinc-200 text-black font-black uppercase tracking-widest rounded-2xl"
                            onClick={() => setIsSettingsOpen(false)}
                        >
                            Commit Changes
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Remote Uplink Dialog */}
            <Dialog open={isUplinkOpen} onOpenChange={setIsUplinkOpen}>
                <DialogContent className="bg-zinc-950 border-white/10 text-white rounded-[2rem] max-w-lg shadow-2xl overflow-hidden p-0">
                    <div className="p-8 space-y-8">
                        <div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter italic">Remote <span className="text-blue-500">Uplink</span></h2>
                            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-1">Handoff surveillance to secondary neural nodes</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-6 bg-white/[0.03] border border-white/5 rounded-3xl space-y-6">
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                                        Internet Uplink
                                    </span>
                                    <p className="text-[9px] text-zinc-500 font-bold leading-relaxed uppercase">Scan with your device camera to initiate high-speed WebRTC handoff.</p>
                                </div>
                                <div className="bg-white p-4 rounded-2xl flex items-center justify-center shadow-lg">
                                    <QRCodeSVG value={uplinkUrl} size={160} level="M" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest text-center">Neural Signature</p>
                                    <p className="text-xs font-mono font-bold text-center text-zinc-300">{uplinkId}</p>
                                </div>
                            </div>

                            <div className="p-6 bg-white/[0.03] border border-white/5 rounded-3xl flex flex-col justify-between">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                            <Radio className="w-3 h-3" />
                                            Bluetooth Scan
                                        </span>
                                        <p className="text-[9px] text-zinc-500 font-bold leading-relaxed uppercase">Discover nearby hardware nodes via authenticated local frequency.</p>
                                    </div>
                                    <div className="h-40 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-3 text-center p-4">
                                        {isBluetoothScanning ? (
                                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center">
                                                <Target className="w-5 h-5 text-zinc-700" />
                                            </div>
                                        )}
                                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.2em]">{isBluetoothScanning ? 'Interrogating Local Space...' : 'Awaiting Peer Selection'}</span>
                                    </div>
                                </div>
                                <Button
                                    onClick={handleBluetoothScan}
                                    disabled={isBluetoothScanning}
                                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase tracking-widest text-[10px] h-12 rounded-xl"
                                >
                                    Scan for Nodes
                                </Button>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5 text-center">
                            <Button
                                variant="ghost"
                                onClick={() => setIsUplinkOpen(false)}
                                className="text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white"
                            >
                                Secure Panel
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ControlCenter;
