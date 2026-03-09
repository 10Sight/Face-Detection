import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateMetrics } from '../store/slices/performanceSlice';
import { useGetTelemetryQuery } from '../store/api/faceApi';
import {
    LayoutGrid, Maximize2,
    Activity, Settings2,
    Camera, Radio, RefreshCcw, Dot,
    ChevronLeft, Sliders, Shield, Target,
    User, BrainCircuit, Fingerprint, Box,
    X, Loader2, Video, Image as ImageIcon
} from 'lucide-react';
import FaceDetection from '../components/FaceDetection/FaceDetection';
import ZoneEditor from '../components/FaceDetection/ZoneEditor';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Cloud, Thermometer, Wind, Droplets, MapPin, ListTree, History as HistoryIcon, TrendingUp } from 'lucide-react';

const Sparkline = ({ data = [], color = "#6366f1", height = 30 }) => {
    if (data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const points = data.map((d, i) => `${(i / (data.length - 1)) * 100},${100 - ((d - min) / range) * 100}`).join(' ');

    return (
        <div className="w-full" style={{ height }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                <defs>
                    <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>
                <polyline
                    points={points}
                    fill="none"
                    stroke={color}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-500"
                />
                <polygon
                    points={`0,100 ${points} 100,100`}
                    fill={`url(#grad-${color})`}
                />
            </svg>
        </div>
    );
};

const EnvironmentWidget = ({ data, isLoading }) => (
    <Card className="bg-slate-900 border-none text-white rounded-2xl p-5 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/20 rounded-full blur-[60px] -mr-16 -mt-16 group-hover:bg-indigo-500/30 transition-all duration-700" />
        <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <div className="flex items-center gap-1.5 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-1.5">
                        <MapPin className="w-3 h-3" /> HQ Exterior (Real)
                    </div>
                    {isLoading ? (
                        <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                            <span className="text-xl font-black tracking-tighter opacity-50">Syncing...</span>
                        </div>
                    ) : (
                        <div className="text-3xl font-black tracking-tighter">{data?.temp || '18'}°C</div>
                    )}
                </div>
                <Cloud className={`w-8 h-8 ${isLoading ? 'text-slate-700 animate-pulse' : 'text-slate-400'}`} />
            </div>
            <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-4">
                <div className="flex flex-col gap-1">
                    <Wind className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px] font-bold text-slate-300">{data?.wind || '12'}km/h</span>
                </div>
                <div className="flex flex-col gap-1">
                    <Droplets className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px] font-bold text-slate-300">{data?.humidity || '64'}%</span>
                </div>
                <div className="flex flex-col gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                    <span className="text-[10px] font-bold text-slate-300">Live</span>
                </div>
            </div>
        </div>
    </Card>
);

const ActivityFeed = ({ events = [] }) => (
    <Card className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm overflow-hidden flex flex-col flex-1">
        <div className="flex items-center justify-between mb-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <ListTree className="w-3.5 h-3.5" /> Neural Activity
            </h3>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <div className="space-y-4 overflow-y-auto pr-1 max-h-[300px] scrollbar-none">
            <AnimatePresence initial={false}>
                {events.length === 0 ? (
                    <div className="text-center py-10">
                        <HistoryIcon className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Awaiting Events</span>
                    </div>
                ) : (
                    events.map((event, idx) => (
                        <motion.div
                            key={event.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex gap-4 p-3 bg-slate-50 border border-slate-100 rounded-xl hover:bg-white hover:border-indigo-200 transition-all cursor-crosshair group"
                        >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${event.type === 'alert' ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-500'}`}>
                                {event.icon || <Fingerprint className="w-5 h-5" />}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <div className="text-[11px] font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{event.title}</div>
                                <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-tighter mt-0.5">{event.description}</div>
                                <div className="text-[8px] font-black text-indigo-400 mt-1.5">{event.timestamp}</div>
                            </div>
                        </motion.div>
                    ))
                )}
            </AnimatePresence>
        </div>
    </Card>
);

const ControlCenter = () => {
    const [gridLayout, setGridLayout] = useState('2x2'); // '2x2' or '3x3'
    const [focusedStream, setFocusedStream] = useState(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [selectedStream, setSelectedStream] = useState(null);
    const [activeStreams, setActiveStreams] = useState([1]);
    const [initializingStreams, setInitializingStreams] = useState(new Set());
    const [inferenceInterval, setInferenceInterval] = useState(500);
    const [isDetectionEnabled, setIsDetectionEnabled] = useState(true);
    const [detectionModes, setDetectionModes] = useState(['face']);
    const [bodyTrackingMode, setBodyTrackingMode] = useState('skeleton');
    const [isObjectDetectionEnabled, setIsObjectDetectionEnabled] = useState(false);
    const [isHandTrackingEnabled, setIsHandTrackingEnabled] = useState(false);

    // Tactical Enhancements State
    const [activityEvents, setActivityEvents] = useState([]);
    const [latencyHistory, setLatencyHistory] = useState(Array(15).fill(0));
    const [throughputHistory, setThroughputHistory] = useState(Array(15).fill(0));

    // Weather State
    const [weatherData, setWeatherData] = useState(null);
    const [isWeatherLoading, setIsWeatherLoading] = useState(true);
    const [isConfiguringZones, setIsConfiguringZones] = useState(false);

    // Performance Metrics from Global Store
    const dispatch = useDispatch();
    const { latency, throughput } = useSelector(state => state.performance);
    const { isFullScreen } = useSelector(state => state.ui);

    // Backend Telemetry Polling (High Frequency for Mission Control)
    const { data: telemetryData } = useGetTelemetryQuery(undefined, {
        pollingInterval: 2000, // Sync every 2 seconds
    });

    // Handle full screen focus
    useEffect(() => {
        if (isFullScreen && !focusedStream) {
            // Default to the first active stream or just stream 1
            setFocusedStream(activeStreams[0] || 1);
        }
    }, [isFullScreen, focusedStream, activeStreams]);

    useEffect(() => {
        if (telemetryData?.data) {
            const stats = telemetryData.data;
            const avgLatency = Math.round(
                (stats.worker_latency_ms?.face + stats.worker_latency_ms?.pose_hand + stats.worker_latency_ms?.object) / 3
            ) || 0;

            dispatch(updateMetrics({
                latency: avgLatency,
                throughput: Number(stats.current_fps?.toFixed(1)) || 0
            }));

            // Update Tactical History
            setLatencyHistory(prev => [...prev.slice(1), avgLatency]);
            setThroughputHistory(prev => [...prev.slice(1), Number(stats.current_fps || 0)]);

            // Log Significant Events (Activity Feed)
            if (stats.faces_count > 0 && Math.random() > 0.7) {
                const newEvent = {
                    id: Date.now(),
                    type: 'detection',
                    title: `${stats.faces_count} Neural Patterns`,
                    description: `Active tracking in Sector ${String.fromCharCode(65 + Math.floor(Math.random() * 4))}`,
                    timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                    icon: <BrainCircuit className="w-5 h-5" />
                };
                setActivityEvents(prev => [newEvent, ...prev].slice(0, 10));
            }
        }
    }, [telemetryData, dispatch]);

    // Weather Lifecycle
    useEffect(() => {
        const fetchRealWeather = async () => {
            setIsWeatherLoading(true);
            try {
                // 1. Get Geolocation
                const pos = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject);
                });

                const { latitude, longitude } = pos.coords;

                // 2. Fetch Open-Meteo
                const response = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m`
                );
                const data = await response.json();

                if (data.current) {
                    setWeatherData({
                        temp: Math.round(data.current.temperature_2m),
                        humidity: Math.round(data.current.relative_humidity_2m),
                        wind: Math.round(data.current.wind_speed_10m)
                    });
                }
            } catch (err) {
                console.warn("Weather sync failed, using fallback:", err);
            } finally {
                setIsWeatherLoading(false);
            }
        };

        fetchRealWeather();
        const interval = setInterval(fetchRealWeather, 30 * 60 * 1000); // 30 min sync
        return () => clearInterval(interval);
    }, []);

    // Uplink State
    const [isUplinkOpen, setIsUplinkOpen] = useState(false);
    const [uplinkId] = useState(`node-${Math.random().toString(36).substr(2, 6)}`);
    const [remoteStreams, setRemoteStreams] = useState({});
    const [isBluetoothScanning, setIsBluetoothScanning] = useState(false);
    const [streamModes, setStreamModes] = useState({});

    useEffect(() => {
        if (!uplinkId) return;

        let peerInstance = null;
        const delayTimer = setTimeout(() => {
            const peer = new Peer(uplinkId);
            peerInstance = peer;

            peer.on('call', (call) => {
                call.answer();
                call.on('stream', (remoteStream) => {
                    setRemoteStreams(prev => ({
                        ...prev,
                        [call.peer]: remoteStream
                    }));
                    setActiveStreams(prev => {
                        const nextSlot = [2, 3, 4, 5, 6, 7, 8, 9].find(s => !prev.includes(s));
                        return nextSlot ? [...prev, nextSlot] : prev;
                    });
                });
            });

            peer.on('error', (err) => {
                console.warn("PeerJS connection error:", err);
            });

            peer.on('close', () => {
                console.log("PeerJS connection closed");
            });
        }, 100);

        return () => {
            clearTimeout(delayTimer);
            if (peerInstance) {
                peerInstance.disconnect();
                peerInstance.destroy();
            }
        };
    }, [uplinkId]);

    const handleBluetoothScan = async () => {
        setIsBluetoothScanning(true);
        try {
            await navigator.bluetooth.requestDevice({
                acceptAllDevices: true
            });
        } catch (err) {
            console.warn("Bluetooth discovery cancelled or not supported");
        } finally {
            setIsBluetoothScanning(false);
        }
    };

    const streams = Array.from({ length: gridLayout === '2x2' ? 4 : 9 }, (_, i) => ({
        id: i + 1,
        name: `Sector ${String.fromCharCode(65 + i)}-${(i % 3) + 1}`,
        status: activeStreams.includes(i + 1) ? 'Active' : 'Standby'
    }));

    const handleInitialize = (id) => {
        setInitializingStreams(prev => new Set(prev).add(id));
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
        <div className="flex-1 flex flex-col min-h-0 relative select-none">

            {/* Tactical Toolbar - Responsive */}
            {!isFullScreen && (
                <div className="sticky top-0 z-30 bg-white/70 backdrop-blur-md border-b border-slate-200/60 px-4 py-3 shrink-0 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-4 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                        <div className="flex items-center p-1 bg-slate-100 border border-slate-200 rounded-xl">
                            <button
                                onClick={() => { setGridLayout('2x2'); setFocusedStream(null); }}
                                className={`p-2 rounded-lg transition-all ${gridLayout === '2x2' && !focusedStream ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => { setGridLayout('3x3'); setFocusedStream(null); }}
                                className={`p-2 rounded-lg transition-all ${gridLayout === '3x3' && !focusedStream ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                            >
                                <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

                        <Tabs
                            value={(() => {
                                if (!isDetectionEnabled) return 'video';
                                if (isObjectDetectionEnabled) return 'object';
                                if (detectionModes.includes('body')) return 'body';
                                if (detectionModes.includes('hand')) return 'hand';
                                if (detectionModes.includes('mesh')) return 'mesh';
                                return 'face';
                            })()}
                            onValueChange={(value) => {
                                if (value === 'video') {
                                    setIsDetectionEnabled(false);
                                    return;
                                }

                                setIsDetectionEnabled(true);
                                if (value === 'object') {
                                    setIsObjectDetectionEnabled(true);
                                    setDetectionModes([]);
                                } else if (value === 'body') {
                                    setIsObjectDetectionEnabled(false);
                                    setDetectionModes(['body']);
                                    // Keep current tracking mode (skeleton or box)
                                } else {
                                    setIsObjectDetectionEnabled(false);
                                    setDetectionModes([value]);
                                }
                            }}
                            className="w-auto"
                        >
                            <TabsList className="bg-slate-100 border border-slate-200 rounded-xl p-0.5 h-auto">
                                <TabsTrigger value="video" className="px-3 py-1.5 rounded-lg text-slate-500 text-[9px] uppercase tracking-wider font-bold">
                                    <Video className="w-3 h-3 mr-1.5" />
                                    Feed
                                </TabsTrigger>
                                <TabsTrigger value="face" className="px-3 py-1.5 rounded-lg text-slate-500 text-[9px] uppercase tracking-wider font-bold">
                                    <User className="w-3 h-3 mr-1.5" />
                                    Face
                                </TabsTrigger>
                                <TabsTrigger value="hand" className="px-3 py-1.5 rounded-lg text-slate-500 text-[9px] uppercase tracking-wider font-bold">
                                    <Dot className="w-3 h-3 mr-1.5" />
                                    Hand
                                </TabsTrigger>
                                <TabsTrigger value="mesh" className="px-3 py-1.5 rounded-lg text-slate-500 text-[9px] uppercase tracking-wider font-bold">
                                    <BrainCircuit className="w-3 h-3 mr-1.5" />
                                    Mesh
                                </TabsTrigger>
                                <TabsTrigger value="body" className="px-3 py-1.5 rounded-lg text-slate-500 text-[9px] uppercase tracking-wider font-bold">
                                    <Activity className="w-3 h-3 mr-1.5" />
                                    Body
                                </TabsTrigger>
                                <TabsTrigger value="object" className="px-3 py-1.5 rounded-lg text-slate-500 text-[9px] uppercase tracking-wider font-bold">
                                    <Target className="w-3 h-3 mr-1.5" />
                                    Object
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            className="h-9 px-3 text-slate-500 hover:text-blue-600 rounded-lg hidden sm:flex"
                            onClick={() => setIsSettingsOpen(true)}
                        >
                            <Sliders className="w-3.5 h-3.5 mr-2" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Config</span>
                        </Button>
                        <Button
                            className="h-9 bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase tracking-widest px-4 rounded-lg shadow-sm text-[10px]"
                            onClick={() => setIsUplinkOpen(true)}
                        >
                            <Camera className="w-3.5 h-3.5 mr-2" />
                            Uplink
                        </Button>
                    </div>
                </div>
            )}

            <main className={`flex-1 p-4 lg:p-6 relative z-10 ${isFullScreen ? 'p-0' : ''}`}>
                <div className="max-w-[1920px] mx-auto grid grid-cols-12 gap-6 pb-12">

                    {/* Stream Grid */}
                    <div className={`${isFullScreen ? 'col-span-12' : 'col-span-12 lg:col-span-8 xl:col-span-9'}`}>
                        <AnimatePresence mode="wait">
                            {focusedStream ? (
                                <motion.div
                                    key="focused"
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    className="h-full relative"
                                >
                                    <Card className="h-full bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl relative group">
                                        {/* Stream Header HUD */}
                                        <div className="absolute top-0 inset-x-0 z-20 px-6 py-4 flex items-center justify-between bg-white/90 backdrop-blur-md border-b border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-sm" />
                                                <div>
                                                    <span className="text-sm font-bold text-slate-800 tracking-wide">Sector {streams.find(s => s.id === focusedStream)?.name}</span>
                                                    <div className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mt-0.5">{streamModes[focusedStream] === 'image' ? 'Static Analysis' : 'Live Feed Active'}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
                                                    <button
                                                        onClick={() => setStreamModes(prev => ({ ...prev, [focusedStream]: "image" }))}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all duration-300 ${streamModes[focusedStream] === 'image' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                                                    >
                                                        <ImageIcon className="w-3 h-3" /> Static
                                                    </button>
                                                    <button
                                                        onClick={() => setStreamModes(prev => ({ ...prev, [focusedStream]: "live" }))}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all duration-300 ${streamModes[focusedStream] !== 'image' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                                                    >
                                                        <Video className="w-3 h-3" /> Uplink
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => setIsConfiguringZones(true)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all duration-300 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100"
                                                >
                                                    <Box className="w-3.5 h-3.5" /> Configure Zones
                                                </button>
                                                <div className="w-px h-6 bg-slate-200 mx-2" />
                                                <button
                                                    onClick={() => {
                                                        setFocusedStream(null);
                                                        setIsConfiguringZones(false);
                                                    }}
                                                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all font-semibold flex items-center gap-2 text-xs"
                                                >
                                                    <ChevronLeft className="w-4 h-4" />
                                                    Return to Grid
                                                </button>
                                            </div>
                                        </div>

                                        <div className="w-full h-full flex flex-col bg-slate-50">
                                            <div className="h-[72px] shrink-0" /> {/* Spacer for HUD Header */}
                                            <div className="flex-1 relative overflow-hidden">
                                                <FaceDetection
                                                    isEmbedded={true}
                                                    detectionInterval={inferenceInterval}
                                                    externalStream={remoteStreams[focusedStream]}
                                                    isDetectionEnabled={isDetectionEnabled}
                                                    detectionModes={detectionModes}
                                                    bodyTrackingMode={bodyTrackingMode}
                                                    isObjectDetectionEnabled={isObjectDetectionEnabled}
                                                    isHandTrackingEnabled={isHandTrackingEnabled}
                                                    mode={streamModes[focusedStream] || "live"}
                                                    onModeChange={(m) => setStreamModes(prev => ({ ...prev, [focusedStream]: m }))}
                                                />
                                                <AnimatePresence>
                                                    {isConfiguringZones && (
                                                        <motion.div
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                            className="absolute inset-0"
                                                        >
                                                            <ZoneEditor
                                                                cameraId={`sector-${focusedStream}`}
                                                                onClose={() => setIsConfiguringZones(false)}
                                                            />
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="grid"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className={`grid gap-6 p-1 ${gridLayout === '2x2' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3'}`}
                                >
                                    {streams.map((stream) => (
                                        <Card
                                            key={stream.id}
                                            className={`group relative bg-white rounded-2xl overflow-hidden transition-all duration-500 ${cardMinHeight} ${activeStreams.includes(stream.id) ? 'border-slate-300 shadow-md hover:shadow-xl' : 'border-slate-200 shadow-sm opacity-90'}`}
                                        >
                                            {/* Tactical Heat Overlay */}
                                            {activeStreams.includes(stream.id) && (
                                                <div className="absolute inset-0 pointer-events-none z-10">
                                                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-indigo-500/10 transition-colors" />
                                                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/5 blur-3xl rounded-full -translate-x-1/2 translate-y-1/2 group-hover:bg-blue-500/10 transition-colors" />
                                                </div>
                                            )}
                                            <div className="absolute top-0 inset-x-0 z-20 px-5 py-4 flex items-center justify-between bg-white/80 backdrop-blur-sm border-b border-slate-100/50">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${activeStreams.includes(stream.id) ? 'bg-emerald-500 shadow-sm' : 'bg-slate-300'}`} />
                                                    <span className="text-[11px] font-bold text-slate-700 tracking-wide">{stream.name}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button onClick={() => setFocusedStream(stream.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-all">
                                                        <Maximize2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleOpenSettings(stream)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-all">
                                                        <Settings2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {activeStreams.includes(stream.id) ? (
                                                <div className="relative h-full flex flex-col bg-slate-50 overflow-hidden">
                                                    <div className="h-[52px] shrink-0" /> {/* Spacer for Grid Header */}
                                                    <div className="flex-1 relative overflow-hidden">
                                                        <FaceDetection
                                                            isEmbedded={true}
                                                            detectionInterval={inferenceInterval}
                                                            externalStream={remoteStreams[stream.id]}
                                                            isDetectionEnabled={isDetectionEnabled}
                                                            detectionModes={detectionModes}
                                                            bodyTrackingMode={bodyTrackingMode}
                                                            isObjectDetectionEnabled={isObjectDetectionEnabled}
                                                            isHandTrackingEnabled={isHandTrackingEnabled}
                                                            mode={streamModes[stream.id] || "live"}
                                                            onModeChange={(m) => setStreamModes(prev => ({ ...prev, [stream.id]: m }))}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center p-6 bg-slate-50 relative">
                                                    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                                        <Camera className="w-7 h-7" />
                                                    </div>
                                                    <Button
                                                        onClick={() => handleInitialize(stream.id)}
                                                        variant="outline"
                                                        className="bg-white border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 rounded-xl px-6 font-semibold"
                                                        disabled={initializingStreams.has(stream.id)}
                                                    >
                                                        {initializingStreams.has(stream.id) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
                                                        {initializingStreams.has(stream.id) ? 'Connecting...' : 'Initialize Feed'}
                                                    </Button>
                                                </div>
                                            )}
                                        </Card>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Stats Sidebar */}
                    {!isFullScreen && (
                        <aside className="col-span-12 lg:col-span-4 xl:col-span-3 flex flex-col gap-5 pr-1">
                            <Card className="bg-white border text-center border-slate-200 rounded-2xl p-5 shadow-sm">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Network Health</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="text-3xl font-black text-slate-800 tracking-tight">
                                                {latency || '00'}
                                                <span className="text-sm text-slate-400 font-medium ml-1">ms</span>
                                            </div>
                                            <Sparkline data={latencyHistory} color="#94a3b8" height={20} />
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase mt-2">Avg Latency</div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="text-3xl font-black text-blue-600 tracking-tight">
                                                {throughput || '0.0'}
                                                <span className="text-sm text-blue-400 font-medium ml-1">fps</span>
                                            </div>
                                            <Sparkline data={throughputHistory} color="#3b82f6" height={20} />
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase mt-2">Throughput</div>
                                    </div>
                                </div>
                            </Card>

                            <EnvironmentWidget data={weatherData} isLoading={isWeatherLoading} />

                            <ActivityFeed events={activityEvents} />

                            <Card className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Nodes</h3>
                                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-bold px-3">
                                        {activeStreams.length} Online
                                    </Badge>
                                </div>
                                <div className="space-y-2">
                                    {streams.map(s => (
                                        <div key={s.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 cursor-pointer">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2.5 h-2.5 rounded-full ${s.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                                <span className="text-sm font-semibold text-slate-700">{s.name}</span>
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.status === 'Active' ? 'Online' : 'Standby'}</div>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            <Card className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex-1 min-h-[200px] text-left relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none opacity-50" />
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5 relative z-10">System Log</h3>
                                <div className="space-y-3 font-mono text-[11px] text-slate-600 relative z-10">
                                    <div className="flex gap-3"><span className="text-emerald-600 font-bold">08:42</span> <span className="text-slate-500 uppercase">SESSION_STARTUP: <span className="text-emerald-600">OK</span></span></div>
                                    <div className="flex gap-3"><span className="text-emerald-600 font-bold">08:43</span> <span className="text-slate-500 uppercase">UPLINK_BIND: <span className="text-blue-600">LISTENING</span></span></div>
                                    <div className="flex gap-3"><span className="text-emerald-600 font-bold">08:45</span> <span className="text-slate-500 uppercase">NEURAL_SYNC: <span className="text-indigo-600 font-bold">NODE_01</span></span></div>
                                    <div className="flex gap-3 animate-pulse"><span className="text-blue-500 font-bold">...</span> <span className="text-blue-400 uppercase font-bold tracking-tight">AWAITING_TASKS</span></div>
                                </div>
                            </Card>
                        </aside>
                    )}
                </div>
            </main>

            {/* Neural Configuration Dialog */}
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogContent className="bg-white/90 backdrop-blur-xl border-slate-200/60 text-slate-800 rounded-3xl max-w-sm shadow-2xl p-0 overflow-hidden border max-h-[90vh] flex flex-col">
                    <div className="p-6 border-b border-slate-100 bg-slate-50 shrink-0">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black text-slate-900">
                                Parameters
                            </DialogTitle>
                            <DialogDescription className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mt-2">
                                Sector: {selectedStream?.name || 'Tactical Global'}
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-6 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                        <div className="flex items-center justify-between p-4 bg-white/50 border border-slate-200/60 shadow-sm rounded-2xl group transition-all">
                            <div className="flex gap-4 items-center">
                                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <div className="grid gap-1">
                                    <Label className="text-sm font-bold text-slate-800">Vision Overlay</Label>
                                    <span className="text-[11px] text-slate-500 font-medium">Enable real-time tracking boxes</span>
                                </div>
                            </div>
                            <Switch
                                checked={isDetectionEnabled}
                                onCheckedChange={setIsDetectionEnabled}
                                className="data-[state=checked]:bg-blue-600"
                            />
                        </div>

                        {/* Person Tracking Mode Toggle */}
                        <div className="flex items-center justify-between p-4 bg-white/50 border border-slate-200/60 shadow-sm rounded-2xl group transition-all">
                            <div className="flex gap-4 items-center">
                                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                    <User className="w-5 h-5" />
                                </div>
                                <div className="grid gap-1">
                                    <Label className="text-sm font-bold text-slate-800">Person Tracking Mode</Label>
                                    <span className="text-[11px] text-slate-500 font-medium">Box vs Skeleton Tracking</span>
                                </div>
                            </div>
                            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                                <button
                                    onClick={() => setBodyTrackingMode("skeleton")}
                                    className={`px-4 py-2 rounded-md text-[11px] font-bold uppercase transition-all ${bodyTrackingMode === 'skeleton' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
                                >Joints</button>
                                <button
                                    onClick={() => setBodyTrackingMode("box")}
                                    className={`px-4 py-2 rounded-md text-[11px] font-bold uppercase transition-all ${bodyTrackingMode === 'box' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
                                >Box</button>
                            </div>
                        </div>

                        {/* Hand Detection Toggle */}
                        <div className="flex items-center justify-between p-4 bg-white/50 border border-slate-200/60 shadow-sm rounded-2xl group transition-all">
                            <div className="flex gap-4 items-center">
                                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                    <Dot className="w-5 h-5" />
                                </div>
                                <div className="grid gap-1">
                                    <Label className="text-sm font-bold text-slate-800">Hand Detection</Label>
                                    <span className="text-[11px] text-slate-500 font-medium">Gesture and skeleton tracking</span>
                                </div>
                            </div>
                            <Switch
                                checked={isHandTrackingEnabled}
                                onCheckedChange={setIsHandTrackingEnabled}
                                className="data-[state=checked]:bg-blue-600"
                            />
                        </div>

                        {/* Object Analysis Toggle */}
                        <div className="flex items-center justify-between p-4 bg-white/50 border border-slate-200/60 shadow-sm rounded-2xl group transition-all">
                            <div className="flex gap-4 items-center">
                                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                    <Target className="w-5 h-5" />
                                </div>
                                <div className="grid gap-1">
                                    <Label className="text-sm font-bold text-slate-800">Object Analysis</Label>
                                    <span className="text-[11px] text-slate-500 font-medium">Identify cars, bags, and items</span>
                                </div>
                            </div>
                            <Switch
                                checked={isObjectDetectionEnabled}
                                onCheckedChange={setIsObjectDetectionEnabled}
                                className="data-[state=checked]:bg-emerald-600"
                            />
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Polling Interval</Label>
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-xs font-bold text-slate-500">Latency Gap</span>
                                    <span className="text-xl font-black text-slate-800">{inferenceInterval}ms</span>
                                </div>
                                <input
                                    type="range"
                                    min="50"
                                    max="2000"
                                    step="50"
                                    value={inferenceInterval}
                                    onChange={(e) => setInferenceInterval(Number(e.target.value))}
                                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                                <div className="flex justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-4">
                                    <span>Zero Latency</span>
                                    <span>Low Power</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-slate-100 bg-white/80 backdrop-blur-md shrink-0 sticky bottom-0 z-20">
                        <Button
                            className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase tracking-wider rounded-xl shadow-lg transition-all text-xs"
                            onClick={() => setIsSettingsOpen(false)}
                        >
                            Confirm Parameters
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Remote Uplink Dialog */}
            <Dialog open={isUplinkOpen} onOpenChange={setIsUplinkOpen}>
                <DialogContent className="bg-white/90 backdrop-blur-xl border-slate-200/60 text-slate-800 rounded-3xl max-w-[340px] md:max-w-sm shadow-2xl p-0 overflow-hidden border max-h-[90vh] flex flex-col">
                    <div className="p-8 border-b border-slate-100 bg-slate-50 text-center flex flex-col items-center shrink-0">
                        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-5">
                            <Radio className="w-8 h-8 text-blue-600" />
                        </div>
                        <DialogTitle className="text-2xl font-black text-slate-900 mb-2">Connect Node</DialogTitle>
                        <DialogDescription className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">Link remote surveillance hardware</DialogDescription>
                    </div>

                    <div className="p-6 flex flex-col items-center gap-5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                        <div className="p-4 bg-white/50 border border-slate-200/60 rounded-3xl shadow-md">
                            <QRCodeSVG
                                value={`${window.location.origin}/remote-uplink?id=${uplinkId}`}
                                size={140}
                                level="H"
                            />
                        </div>

                        <div className="grid gap-2 text-center w-full">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transmission Key</div>
                            <div className="px-5 py-4 bg-slate-100 rounded-xl text-sm font-mono text-slate-800 font-bold tracking-widest">
                                {uplinkId}
                            </div>
                        </div>

                        <div className="w-full h-px bg-slate-100" />

                        <Button
                            variant="ghost"
                            onClick={handleBluetoothScan}
                            disabled={isBluetoothScanning}
                            className="text-slate-600 hover:text-blue-700 hover:bg-blue-50 font-bold text-xs w-full py-6 rounded-xl transition-all"
                        >
                            {isBluetoothScanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
                            Discover Local PEER Devices
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ControlCenter;
