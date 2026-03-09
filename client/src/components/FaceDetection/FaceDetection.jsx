import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { io } from "socket.io-client";
import { useDispatch, useSelector } from "react-redux";
import { useDetectFaceMutation, useRegisterFaceMutation } from "../../store/api/faceApi";
import { useRegisterObjectMutation } from "../../store/api/objectApi";
import { updateMetrics } from "../../store/slices/performanceSlice";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
    Loader2, Upload, User, AlertCircle, Camera, Video,
    Image as ImageIcon, ScanText, BrainCircuit, Activity,
    Heart, Save, X, ChevronRight, ShieldCheck, Fingerprint,
    Target, Cpu, Zap, Settings2, Aperture, Clock
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import TechnicalMeshView from "./TechnicalMeshView";
import TechnicalHandView from "./TechnicalHandView";
import { toast } from "sonner";
import { openSettings } from "../../store/slices/uiSlice";

/**
 * MEMOIZED HUD COMPONENTS
 * Optimized for high-frequency updates
 */
const TrajectoryOverlay = React.memo(({ faces }) => {
    return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
                <linearGradient id="traj-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0" />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity="0.4" />
                </linearGradient>
            </defs>
            {faces.map((face, i) => {
                if (!face.history || face.history.length < 2) return null;
                const pathData = face.history
                    .map((pt) => {
                        const x = (typeof pt[0] === 'string' ? parseFloat(pt[0]) : pt[0]) * 100;
                        const y = (typeof pt[1] === 'string' ? parseFloat(pt[1]) : pt[1]) * 100;
                        return isNaN(x) || isNaN(y) ? null : { x, y };
                    })
                    .filter(p => p !== null)
                    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(3)} ${p.y.toFixed(3)}`)
                    .join(' ');

                return (
                    <motion.path
                        key={`traj-${face.track_id || i}`}
                        d={pathData}
                        fill="none"
                        stroke="url(#traj-grad)"
                        strokeWidth="1"
                        strokeDasharray="3 3"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.6 }}
                        className="transition-opacity duration-1000"
                    />
                );
            })}
        </svg>
    );
}, (prev, next) => {
    if (prev.faces.length !== next.faces.length) return false;
    const prevPoints = prev.faces.reduce((sum, f) => sum + (f.history?.length || 0), 0);
    const nextPoints = next.faces.reduce((sum, f) => sum + (f.history?.length || 0), 0);
    return prevPoints === nextPoints;
});

const FaceBox = React.memo(({ face, isSelected, onClick }) => {
    return (
        <motion.div
            layoutId={`box-${face.track_id}`}
            onClick={(e) => {
                e.stopPropagation();
                onClick(face);
            }}
            className="absolute cursor-pointer pointer-events-auto group/box"
            style={{
                left: `${face.xmin * 100}%`,
                top: `${face.ymin * 100}%`,
                width: `${face.width * 100}%`,
                height: `${face.height * 100}%`,
            }}
        >
            {/* Corner Brackets */}
            <div className={`absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 transition-all rounded-tl-md duration-500 ${isSelected ? 'border-indigo-600' : 'border-indigo-400/60'}`} />
            <div className={`absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 transition-all rounded-tr-md duration-500 ${isSelected ? 'border-indigo-600' : 'border-indigo-400/60'}`} />
            <div className={`absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 transition-all rounded-bl-md duration-500 ${isSelected ? 'border-indigo-600' : 'border-indigo-400/60'}`} />
            <div className={`absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 transition-all rounded-br-md duration-500 ${isSelected ? 'border-indigo-600' : 'border-indigo-400/60'}`} />

            {/* Premium Scanner Beam */}
            <div className="absolute inset-0 bg-indigo-50/10 opacity-0 group-hover/box:opacity-100 transition-opacity overflow-hidden rounded-md">
                <motion.div
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-px bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                />
            </div>

            {/* Info Badge - Adaptive Positioning */}
            <div className={`absolute left-0 min-w-max transition-all duration-300 ${face.ymin < 0.15 ? 'top-full mt-2' : '-top-12'}`}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`flex items-center gap-2 px-2.5 py-1.5 bg-white/95 backdrop-blur-xl rounded-xl border transition-all duration-300 ${isSelected ? 'border-indigo-200 shadow-lg' : 'border-slate-200 shadow-sm'}`}
                >
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${face.securityAlert ? 'bg-red-500 animate-pulse' : 'bg-indigo-500'}`} />
                            <span className={`text-[11px] font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                                {face.identity?.name || "Unknown"}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] font-semibold text-slate-500 font-mono tracking-tighter">
                                {Math.round(face.confidence * 100)}% Match
                            </span>
                            <div className="w-1 h-1 bg-slate-300 rounded-full" />
                            <span className="text-[9px] font-mono text-indigo-600">
                                #{face.track_id}
                            </span>
                        </div>
                    </div>

                    {face.demographics && (
                        <>
                            <div className="w-px h-6 bg-slate-200 mx-1" />
                            <div className="flex flex-col items-center justify-center min-w-[20px]">
                                <span className="text-[10px] font-black text-slate-700 leading-none">{face.demographics.gender.charAt(0)}</span>
                                <span className="text-[8px] font-bold text-slate-400 mt-0.5">{face.demographics.age}</span>
                            </div>
                        </>
                    )}
                </motion.div>
                {/* Visual Connector */}
                <div className={`absolute left-4 w-px h-3 -z-10 transition-colors duration-500 ${face.ymin < 0.15 ? '-top-3' : '-bottom-2'} ${isSelected ? 'bg-indigo-300' : 'bg-slate-300'}`} />
            </div>
        </motion.div>
    );
}, (prev, next) => {
    return (
        Math.abs(prev.face.xmin - next.face.xmin) < 0.001 &&
        Math.abs(prev.face.ymin - next.face.ymin) < 0.001 &&
        prev.isSelected === next.isSelected &&
        prev.face.identity?.name === next.face.identity?.name &&
        prev.face.time_since_update === next.face.time_since_update
    );
});

const ObjectBox = React.memo(({ obj, isObjectDetectionEnabled, detectionModes, bodyTrackingMode, onRegister }) => {
    const isPerson = obj.label === 'person';
    if (isPerson && !isObjectDetectionEnabled && !(detectionModes.includes('body') && bodyTrackingMode === 'box')) return null;
    if (!isPerson && !isObjectDetectionEnabled) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`absolute pointer-events-auto transition-all duration-300 ${isPerson ? 'border-2 border-[#00ff00]' : 'border border-emerald-400/50'}`}
            style={{
                left: `${obj.xmin * 100}%`,
                top: `${obj.ymin * 100}%`,
                width: `${(obj.xmax - obj.xmin) * 100}%`,
                height: `${(obj.ymax - obj.ymin) * 100}%`,
            }}
        >
            {isPerson ? (
                <div className={`absolute -top-[22px] -left-[2px] ${isObjectDetectionEnabled ? 'bg-emerald-500' : 'bg-[#00ff00]'} px-2 py-0.5 flex items-center gap-1.5`}>
                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">Person</span>
                    {isObjectDetectionEnabled && !obj.identity?.name && obj.embedding?.length > 0 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onRegister(obj); }}
                            className="ml-1 p-1 bg-white/20 hover:bg-white/40 rounded shadow-sm transition-all flex items-center gap-1 group/reg"
                            title="Register Person"
                        >
                            <Save className="w-3 h-3 text-slate-900" />
                            <span className="text-[8px] font-bold text-slate-900 hidden group-hover/reg:inline">Save</span>
                        </button>
                    )}
                </div>
            ) : (
                <div className="absolute -top-6 left-0 flex items-center gap-1.5 px-2 py-0.5 bg-white/90 backdrop-blur-md rounded border border-slate-200 shadow-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[9px] font-bold text-slate-700 uppercase whitespace-nowrap">
                        {obj.identity?.name || obj.label} {obj.track_id ? `[#${obj.track_id}]` : ''}
                    </span>
                    {!obj.identity?.name && obj.embedding?.length > 0 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onRegister(obj); }}
                            className="ml-1 p-1 bg-emerald-50 hover:bg-emerald-100 rounded text-emerald-600 transition-all border border-emerald-200/50 flex items-center gap-1 group/reg"
                            title="Register Object"
                        >
                            <Save className="w-3.5 h-3.5" />
                            <span className="text-[8px] font-black uppercase hidden group-hover/reg:inline">Register</span>
                        </button>
                    )}
                </div>
            )}
            {!isPerson && (
                <>
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-emerald-400" />
                    <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-emerald-400" />
                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-emerald-400" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-emerald-400" />
                </>
            )}
        </motion.div>
    );
}, (prev, next) => {
    return (
        prev.obj.xmin === next.obj.xmin &&
        prev.obj.ymin === next.obj.ymin &&
        prev.isObjectDetectionEnabled === next.isObjectDetectionEnabled &&
        prev.bodyTrackingMode === next.bodyTrackingMode
    );
});

const FaceDetection = ({
    isEmbedded = false,
    detectionInterval = 500,
    externalStream = null,
    isDetectionEnabled = true,
    detectionModes = ['face'],
    bodyTrackingMode: propBodyTrackingMode = "skeleton",
    isObjectDetectionEnabled: propIsObjectDetectionEnabled = false,
    isHandTrackingEnabled: propIsHandTrackingEnabled = false,
    mode: propMode = "live",
    onModeChange
}) => {
    const [internalMode, setInternalMode] = useState("live");
    const mode = onModeChange ? propMode : internalMode;
    const setMode = onModeChange || setInternalMode;
    const [selectedImage, setSelectedImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const dispatch = useDispatch();
    const [detectFace, { isLoading, data: detectionData, error }] = useDetectFaceMutation();
    const [registerFace, { isLoading: isRegistering }] = useRegisterFaceMutation();
    const [registerObject, { isLoading: isObjectRegistering }] = useRegisterObjectMutation();

    const [liveFaces, setLiveFaces] = useState([]);
    const [selectedFace, setSelectedFace] = useState(null);
    const [holisticData, setHolisticData] = useState({ pose: [], hands: [], mesh: [], objects: [] });
    const [registrationData, setRegistrationData] = useState({ name: "", blob: null });
    const [objectRegistrationData, setObjectRegistrationData] = useState({ name: "", category: "", embedding: null });
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [isObjectRegisterModalOpen, setIsObjectRegisterModalOpen] = useState(false);
    const [isSocketConnected, setIsSocketConnected] = useState(false);
    const socketRef = useRef(null);
    const frameCountRef = useRef(0);

    // Internal state for standalone mode
    const [internalBodyTrackingMode, setInternalBodyTrackingMode] = useState("skeleton");
    const [internalIsObjectDetectionEnabled, setInternalIsObjectDetectionEnabled] = useState(false);
    const [internalIsHandTrackingEnabled, setInternalIsHandTrackingEnabled] = useState(false);

    // Resolved state driven by props if embedded
    const bodyTrackingMode = isEmbedded ? propBodyTrackingMode : internalBodyTrackingMode;
    const isObjectDetectionEnabled = isEmbedded ? propIsObjectDetectionEnabled : internalIsObjectDetectionEnabled;
    const isHandTrackingEnabled = isEmbedded ? propIsHandTrackingEnabled : internalIsHandTrackingEnabled;

    const setBodyTrackingMode = isEmbedded ? () => { } : setInternalBodyTrackingMode;
    const setIsObjectDetectionEnabled = isEmbedded ? () => { } : setInternalIsObjectDetectionEnabled;
    const setIsHandTrackingEnabled = isEmbedded ? () => { } : setInternalIsHandTrackingEnabled;

    const {
        unknownAlertsEnabled,
        suspiciousAlertsEnabled,
        showTimeline
    } = useSelector(state => state.ui);


    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const lastFrameTimeRef = useRef(Date.now());
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

    // Handle container resizing for pixel-perfect overlays
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    setImageSize({ width, height });
                }
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Mode handling
    useEffect(() => {
        if (mode === "live") {
            if (externalStream) {
                if (videoRef.current) {
                    videoRef.current.srcObject = externalStream;
                }
            } else {
                startCamera();
            }
        } else {
            stopCamera();
            setLiveFaces([]);
            setSelectedFace(null);
        }
        return () => !externalStream && stopCamera();
    }, [mode, externalStream]);

    // 0. WebSocket Initialization
    useEffect(() => {
        console.log("[HUD] FaceDetection Mounted");
        let isMounted = true;
        let reconnectTimer = null;
        let activeSocket = null; // Track the socket created in THIS mount cycle

        // Forced 127.0.0.1 to bypass IPv6/DNS hang issues on Windows
        const workerUrl = "http://127.0.0.1:8000";
        // Clean up workerUrl to avoid double slashes
        const baseWs = workerUrl.replace(/^http/, "ws").replace(/\/$/, "");
        const wsUrl = baseWs + "/api/v1/stream/ws/perceive";


        const connectWebSocket = () => {
            if (!isMounted) return;
            console.log("[HUD] Attempting WebSocket connection to:", wsUrl);
            const ws = new WebSocket(wsUrl);
            activeSocket = ws;
            socketRef.current = ws;

            ws.onopen = () => {
                if (!isMounted) {
                    ws.close();
                    return;
                }
                toast.success("Perception Stream Connected", {
                    description: "Real-time biometric uplink established.",
                    duration: 3000
                });
                setIsSocketConnected(true);
            };

            ws.onclose = () => {
                if (!isMounted) return;
                toast.error("Perception Stream Disconnected", {
                    description: "Attempting to re-establish uplink...",
                    duration: 2000
                });
                setIsSocketConnected(false);
                reconnectTimer = setTimeout(connectWebSocket, 1500);
            };

            ws.onerror = (err) => {
                if (!isMounted) return;
                toast.error("Stream Communication Error", {
                    description: "Connection to perception engine failed."
                });
                console.error("[HUD] Stream Error:", err);
            };


            ws.onmessage = (event) => {
                if (!isMounted) return;
                frameCountRef.current++;
                try {
                    const data = JSON.parse(event.data);
                    setLiveFaces(data.faces || []);
                    setHolisticData({
                        pose: data.pose || [],
                        hands: data.hands || [],
                        mesh: data.mesh || [],
                        objects: data.objects || []
                    });
                } catch (e) {
                    console.error("Delta Parse Error:", e);
                }
            };
        };

        // Initial Connection (delayed slightly to elide StrictMode double-mount warnings)
        reconnectTimer = setTimeout(connectWebSocket, 100);

        return () => {
            console.log("[HUD] FaceDetection Unmounting");
            isMounted = false;
            if (reconnectTimer) clearTimeout(reconnectTimer);

            if (activeSocket) {
                // Nullify handlers on the socket we created
                activeSocket.onopen = null;
                activeSocket.onclose = null;
                activeSocket.onerror = null;
                activeSocket.onmessage = null;

                if (activeSocket.readyState === WebSocket.CONNECTING || activeSocket.readyState === WebSocket.OPEN) {
                    activeSocket.close();
                }
            }

            // Only nullify the shared ref if it still points to our socket
            if (socketRef.current === activeSocket) {
                socketRef.current = null;
            }
        };
    }, []);

    // Reset detection data when modes change
    useEffect(() => {
        setLiveFaces([]);
        setHolisticData({ pose: [], hands: [], mesh: [], objects: [] });
        setSelectedFace(null);
    }, [detectionModes, isObjectDetectionEnabled]);

    // Keep tracked target properly box-aligned with High-Speed WebSocket Delta Stream
    useEffect(() => {
        if (selectedFace && liveFaces.length > 0) {
            const updated = liveFaces.find(f =>
                (f.identity?.userId && selectedFace.identity?.userId && f.identity.userId === selectedFace.identity.userId) ||
                (f.track_id && selectedFace.track_id && f.track_id === selectedFace.track_id) ||
                (Math.abs(f.xmin - selectedFace.xmin) < 0.05 && Math.abs(f.ymin - selectedFace.ymin) < 0.05)
            );
            if (updated && updated !== selectedFace) {
                setSelectedFace(updated);
            }
        }
    }, [liveFaces]);

    // Clear selected face when detection is disabled
    useEffect(() => {
        if (!isDetectionEnabled) {
            setSelectedFace(null);
        }
    }, [isDetectionEnabled]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1920, height: 1080, facingMode: "user" }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera access error:", err);
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    };

    const isProcessing = useRef(false);

    const captureFrame = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || isLoading || !isDetectionEnabled || isProcessing.current) {
            return;
        }

        const wsReady = socketRef.current?.readyState === WebSocket.OPEN;
        // console.log("[HUD] captureFrame loop active. wsReady:", wsReady);

        if (mode !== "live") return;

        isProcessing.current = true;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        // DEFENSIVE CHECK: Ensure video has dimensions
        if (!video.videoWidth || !video.videoHeight) {
            isProcessing.current = false;
            return;
        }

        // PERFORMANCE OPTIMIZATION: Downsample for detection
        // Upgraded to 640p for higher accuracy in registration and distant detection
        const targetHeight = 640;
        const scale = targetHeight / video.videoHeight;
        canvas.width = video.videoWidth * scale;
        canvas.height = targetHeight;

        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Lower quality (0.7) JPEG is much faster than default PNG
        const startTime = Date.now();
        canvas.toBlob(async (blob) => {
            try {
                if (blob) {
                    const activeModes = [...detectionModes];
                    if (isObjectDetectionEnabled) activeModes.push('object');
                    if (detectionModes.includes('body')) activeModes.push('body');
                    if (isHandTrackingEnabled) activeModes.push('hand');

                    const filteredModes = [...new Set(activeModes)].filter(Boolean);

                    // DEFENSIVE CHECK: Don't call API if no modes are active
                    if (filteredModes.length === 0) {
                        isProcessing.current = false;
                        return;
                    }

                    if (isSocketConnected && wsReady) {
                        if (frameCountRef.current % 120 === 0) {
                            console.log(`[HUD] WebSocket Healthy. Sending frame #${frameCountRef.current}, size: ${blob.size}B`);
                        }
                        socketRef.current.send(blob);

                        const endTime = Date.now();
                        const timeSinceLastFrame = endTime - lastFrameTimeRef.current;
                        const currentFps = 1000 / Math.max(timeSinceLastFrame, 1);
                        lastFrameTimeRef.current = endTime;

                        dispatch(updateMetrics({
                            latency: 0, // Backend telemetry now provides real latency
                            throughput: currentFps
                        }));
                    } else {
                        if (frameCountRef.current % 120 === 0) {
                            console.warn(`[HUD] WebSocket fallback active. isSocketConnected=${isSocketConnected}, wsReady=${wsReady}`);
                        }
                        // Fallback to strict Legacy Protocol if Websocket down
                        const formData = new FormData();
                        formData.append("file", blob, "frame.jpg");

                        const result = await detectFace({
                            formData,
                            params: {
                                modes: filteredModes,
                                timestamp_ms: Date.now(),
                                unknownAlertsEnabled,
                                suspiciousAlertsEnabled
                            }
                        }).unwrap();



                        const endTime = Date.now();
                        const timeSinceLastFrame = endTime - lastFrameTimeRef.current;
                        const currentFps = 1000 / Math.max(timeSinceLastFrame, 1);
                        lastFrameTimeRef.current = endTime;

                        dispatch(updateMetrics({
                            latency: endTime - startTime,
                            throughput: currentFps
                        }));

                        const detectionResult = result?.data || result;
                        setLiveFaces(detectionResult?.faces || []);
                        setHolisticData({
                            pose: detectionResult?.pose || [],
                            hands: detectionResult?.hands || [],
                            mesh: detectionResult?.mesh || [],
                            objects: detectionResult?.objects || []
                        });

                        if (selectedFace) {
                            const updated = detectionResult?.faces?.find(f => f.identity?.userId === selectedFace.identity?.userId || (f.xmin === selectedFace.xmin && f.ymin === selectedFace.ymin));
                            if (updated) setSelectedFace(updated);
                        }
                    }
                }
            } catch (err) {
                console.error("[Detection] Frame error details:", {
                    status: err.status,
                    data: err.data,
                    message: err.message,
                    modes: detectionModes
                });
            } finally {
                isProcessing.current = false;
            }
        }, "image/jpeg", 0.7);
    }, [mode, detectFace, isLoading, isDetectionEnabled, selectedFace, detectionModes, bodyTrackingMode, isObjectDetectionEnabled, isSocketConnected]);

    useEffect(() => {
        let timeoutId;
        const scheduleNext = () => {
            if (mode === "live" && isDetectionEnabled) {
                // Determine adaptive interval based on last detection performance
                // If it took > 1s, we wait 2s to clear worker backlog
                const adaptiveBase = (isLoading || isProcessing.current) ? Math.max(detectionInterval, 1000) : detectionInterval;

                timeoutId = setTimeout(async () => {
                    await captureFrame();
                    scheduleNext();
                }, adaptiveBase);
            }
        };

        if (mode === "live" && isDetectionEnabled) {
            scheduleNext();
        } else {
            setLiveFaces([]);
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [mode, captureFrame, isDetectionEnabled, detectionInterval]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedImage(file);
            setPreviewUrl(URL.createObjectURL(file));
            setLiveFaces([]);
            setSelectedFace(null);
        }
    };

    const handleDetect = async () => {
        if (!selectedImage) return;
        const formData = new FormData();
        formData.append("file", selectedImage);
        try {
            const result = await detectFace({ formData, params: { is_static: true } }).unwrap();
            const faces = result?.data?.faces || result?.faces || [];
            setLiveFaces(faces);
        } catch (err) {
            console.error("Static detection error:", err);
        }
    };

    const handleRegister = async () => {
        if (!registrationData.name || !registrationData.blob) return;

        const formData = new FormData();
        formData.append("name", registrationData.name);
        formData.append("file", registrationData.blob, "face.jpg");

        try {
            await registerFace(formData).unwrap();
            setIsRegisterModalOpen(false);
            setRegistrationData({ name: "", blob: null });
        } catch (err) {
            console.error("Registration error:", err);
        }
    };

    const openRegistration = (faceIndex) => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
            setRegistrationData({ ...registrationData, blob });
            setIsRegisterModalOpen(true);
        }, "image/jpeg", 0.9);
    };

    const handleRegisterObject = async () => {
        if (!objectRegistrationData.name || !objectRegistrationData.embedding) return;

        try {
            await registerObject({
                name: objectRegistrationData.name,
                category: objectRegistrationData.category,
                embedding: objectRegistrationData.embedding,
                metadata: {
                    confidence: 1.0,
                    source: "manual_registration"
                }
            }).unwrap();
            setIsObjectRegisterModalOpen(false);
            setObjectRegistrationData({ name: "", category: "", embedding: null });
        } catch (err) {
            console.error("Object registration error:", err);
        }
    };

    const openObjectRegistration = (obj) => {
        if (!obj.embedding) {
            console.warn("Cannot register object without embedding");
            return;
        }
        setObjectRegistrationData({
            name: "",
            category: obj.label,
            embedding: obj.embedding
        });
        setIsObjectRegisterModalOpen(true);
    };

    return (
        <div className={`flex flex-col min-h-0 bg-slate-50 ${isEmbedded ? 'p-0 h-full w-full' : 'p-4 sm:p-5 lg:p-6'}`}>
            <div className={`w-full ${isEmbedded ? 'space-y-0 h-full' : 'space-y-6 lg:space-y-8'}`}>
                {/* Header Section - Obsidian Command Style */}
                {!isEmbedded && (
                    <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 lg:gap-8 border-b border-slate-200/60 pb-6 lg:pb-8">
                        <div className="space-y-1.5 transition-all hover:translate-x-1 duration-500">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-2"
                            >
                                <BrainCircuit className="w-4 h-4 text-indigo-500" />
                                <h2 className="text-slate-500 font-semibold tracking-wide text-xs uppercase">Optical Workspace</h2>
                            </motion.div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                                Neural<span className="text-indigo-600 ml-1">Engine</span>
                            </h1>
                        </div>
                    </header>
                )}

                <main className={isEmbedded ? "relative h-full w-full" : "grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 min-h-0"}>
                    {/* Left Panel: Controls & Data */}
                    {!isEmbedded && (
                        <div className="lg:col-span-4 space-y-6">
                            <Card className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
                                <CardHeader className="p-4 border-b border-slate-100 mb-3 bg-slate-50/50 flex flex-row items-center justify-between">
                                    <CardTitle className="text-slate-700 text-sm font-semibold flex items-center gap-2 uppercase tracking-wide">
                                        <Activity className="w-4 h-4 text-indigo-500" /> Source
                                    </CardTitle>
                                    <Tabs value={mode} onValueChange={setMode} className="w-auto">
                                        <TabsList className="bg-white p-1 rounded-md border border-slate-200/60 shadow-sm h-auto">
                                            <TabsTrigger value="image" className="data-[state=active]:bg-slate-50 data-[state=active]:text-indigo-600 data-[state=active]:shadow data-[state=active]:border data-[state=active]:border-slate-200/50 px-3 py-1.5 rounded text-[10px] font-bold tracking-wider uppercase transition-all duration-300 text-slate-500">
                                                <ImageIcon className="w-3 h-3 mr-1.5" /> Static
                                            </TabsTrigger>
                                            <TabsTrigger value="live" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow px-3 py-1.5 rounded text-[10px] font-bold tracking-wider uppercase transition-all duration-300 text-slate-500">
                                                <Video className="w-3 h-3 mr-1.5" /> Uplink
                                            </TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                </CardHeader>
                                <CardContent className="p-6 pt-0 space-y-6">
                                    {mode === "image" ? (
                                        <div className="space-y-4">
                                            <div className="relative group rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-400 transition-all cursor-pointer overflow-hidden aspect-video bg-slate-50/50">
                                                <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 z-10 cursor-pointer" />
                                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                                                    {previewUrl ? (
                                                        <img src={previewUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                    ) : (
                                                        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm group-hover:border-indigo-300 group-hover:shadow-md transition-all">
                                                            <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                                        </div>
                                                    )}
                                                    {!previewUrl && <span className="text-xs font-medium text-slate-500 tracking-wide">Click to Upload Source Image</span>}
                                                </div>
                                            </div>
                                            <Button onClick={handleDetect} disabled={!selectedImage || isLoading} className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg transition-all shadow-sm">
                                                {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : "Initiate Analysis"}
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/60 rounded-xl group transition-all hover:border-indigo-200 hover:bg-indigo-50/30">
                                                <div className="space-y-1">
                                                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Active Stream</div>
                                                    <div className="text-sm font-bold text-emerald-600 flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse blur-[1px]" /> 2160P OPTIMIZED
                                                    </div>
                                                </div>
                                                <Camera className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-center group hover:border-indigo-200 hover:bg-slate-100/50 transition-all">
                                                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Throughput</div>
                                                    <div className="text-lg font-bold text-slate-800">
                                                        {Math.round(1000 / Math.max((Date.now() - lastFrameTimeRef.current), 33))}
                                                        <span className="text-xs text-slate-400 ml-1">FPS</span>
                                                    </div>
                                                </div>
                                                <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-center group hover:border-indigo-200 hover:bg-slate-100/50 transition-all">
                                                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Latency</div>
                                                    <div className="text-lg font-bold text-slate-800">
                                                        {detectionData?.perf?.total_pipeline_time ? Math.round(detectionData.perf.total_pipeline_time) : '00'}
                                                        <span className="text-xs text-slate-400 ml-1">MS</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-xs font-medium text-slate-600">Body Tracking</Label>
                                                    <Tabs value={bodyTrackingMode} onValueChange={setBodyTrackingMode} className="w-auto">
                                                        <TabsList className="bg-slate-100 p-1 rounded-lg border border-slate-200 h-auto">
                                                            <TabsTrigger value="skeleton" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200/50 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all text-slate-500">
                                                                Joints
                                                            </TabsTrigger>
                                                            <TabsTrigger value="box" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200/50 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all text-slate-500">
                                                                Box
                                                            </TabsTrigger>
                                                        </TabsList>
                                                    </Tabs>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-xs font-medium text-slate-600">Hand Detection</Label>
                                                    <Switch
                                                        checked={isHandTrackingEnabled}
                                                        onCheckedChange={setIsHandTrackingEnabled}
                                                        className="data-[state=checked]:bg-indigo-600 border-slate-300"
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-xs font-medium text-slate-600">Object Analysis</Label>
                                                    <Switch
                                                        checked={isObjectDetectionEnabled}
                                                        onCheckedChange={setIsObjectDetectionEnabled}
                                                        className="data-[state=checked]:bg-indigo-600 border-slate-300"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {showTimeline && (
                                <div className="space-y-3">
                                    <h3 className="text-slate-700 text-[11px] font-bold uppercase tracking-wide px-4 flex items-center gap-2 border-b border-slate-200 pb-1.5">
                                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> Live Entities
                                    </h3>
                                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        <AnimatePresence mode="popLayout">
                                            {liveFaces.length > 0 ? liveFaces.map((face, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    onClick={() => setSelectedFace(face)}
                                                    className={`p-3 bg-white border rounded-xl flex items-center justify-between group hover:border-indigo-300 transition-all cursor-pointer shadow-sm ${selectedFace?.identity?.userId === face.identity?.userId ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-200/60 hover:shadow-md'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative">
                                                            <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-200 group-hover:scale-105 transition-transform">
                                                                <User className="w-5 h-5 text-indigo-500" />
                                                            </div>
                                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-lg border border-slate-200 flex items-center justify-center">
                                                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <div className="text-slate-900 font-bold text-sm tracking-tight mb-1">
                                                                {face.identity?.name || `Subject #${face.track_id || i}`}
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <div className="text-[10px] font-bold uppercase flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md border border-indigo-100">
                                                                    ID: {face.track_id || '??'} | {face.age || 0}f
                                                                </div>
                                                                {face.demographics && (
                                                                    <div className="text-slate-500 text-[10px] font-bold uppercase flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                                                                        {face.demographics.gender.charAt(0)} | {face.demographics.age}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {!face.identity?.userId && mode === 'live' && (
                                                            <Button size="icon" variant="ghost" className="w-8 h-8 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100" onClick={(e) => { e.stopPropagation(); openRegistration(i); }}>
                                                                <Save className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )) : (
                                                <div className="p-8 border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-500 gap-3 bg-slate-50/50">
                                                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                                        <ScanText className="w-4 h-4 opacity-40" />
                                                    </div>
                                                    <span className="text-xs font-semibold uppercase tracking-wide">
                                                        {!isDetectionEnabled ? "Suspended" : "Awaiting uplink"}
                                                    </span>
                                                </div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    <h3 className="text-slate-700 text-[11px] font-bold uppercase tracking-wide px-4 flex items-center gap-2 border-b border-slate-200 pb-1.5 mt-6">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Detected Objects
                                    </h3>
                                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        <AnimatePresence mode="popLayout">
                                            {holisticData.objects.length > 0 ? holisticData.objects.map((obj, i) => (
                                                <motion.div
                                                    key={obj.track_id || i}
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="p-3 bg-white border border-slate-200/60 rounded-xl flex items-center justify-between group hover:border-emerald-300 transition-all shadow-sm"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-200 group-hover:scale-105 transition-transform">
                                                            <Target className="w-5 h-5 text-emerald-500" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <div className="text-slate-900 font-bold text-sm tracking-tight mb-1">
                                                                {obj.identity?.name || obj.label}
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <div className="text-[10px] font-bold uppercase flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md border border-emerald-100">
                                                                    ID: {obj.track_id || '??'} | {Math.round(obj.confidence * 100)}%
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {!obj.identity?.name && obj.embedding?.length > 0 && (
                                                            <Button size="icon" variant="ghost" className="w-8 h-8 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-100" onClick={(e) => { e.stopPropagation(); openObjectRegistration(obj); }}>
                                                                <Save className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )) : (
                                                <div className="p-4 text-center text-[10px] text-slate-400 font-medium uppercase tracking-widest">No objects detected</div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            )}

                        </div>
                    )}

                    {/* Right Panel: Visualization */}
                    <div
                        ref={containerRef}
                        className={`${isEmbedded ? 'col-span-full h-full' : 'lg:col-span-8'} relative min-h-[320px] lg:min-h-0 ${!isEmbedded && 'lg:aspect-video'} bg-slate-900 ${isEmbedded ? 'rounded-none border-none' : 'rounded-2xl border border-slate-200 shadow-md'} overflow-hidden group/main`}
                    >
                        {/* Feed Status Overlay */}
                        {!isEmbedded && (
                            <div className="absolute top-5 left-5 z-20 flex items-center gap-3">
                                <div className="px-3 py-1.5 bg-white/90 backdrop-blur-xl rounded-lg border border-slate-200 flex items-center gap-3 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_4px_rgba(99,102,241,0.6)]" />
                                        <span className="text-[10px] font-bold text-slate-700 tracking-wide uppercase">Live Feed</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {mode === "image" ? (
                            <div className={`w-full h-full p-6 bg-slate-50 ${(() => {
                                const hasMesh = detectionModes.includes('mesh');
                                const hasHands = isHandTrackingEnabled;
                                if (hasMesh && hasHands) return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 overflow-y-auto lg:overflow-hidden';
                                if (hasHands) return 'grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto md:overflow-hidden';
                                if (hasMesh) return 'grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto md:overflow-hidden';
                                return 'flex items-center justify-center';
                            })()}`}>
                                <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                                    {previewUrl ? (
                                        <div className="relative inline-block max-w-full max-h-full transition-transform duration-700 hover:scale-[1.005]">
                                            <img
                                                src={previewUrl}
                                                onLoad={(e) => setImageSize({ width: e.target.clientWidth, height: e.target.clientHeight })}
                                                className="rounded-xl max-h-[65vh] object-contain shadow-lg border border-slate-200"
                                            />
                                            <Overlays faces={liveFaces} parentSize={imageSize} onFaceClick={setSelectedFace} selectedFace={selectedFace} onRegister={openObjectRegistration} />
                                            {isEmbedded && (
                                                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-50 flex gap-2.5">
                                                    <Button
                                                        onClick={() => document.getElementById('embedded-upload').click()}
                                                        className="h-9 bg-white/90 hover:bg-white text-slate-700 backdrop-blur-xl border border-slate-200 font-semibold text-[11px] rounded-lg px-4 flex items-center gap-2 transition-all shadow-sm"
                                                    >
                                                        <Upload className="w-3.5 h-3.5" /> Change Source
                                                    </Button>
                                                    <Button
                                                        onClick={handleDetect}
                                                        disabled={isLoading}
                                                        className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] rounded-lg px-5 flex items-center gap-2 transition-all shadow-sm"
                                                    >
                                                        {isLoading ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : <ScanText className="w-3.5 h-3.5" />} Analyze
                                                    </Button>
                                                    <input id="embedded-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="relative group cursor-pointer" onClick={() => document.getElementById('embedded-upload-init').click()}>
                                                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center group-hover:border-indigo-300 transition-all shadow-sm">
                                                    <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-500" />
                                                </div>
                                                <input id="embedded-upload-init" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                            </div>
                                            <div className="text-center">
                                                <p className="font-semibold text-xs text-slate-700">Ready for Analysis</p>
                                                <p className="text-[10px] font-medium text-slate-500 mt-1">Upload visual dataset</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {detectionModes.includes('mesh') && (
                                    <div className="w-full h-full rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-900">
                                        <TechnicalMeshView meshData={holisticData?.mesh} />
                                    </div>
                                )}
                                {isHandTrackingEnabled && (
                                    <>
                                        <div className="w-full h-full rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-900 order-first">
                                            <TechnicalHandView
                                                handData={holisticData?.hands?.find(h => h.hand === 'Left' || h.hand === 'left')}
                                                side="left"
                                            />
                                        </div>
                                        <div className="w-full h-full rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-900">
                                            <TechnicalHandView
                                                handData={holisticData?.hands?.find(h => h.hand === 'Right' || h.hand === 'right')}
                                                side="right"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className={`w-full h-full bg-slate-100 relative ${(() => {
                                const hasMesh = detectionModes.includes('mesh');
                                const hasHands = isHandTrackingEnabled;
                                if (hasMesh && hasHands) return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 overflow-y-auto lg:overflow-hidden';
                                if (hasHands) return 'grid grid-cols-1 md:grid-cols-3 overflow-y-auto md:overflow-hidden';
                                if (hasMesh) return 'grid grid-cols-1 md:grid-cols-2 overflow-y-auto md:overflow-hidden';
                                return 'flex items-center justify-center';
                            })()}`}>
                                <div className="relative w-full aspect-video md:h-full flex items-center justify-center overflow-hidden bg-slate-900 rounded-2xl md:rounded-none">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        onLoadedMetadata={(e) => setImageSize({ width: e.target.videoWidth, height: e.target.videoHeight })}
                                        className="w-full h-full object-cover opacity-90 transition-all duration-1000"
                                    />
                                    <canvas ref={canvasRef} className="hidden" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent pointer-events-none" />
                                    {isDetectionEnabled && (
                                        <Overlays
                                            faces={liveFaces}
                                            holisticData={holisticData}
                                            parentSize={imageSize}
                                            isLive
                                            onFaceClick={setSelectedFace}
                                            selectedFace={selectedFace}
                                            bodyTrackingMode={bodyTrackingMode}
                                            isObjectDetectionEnabled={isObjectDetectionEnabled}
                                            isHandTrackingEnabled={isHandTrackingEnabled}
                                            detectionModes={detectionModes}
                                            onRegister={openObjectRegistration}
                                        />
                                    )}

                                    {/* Shutter Settings Button - Triggers Global Modal */}
                                    {!isEmbedded && mode === "live" && (
                                        <div className="absolute bottom-6 right-6 z-30">
                                            <Button
                                                size="icon"
                                                onClick={() => dispatch(openSettings())}
                                                className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-2xl border border-white/20 shadow-2xl flex items-center justify-center group transition-all duration-500 hover:scale-110 active:scale-95"
                                            >
                                                <Aperture className="w-7 h-7 text-white/80 group-hover:text-white group-hover:rotate-90 transition-all duration-700" />
                                            </Button>
                                        </div>
                                    )}

                                </div>
                                {detectionModes.includes('mesh') && (
                                    <div className="w-full h-full border-l border-white/5 bg-slate-900">
                                        <TechnicalMeshView meshData={holisticData?.mesh} />
                                    </div>
                                )}
                                {isHandTrackingEnabled && (
                                    <>
                                        <div className="w-full h-full border-r border-white/5 bg-slate-900 order-first">
                                            <TechnicalHandView
                                                handData={holisticData?.hands?.find(h => h.hand === 'Left' || h.hand === 'left')}
                                                side="left"
                                            />
                                        </div>
                                        <div className={`w-full h-full border-l border-white/5 bg-slate-900 ${detectionModes.includes('mesh') ? 'order-last' : ''}`}>
                                            <TechnicalHandView
                                                handData={holisticData?.hands?.find(h => h.hand === 'Right' || h.hand === 'right')}
                                                side="right"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Face Detail Card Overlay - Premium Glass-Obsidian Redesign */}
                        <AnimatePresence>
                            {selectedFace && (
                                <motion.div
                                    initial={{ opacity: 0, x: 40, filter: "blur(10px)" }}
                                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                                    exit={{ opacity: 0, x: 40, filter: "blur(10px)" }}
                                    transition={{ type: "spring", damping: 25, stiffness: 120 }}
                                    className={`absolute z-50 pointer-events-auto transition-all duration-500
                                        ${imageSize.width < 450
                                            ? 'right-2 top-2 bottom-2 w-[240px]'
                                            : imageSize.width < 700
                                                ? 'right-4 top-4 bottom-4 w-[280px]'
                                                : 'right-6 top-6 bottom-6 w-[340px]'}`}
                                >
                                    <Card className={`h-full bg-slate-900/90 backdrop-blur-3xl border border-white/10 overflow-hidden flex flex-col shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)]
                                        ${imageSize.width < 450 ? 'rounded-2xl' : 'rounded-[2rem]'}`}>
                                        {/* Dynamic Header with Ambient Glow */}
                                        <div className={`relative px-6 ${imageSize.width < 450 ? 'pt-4 pb-3' : 'pt-8 pb-6'}`}>
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-indigo-500/20 rounded-full blur-[60px] pointer-events-none" />

                                            <div className="flex justify-between items-start relative z-10">
                                                <Badge variant="outline" className={`bg-indigo-500/10 border-indigo-400/20 text-indigo-300 font-bold uppercase tracking-[0.15em] px-3 py-1 rounded-full backdrop-blur-md
                                                    ${imageSize.width < 450 ? 'text-[8px]' : 'text-[10px]'}`}>
                                                    Intelligence
                                                </Badge>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setSelectedFace(null)}
                                                    className="rounded-full w-8 h-8 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all border border-white/5"
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>

                                            <div className={`flex flex-col items-center gap-5 ${imageSize.width < 450 ? 'mt-4' : 'mt-8'}`}>
                                                <div className="relative group">
                                                    <div className="absolute inset-0 bg-indigo-500 rounded-3xl blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
                                                    <div className={`rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center border-2 border-white/10 shadow-2xl relative overflow-hidden group-hover:scale-105 transition-transform duration-500
                                                        ${imageSize.width < 450 ? 'w-16 h-16' : 'w-24 h-24'}`}>
                                                        <User className={`${imageSize.width < 450 ? 'w-8 h-8' : 'w-12 h-12'} text-indigo-400`} />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                    <div className={`absolute -bottom-2 -right-2 bg-emerald-500 rounded-xl flex items-center justify-center border-4 border-slate-900 shadow-lg
                                                        ${imageSize.width < 450 ? 'w-6 h-6' : 'w-8 h-8'}`}>
                                                        <ShieldCheck className={`${imageSize.width < 450 ? 'w-3 h-3' : 'w-4 h-4'} text-white`} />
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5 text-center">
                                                    <h3 className={`font-black text-white tracking-tight leading-none drop-shadow-sm truncate max-w-full
                                                        ${imageSize.width < 450 ? 'text-lg' : 'text-2xl'}`}>
                                                        {selectedFace.identity?.name || "Unknown Operator"}
                                                    </h3>
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Fingerprint className="w-3.5 h-3.5 text-indigo-400/60" />
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{selectedFace.track_id}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Core Analytics Scrollable Area */}
                                        <div className={`flex-1 overflow-y-auto space-y-6 custom-scrollbar ${imageSize.width < 450 ? 'px-4 py-3' : 'px-6 py-4'}`}>
                                            {/* Primary Metrics Grid */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <motion.div
                                                    whileHover={{ y: -2 }}
                                                    className={`${imageSize.width < 450 ? 'p-3' : 'p-4'} bg-white/[0.03] border border-white/5 rounded-2xl space-y-3 hover:bg-white/[0.05] transition-colors`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Target className="w-3 h-3 text-indigo-400" />
                                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Match</span>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className={`${imageSize.width < 450 ? 'text-lg' : 'text-xl'} font-black text-white`}>{Math.round(selectedFace.confidence * 100)}<span className="text-xs text-indigo-400/60 ml-1">%</span></div>
                                                        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${selectedFace.confidence * 100}%` }}
                                                                className="h-full bg-gradient-to-r from-indigo-500 to-blue-400"
                                                            />
                                                        </div>
                                                    </div>
                                                </motion.div>

                                                <motion.div
                                                    whileHover={{ y: -2 }}
                                                    className={`${imageSize.width < 450 ? 'p-3' : 'p-4'} bg-white/[0.03] border border-white/5 rounded-2xl space-y-3 hover:bg-white/[0.05] transition-colors`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Heart className="w-3 h-3 text-emerald-400" />
                                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">State</span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className={`${imageSize.width < 450 ? 'text-sm' : 'text-xl'} font-black text-emerald-400 truncate tracking-tight uppercase`}>
                                                            {selectedFace.emotions?.dominant || "Stable"}
                                                        </div>
                                                        <div className="text-[9px] font-bold text-slate-500">Valence</div>
                                                    </div>
                                                </motion.div>
                                            </div>

                                            {/* Tactical Dossier Section */}
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-px flex-1 bg-white/5" />
                                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">Bio-Telemetry</span>
                                                    <div className="h-px flex-1 bg-white/5" />
                                                </div>

                                                <div className="space-y-2">
                                                    {[
                                                        {
                                                            label: "Gender Profile",
                                                            value: selectedFace.identity?.gender || selectedFace.demographics?.gender || "Analyzing",
                                                            icon: User
                                                        },
                                                        {
                                                            label: "Chronological",
                                                            value: (() => {
                                                                if (selectedFace.identity?.dateOfBirth) {
                                                                    const dob = new Date(selectedFace.identity.dateOfBirth);
                                                                    const today = new Date();
                                                                    let age = today.getFullYear() - dob.getFullYear();
                                                                    const m = today.getMonth() - dob.getMonth();
                                                                    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
                                                                        age--;
                                                                    }
                                                                    return `${age}Y (Verified)`;
                                                                }
                                                                return selectedFace.demographics
                                                                    ? `${selectedFace.demographics.age}Y (Est)`
                                                                    : "Calc";
                                                            })(),
                                                            icon: Activity
                                                        },
                                                        {
                                                            label: "Signature",
                                                            value: selectedFace.track_id ? `H-${selectedFace.track_id.padStart(4, '0')}` : "None",
                                                            icon: BrainCircuit
                                                        }
                                                    ].map((item, idx) => (
                                                        <div key={idx} className={`${imageSize.width < 450 ? 'p-2.5' : 'p-3.5'} bg-white/[0.02] border border-white/5 rounded-xl group hover:border-white/10 transition-all flex items-center justify-between`}>
                                                            <div className="flex items-center gap-2">
                                                                <item.icon className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{item.label}</span>
                                                            </div>
                                                            <span className={`${imageSize.width < 450 ? 'text-[10px]' : 'text-xs'} font-bold text-white tracking-wide`}>{item.value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Hardware Verification */}
                                            <div className={`${imageSize.width < 450 ? 'p-3' : 'p-4'} bg-indigo-500/5 border border-indigo-500/10 rounded-2xl space-y-2 relative overflow-hidden group`}>
                                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                                    <Cpu className="w-8 h-8 text-indigo-400" />
                                                </div>
                                                <div className="flex justify-between items-center relative z-10">
                                                    <span className="text-[9px] font-black text-indigo-400/80 uppercase tracking-widest">Liveness</span>
                                                    <span className="text-[10px] font-black text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-md">
                                                        {Math.round((selectedFace.demographics?.livenessScore || 0.98) * 100)}%
                                                    </span>
                                                </div>
                                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative z-10">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${(selectedFace.demographics?.livenessScore || 0.98) * 100}%` }}
                                                        className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                                                    />
                                                </div>
                                                {imageSize.width >= 450 && (
                                                    <p className="text-[9px] text-slate-500 font-medium relative z-10">
                                                        Biometric markers indicate authentic biological presence.
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Strategic Footer Action */}
                                        <div className={`${imageSize.width < 450 ? 'p-4' : 'p-6'} bg-slate-900 border-t border-white/5 shrink-0`}>
                                            <Button className={`w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.15em] rounded-xl shadow-[0_8px_24px_-8px_rgba(79,70,229,0.5)] transition-all hover:scale-[1.02] active:scale-[0.98] group
                                                ${imageSize.width < 450 ? 'h-10 text-[9px]' : 'h-12 text-[11px]'}`}>
                                                <Zap className={`${imageSize.width < 450 ? 'w-3 h-3' : 'w-3.5 h-3.5'} mr-2 text-indigo-200 group-hover:animate-pulse`} />
                                                {imageSize.width < 450 ? 'Dossier' : 'Access Operator Dossier'}
                                                <ChevronRight className="w-4 h-4 ml-2 opacity-60 group-hover:translate-x-1 transition-transform" />
                                            </Button>
                                        </div>
                                    </Card>
                                </motion.div>
                            )}
                        </AnimatePresence>

                    </div>
                </main>
            </div>

            {/* Face Registration Dialog - Light Theme */}
            <Dialog open={isRegisterModalOpen} onOpenChange={setIsRegisterModalOpen}>
                <DialogContent className="bg-white border-slate-200 text-slate-900 rounded-2xl max-w-sm shadow-2xl p-0 border overflow-hidden">
                    <div className="p-6 border-b border-slate-100 text-center flex flex-col items-center">
                        <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center mb-4">
                            <Save className="w-6 h-6 text-indigo-600" />
                        </div>
                        <DialogTitle className="text-xl font-bold mb-1">Entity Registration</DialogTitle>
                        <DialogDescription className="text-slate-500 text-xs font-medium">Create persistent identity record</DialogDescription>
                    </div>

                    <div className="p-6 space-y-5">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider ml-1">Subject Name</Label>
                            <Input
                                value={registrationData.name}
                                onChange={(e) => setRegistrationData({ ...registrationData, name: e.target.value })}
                                placeholder="Enter name..."
                                className="bg-slate-50 border-slate-200 h-12 rounded-xl focus:ring-indigo-500 text-sm font-semibold"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Button variant="ghost" onClick={() => setIsRegisterModalOpen(false)} className="h-11 text-slate-500 hover:text-slate-700 hover:bg-slate-100 font-semibold text-xs rounded-lg">
                                Cancel
                            </Button>
                            <Button
                                onClick={handleRegister}
                                disabled={isRegistering || !registrationData.name}
                                className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-all"
                            >
                                {isRegistering ? <Loader2 className="animate-spin w-4 h-4" /> : "Save Identity"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Object Registration Dialog */}
            <Dialog open={isObjectRegisterModalOpen} onOpenChange={setIsObjectRegisterModalOpen}>
                <DialogContent className="bg-white border-slate-200 text-slate-900 rounded-2xl max-w-sm shadow-2xl p-0 border overflow-hidden">
                    <div className="p-6 border-b border-slate-100 text-center flex flex-col items-center">
                        <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center mb-4">
                            <Target className="w-6 h-6 text-emerald-600" />
                        </div>
                        <DialogTitle className="text-xl font-bold mb-1">Object Registration</DialogTitle>
                        <DialogDescription className="text-slate-500 text-xs font-medium">Register "{objectRegistrationData.category}" for recognition</DialogDescription>
                    </div>

                    <div className="p-6 space-y-5">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider ml-1">Object Name</Label>
                            <Input
                                value={objectRegistrationData.name}
                                onChange={(e) => setObjectRegistrationData({ ...objectRegistrationData, name: e.target.value })}
                                placeholder="e.g. My Phone, Office Keys..."
                                className="bg-slate-50 border-slate-200 h-12 rounded-xl focus:ring-emerald-500 text-sm font-semibold"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Button variant="ghost" onClick={() => setIsObjectRegisterModalOpen(false)} className="h-11 text-slate-500 hover:text-slate-700 hover:bg-slate-100 font-semibold text-xs rounded-lg">
                                Cancel
                            </Button>
                            <Button
                                onClick={handleRegisterObject}
                                disabled={isObjectRegistering || !objectRegistrationData.name}
                                className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-all"
                            >
                                {isObjectRegistering ? <Loader2 className="animate-spin w-4 h-4" /> : "Register Object"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

const Overlays = ({ faces, holisticData, parentSize, isLive, onFaceClick, selectedFace, bodyTrackingMode, isObjectDetectionEnabled, isHandTrackingEnabled, detectionModes = [], onRegister }) => {
    if (!parentSize.width) return null;

    const containerClasses = "absolute inset-0 pointer-events-none overflow-hidden";

    // Landmark connections for rendering
    const POSE_CONNECTIONS = [
        [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // Shoulders/Arms
        [15, 17], [15, 19], [15, 21], [17, 19],           // Left Hand
        [16, 18], [16, 20], [16, 22], [18, 20],           // Right Hand
        [11, 23], [12, 24], [23, 24],                     // Torso
        [23, 25], [25, 27], [24, 26], [26, 28],           // Legs
        [27, 29], [29, 31], [31, 27],                     // Left Foot
        [28, 30], [30, 32], [32, 28]                      // Right Foot
    ];

    const HAND_CONNECTIONS = [
        [0, 1], [1, 2], [2, 3], [3, 4],    // Thumb
        [0, 5], [5, 6], [6, 7], [7, 8],    // Index
        [0, 9], [9, 10], [10, 11], [11, 12], // Middle
        [0, 13], [13, 14], [14, 15], [15, 16], // Ring
        [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
        [5, 9], [9, 13], [13, 17]          // Palm
    ];

    // 0. Matching Logic: Pair faces with meshes based on centroid distance
    const matchedMeshes = holisticData?.mesh?.map(mesh => {
        if (!mesh || !mesh.landmarks) return null;

        const meshCentroid = mesh.metrics?.center_norm ? {
            x: mesh.metrics.center_norm[0],
            y: mesh.metrics.center_norm[1]
        } : {
            x: mesh.landmarks.reduce((sum, l) => sum + l.x, 0) / mesh.landmarks.length,
            y: mesh.landmarks.reduce((sum, l) => sum + l.y, 0) / mesh.landmarks.length
        };

        // Find best face match
        let bestFace = null;
        let minDist = 0.15; // Max threshold for pairing

        faces.forEach(face => {
            const faceCentroid = {
                x: face.xmin + face.width / 2,
                y: face.ymin + face.height / 2
            };
            const dist = Math.sqrt(Math.pow(meshCentroid.x - faceCentroid.x, 2) + Math.pow(meshCentroid.y - faceCentroid.y, 2));
            if (dist < minDist) {
                minDist = dist;
                bestFace = face;
            }
        });

        return { mesh, face: bestFace };
    }).filter(Boolean);

    return (
        <div className={containerClasses}>
            {/* 1. Body Pose Skeleton */}
            {detectionModes.includes('body') && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {holisticData?.pose?.map((p, pIdx) => (
                        <g key={`pose-${pIdx}`} className="opacity-70">
                            {/* Connections */}
                            {POSE_CONNECTIONS.map(([i, j], connIdx) => {
                                const lm1 = p.landmarks[i];
                                const lm2 = p.landmarks[j];
                                if (lm1 && lm2 && lm1.visibility > 0.4 && lm2.visibility > 0.4) {
                                    return (
                                        <line
                                            key={`conn-${connIdx}`}
                                            x1={`${lm1.x * 100}%`}
                                            y1={`${lm1.y * 100}%`}
                                            x2={`${lm2.x * 100}%`}
                                            y2={`${lm2.y * 100}%`}
                                            stroke="#6366f1"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            className="transition-all duration-300"
                                        />
                                    );
                                }
                                return null;
                            })}

                            {/* Joints */}
                            {p.landmarks.map((lm, lmIdx) => (
                                lm.visibility > 0.4 && (
                                    <circle
                                        key={`lm-${lmIdx}`}
                                        cx={`${lm.x * 100}%`}
                                        cy={`${lm.y * 100}%`}
                                        r="2"
                                        fill="#4f46e5"
                                        className="animate-pulse"
                                    />
                                )
                            ))}

                            {/* Body Center Crosshair */}
                            {p.metrics?.center_norm && (
                                <g className="text-white">
                                    <line
                                        x1={`${p.metrics.center_norm[0] * 100 - 1.5}%`} y1={`${p.metrics.center_norm[1] * 100}%`}
                                        x2={`${p.metrics.center_norm[0] * 100 + 1.5}%`} y2={`${p.metrics.center_norm[1] * 100}%`}
                                        stroke="currentColor" strokeWidth="1"
                                    />
                                    <line
                                        x1={`${p.metrics.center_norm[0] * 100}%`} y1={`${p.metrics.center_norm[1] * 100 - 1.5}%`}
                                        x2={`${p.metrics.center_norm[0] * 100}%`} y2={`${p.metrics.center_norm[1] * 100 + 1.5}%`}
                                        stroke="currentColor" strokeWidth="1"
                                    />
                                </g>
                            )}

                            {/* Pose Metrics HUD */}
                            {p.metrics?.center_norm && (
                                <g transform={`translate(${p.metrics.center_norm[0] * parentSize.width}, ${p.metrics.center_norm[1] * parentSize.height + 25})`}>
                                    <rect x="-40" y="-12" width="80" height="24" rx="4" fill="rgba(15, 23, 42, 0.6)" className="backdrop-blur-sm" />
                                    <text fill="#fff" fontSize="9" fontWeight="bold" textAnchor="middle">
                                        V: {p.metrics.velocity.toFixed(1)}px | W: {Math.round(p.metrics.shoulder_width)}px
                                    </text>
                                </g>
                            )}
                        </g>
                    ))}
                </svg>
            )}

            {/* 2. Hand Landmarks & Skeleton */}
            {(detectionModes.includes('hand') || isHandTrackingEnabled) && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {holisticData?.hands?.map((h, hIdx) => (
                        <g key={`hand-${hIdx}`} className="opacity-80">
                            {/* Hand Connections */}
                            {HAND_CONNECTIONS.map(([i, j], connIdx) => {
                                const lm1 = h.landmarks[i];
                                const lm2 = h.landmarks[j];
                                if (lm1 && lm2) {
                                    const x1 = lm1.x_norm !== undefined ? lm1.x_norm * 100 : (lm1.x / parentSize.width) * 100;
                                    const y1 = lm1.y_norm !== undefined ? lm1.y_norm * 100 : (lm1.y / parentSize.height) * 100;
                                    const x2 = lm2.x_norm !== undefined ? lm2.x_norm * 100 : (lm2.x / parentSize.width) * 100;
                                    const y2 = lm2.y_norm !== undefined ? lm2.y_norm * 100 : (lm2.y / parentSize.height) * 100;

                                    return (
                                        <line
                                            key={`h-conn-${connIdx}`}
                                            x1={`${x1}%`}
                                            y1={`${y1}%`}
                                            x2={`${x2}%`}
                                            y2={`${y2}%`}
                                            stroke="#818cf8"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                        />
                                    );
                                }
                                return null;
                            })}

                            {/* Hand Joints */}
                            {h.landmarks.map((lm, lmIdx) => {
                                const cx = lm.x_norm !== undefined ? lm.x_norm * 100 : (lm.x / parentSize.width) * 100;
                                const cy = lm.y_norm !== undefined ? lm.y_norm * 100 : (lm.y / parentSize.height) * 100;
                                return (
                                    <circle
                                        key={`h-lm-${lmIdx}`}
                                        cx={`${cx}%`}
                                        cy={`${cy}%`}
                                        r="2.5"
                                        fill="#4f46e5"
                                        stroke="#fff"
                                        strokeWidth="0.5"
                                    />
                                );
                            })}

                            {/* Gesture Label */}
                            {h.landmarks[8] && (
                                <text
                                    x={`${(h.landmarks[8].x_norm !== undefined ? h.landmarks[8].x_norm : h.landmarks[8].x / parentSize.width) * 100}%`}
                                    y={`${(h.landmarks[8].y_norm !== undefined ? h.landmarks[8].y_norm : h.landmarks[8].y / parentSize.height) * 100 - 2}%`}
                                    fill="#fff"
                                    fontSize="12"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                    className="drop-shadow-md"
                                >
                                    {h.gesture} {h.gesture_confidence ? `(${h.gesture_confidence})` : ''}
                                </text>
                            )}
                        </g>
                    ))}
                </svg>
            )}

            {/* 3. Face Mesh - Technical Depth Style */}
            {detectionModes.includes('mesh') && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {holisticData?.mesh?.map((m, mIdx) => (
                        <g key={`mesh-${mIdx}`} className="opacity-40">
                            {m.landmarks.map((lm, lmIdx) => {
                                // Subset for facial structure
                                const isCore = (lmIdx % 8 === 0) || (lmIdx >= 133 && lmIdx <= 163) || (lmIdx >= 362 && lmIdx <= 398);
                                if (isCore) {
                                    return (
                                        <circle
                                            key={`m-lm-${lmIdx}`}
                                            cx={`${lm.x * 100}%`}
                                            cy={`${lm.y * 100}%`}
                                            r="0.5"
                                            fill="#64748b"
                                        />
                                    );
                                }
                                return null;
                            })}
                        </g>
                    ))}
                </svg>
            )}

            {/* 4. Mesh HUD Telemetry - Forehead/Cheek Labels */}
            {detectionModes.includes('face') && matchedMeshes.map(({ mesh, face }, mIdx) => {
                if (!face) return null;
                const forehead = mesh.landmarks[10];
                const leftCheek = mesh.landmarks[234];
                const rightCheek = mesh.landmarks[454];

                /* Use metrics center for positioning if available, else fall back to forehead landmark */
                const pos = mesh.metrics?.center_norm ? { x: mesh.metrics.center_norm[0], y: mesh.metrics.center_norm[1] } : { x: forehead.x, y: forehead.y };

                return (
                    <React.Fragment key={`telemetry-${mIdx}`}>
                        {/* Forehead: Name + Emotion */}
                        <motion.div
                            className="absolute pointer-events-none flex flex-col items-center z-10"
                            style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100 - 15}%` }}
                        >
                            <span className="text-[10px] font-semibold text-indigo-700 bg-white/90 px-2 py-1 rounded-md border border-indigo-100 shadow-sm whitespace-nowrap flex flex-col items-center">
                                <span>{face.identity?.name || "Subject"} • {face.emotions?.dominant || "Stable"}</span>
                                <span className="text-[8px] text-slate-500 mt-0.5 font-mono">
                                    Y: {mesh.metrics?.rotation?.yaw?.toFixed(1) || 0}° | P: {mesh.metrics?.rotation?.pitch?.toFixed(1) || 0}° | D: {Math.round(mesh.metrics?.eye_distance * 100 || 0)}mm
                                </span>
                            </span>
                        </motion.div>

                        {/* Left Cheek: Age */}
                        <motion.div
                            className="absolute pointer-events-none z-10"
                            style={{ left: `${leftCheek.x * 100 - 1}%`, top: `${leftCheek.y * 100}%` }}
                        >
                            <div className="flex items-center gap-1.5 -translate-x-full">
                                <span className="text-[9px] font-semibold text-slate-600 bg-white/90 px-1.5 py-0.5 rounded border border-slate-200">
                                    Age {face.demographics?.age || "??"}
                                </span>
                                <div className="w-2 h-[1px] bg-indigo-300" />
                            </div>
                        </motion.div>

                        {/* Right Cheek: Confidence */}
                        <motion.div
                            className="absolute pointer-events-none z-10"
                            style={{ left: `${rightCheek.x * 100 + 1}%`, top: `${rightCheek.y * 100}%` }}
                        >
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-[1px] bg-indigo-300" />
                                <span className="text-[9px] font-semibold text-emerald-700 bg-white/90 px-1.5 py-0.5 rounded border border-emerald-100">
                                    {Math.round(face.confidence * 100)}% Match
                                </span>
                            </div>
                        </motion.div>
                    </React.Fragment>
                );
            })}

            {/* 4.5. Trajectory History */}
            {detectionModes.includes('face') && <TrajectoryOverlay faces={faces} />}


            {/* 5. Face Bounding Boxes */}
            {detectionModes.includes('face') && faces.map((face) => (
                <FaceBox
                    key={face.track_id}
                    face={face}
                    isSelected={selectedFace?.track_id === face.track_id}
                    onClick={(f) => onFaceClick && onFaceClick(f)}
                />
            ))}

            {/* 6. Object & Body Bounding Boxes */}
            {holisticData?.objects?.map((obj, i) => (
                <ObjectBox
                    key={obj.track_id || i}
                    obj={obj}
                    isObjectDetectionEnabled={isObjectDetectionEnabled}
                    detectionModes={detectionModes}
                    bodyTrackingMode={bodyTrackingMode}
                    onRegister={onRegister}
                />
            ))}
        </div >
    );
};

export default FaceDetection;
