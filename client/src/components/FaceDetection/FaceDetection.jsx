import React, { useState, useRef, useEffect, useCallback } from "react";
import { useDetectFaceMutation, useRegisterFaceMutation } from "../../store/api/faceApi";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Loader2, Upload, User, AlertCircle, Camera, Video, Image as ImageIcon, ScanText, BrainCircuit, Activity, Heart, Save } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { motion, AnimatePresence } from "framer-motion";

const FaceDetection = ({ isEmbedded = false, detectionInterval = 500, externalStream = null }) => {
    const [mode, setMode] = useState("live");
    const [selectedImage, setSelectedImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [detectFace, { isLoading, data: detectionData, error }] = useDetectFaceMutation();
    const [registerFace, { isLoading: isRegistering }] = useRegisterFaceMutation();

    const [liveFaces, setLiveFaces] = useState([]);
    const [registrationData, setRegistrationData] = useState({ name: "", blob: null });
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

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
        }
        return () => !externalStream && stopCamera();
    }, [mode, externalStream]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720, facingMode: "user" }
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

    const captureFrame = useCallback(async () => {
        if (mode !== "live" || !videoRef.current || !canvasRef.current || isLoading) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(async (blob) => {
            if (blob) {
                const formData = new FormData();
                formData.append("file", blob, "frame.jpg");
                try {
                    const result = await detectFace({ formData }).unwrap();
                    // Debug: console.log("Live Detection Result:", result);
                    const faces = result?.data?.faces || result?.faces || [];
                    setLiveFaces(faces);
                } catch (err) {
                    console.error("Live detection frame error:", err);
                }
            }
        }, "image/jpeg", 0.7);
    }, [mode, detectFace, isLoading]);

    useEffect(() => {
        let interval;
        if (mode === "live") {
            interval = setInterval(captureFrame, detectionInterval);
        }
        return () => clearInterval(interval);
    }, [mode, captureFrame]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedImage(file);
            setPreviewUrl(URL.createObjectURL(file));
            setLiveFaces([]);
        }
    };

    const handleDetect = async () => {
        if (!selectedImage) return;
        const formData = new FormData();
        formData.append("file", selectedImage);
        try {
            const result = await detectFace({ formData, params: { is_static: true } }).unwrap();
            // Debug: console.log("Static Detection Result:", result);
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

        // Capture specific face from current view
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
            setRegistrationData({ ...registrationData, blob });
            setIsRegisterModalOpen(true);
        }, "image/jpeg", 0.9);
    };

    return (
        <div className={`flex flex-col min-h-0 ${isEmbedded ? 'p-0 h-full w-full' : 'p-4 sm:p-6 lg:p-8'}`}>
            <div className={`w-full ${isEmbedded ? 'space-y-0 h-full' : 'space-y-8 lg:space-y-12'}`}>
                {/* Header Section - Software Style */}
                {!isEmbedded && (
                    <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 lg:gap-8 border-b border-white/[0.03] pb-8 lg:pb-10">
                        <div className="space-y-1">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-2"
                            >
                                <BrainCircuit className="w-4 h-4 text-blue-500" />
                                <h2 className="text-zinc-500 font-bold tracking-[0.2em] text-[10px] uppercase">Service: Bio-Inference V4</h2>
                            </motion.div>
                            <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white">
                                VISION<span className="text-zinc-800 italic ml-2">WORKSPACE</span>
                            </h1>
                        </div>

                        <div className="flex items-center gap-4 sm:gap-6 bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 p-2 rounded-2xl">
                            <div className="flex bg-black/40 p-1 rounded-xl">
                                <button
                                    onClick={() => setMode("image")}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'image' ? 'bg-zinc-800 text-white shadow-xl' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    <ImageIcon className="w-4 h-4" /> STATIC
                                </button>
                                <button
                                    onClick={() => setMode("live")}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'live' ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    <Video className="w-4 h-4" /> LIVE
                                </button>
                            </div>
                        </div>
                    </header>
                )}

                <main className={isEmbedded ? "relative h-full w-full" : "grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 min-h-0"}>
                    {/* Embedded Mode Switcher */}
                    {isEmbedded && (
                        <div className="absolute top-4 right-4 z-50 flex bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/10 scale-90 origin-top-right">
                            <button
                                onClick={() => setMode("image")}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${mode === 'image' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                <ImageIcon className="w-3.5 h-3.5" /> STATIC
                            </button>
                            <button
                                onClick={() => setMode("live")}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${mode === 'live' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                <Video className="w-3.5 h-3.5" /> LIVE
                            </button>
                        </div>
                    )}
                    {/* Left Panel: Controls & Data */}
                    {!isEmbedded && (
                        <div className="lg:col-span-4 space-y-8">
                            <Card className="bg-zinc-900/60 backdrop-blur-xl border-zinc-800/50 rounded-[2rem] overflow-hidden">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-zinc-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                        <Activity className="w-3 h-3 text-blue-500" /> Operations
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {mode === "image" ? (
                                        <div className="space-y-4">
                                            <div className="relative group rounded-2xl border-2 border-dashed border-zinc-800 hover:border-blue-500/50 transition-all cursor-pointer overflow-hidden aspect-video bg-black/40">
                                                <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 z-10 cursor-pointer" />
                                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                                                    {previewUrl ? (
                                                        <img src={previewUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                                                    ) : (
                                                        <div className="p-4 bg-zinc-800/50 rounded-full">
                                                            <Upload className="w-6 h-6 text-zinc-500" />
                                                        </div>
                                                    )}
                                                    <span className="text-sm font-medium text-zinc-500">Drop analysis target</span>
                                                </div>
                                            </div>
                                            <Button onClick={handleDetect} disabled={!selectedImage || isLoading} className="w-full h-14 bg-white hover:bg-zinc-200 text-black font-bold text-lg rounded-2xl transition-all active:scale-[0.98]">
                                                {isLoading ? <Loader2 className="animate-spin" /> : "EXECUTE INFERENCE"}
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between p-4 bg-black/40 border border-zinc-800 rounded-2xl">
                                                <div className="space-y-1">
                                                    <div className="text-xs font-bold text-zinc-500 uppercase tracking-tighter">Capture Stream</div>
                                                    <div className="text-sm font-bold text-green-500 flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> 1080P ACTIVE
                                                    </div>
                                                </div>
                                                <Camera className="w-5 h-5 text-zinc-600" />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="p-4 bg-black/40 border border-zinc-800 rounded-2xl text-center">
                                                    <div className="text-[10px] font-bold text-zinc-500 uppercase">FPS</div>
                                                    <div className="text-xl font-black text-white">4.2</div>
                                                </div>
                                                <div className="p-4 bg-black/40 border border-zinc-800 rounded-2xl text-center">
                                                    <div className="text-[10px] font-bold text-zinc-500 uppercase">Jitter</div>
                                                    <div className="text-xl font-black text-white">12ms</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <div className="space-y-4">
                                <h3 className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] px-2">Neural Output</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    <AnimatePresence mode="popLayout">
                                        {liveFaces.length > 0 ? liveFaces.map((face, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-5 bg-zinc-900/40 border border-zinc-800/50 rounded-3xl flex items-center justify-between group hover:bg-zinc-800/40 transition-all"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
                                                        <User className="w-6 h-6 text-blue-500" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <div className="text-white font-bold text-lg leading-none mb-1">
                                                            {face.identity?.name || `Entity ${i}`}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <div className="text-zinc-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 bg-white/[0.03] px-2 py-0.5 rounded-md">
                                                                <Heart className="w-2.5 h-2.5 text-red-500/60" />
                                                                {face.emotions?.dominant || "Analyzing..."}
                                                            </div>
                                                            {face.demographics && (
                                                                <div className="text-blue-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded-md">
                                                                    {face.demographics.gender} | {face.demographics.age}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                {!face.identity?.userId && mode === 'live' && (
                                                    <Button size="icon" variant="ghost" className="rounded-xl opacity-0 group-hover:opacity-100 hover:bg-zinc-800" onClick={() => openRegistration(i)}>
                                                        <Save className="w-4 h-4 text-zinc-400" />
                                                    </Button>
                                                )}
                                            </motion.div>
                                        )) : (
                                            <div className="p-10 border border-dashed border-zinc-800 rounded-3xl flex flex-col items-center justify-center text-zinc-600 gap-2">
                                                <ScanText className="w-8 h-8 opacity-20" />
                                                <span className="text-xs font-medium uppercase tracking-widest">Awaiting Signal</span>
                                            </div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Right Panel: Visualization */}
                    <div className={`${isEmbedded ? 'col-span-full h-full' : 'lg:col-span-8'} relative min-h-[320px] lg:min-h-0 ${!isEmbedded && 'lg:aspect-video'} bg-black ${isEmbedded ? 'rounded-none border-none' : 'rounded-[2rem] lg:rounded-[3rem] border border-zinc-800 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)]'} overflow-hidden`}>
                        {!isEmbedded && (
                            <div className="absolute top-8 left-8 z-20 flex items-center gap-3">
                                <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-zinc-800 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                                    <span className="text-[10px] font-black text-white uppercase tracking-tighter">Feed Optimized</span>
                                </div>
                            </div>
                        )}

                        {mode === "image" ? (
                            <div className="w-full h-full flex items-center justify-center p-8">
                                {previewUrl ? (
                                    <div className="relative inline-block max-w-full max-h-full">
                                        <img
                                            src={previewUrl}
                                            onLoad={(e) => setImageSize({ width: e.target.clientWidth, height: e.target.clientHeight })}
                                            className="rounded-2xl max-h-[60vh] object-contain shadow-2xl"
                                        />
                                        <Overlays faces={liveFaces} parentSize={imageSize} />
                                        {isEmbedded && (
                                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-2">
                                                <Button
                                                    onClick={() => document.getElementById('embedded-upload').click()}
                                                    className="h-10 bg-white hover:bg-zinc-200 text-black font-bold text-xs rounded-xl px-4 flex items-center gap-2"
                                                >
                                                    <Upload className="w-4 h-4" /> CHANGE
                                                </Button>
                                                <Button
                                                    onClick={handleDetect}
                                                    disabled={isLoading}
                                                    className="h-10 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl px-4 flex items-center gap-2"
                                                >
                                                    {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <ScanText className="w-4 h-4" />} ANALYZE
                                                </Button>
                                                <input id="embedded-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-4 text-zinc-800">
                                        <div className="relative group cursor-pointer" onClick={() => document.getElementById('embedded-upload-init').click()}>
                                            <div className="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/10 flex items-center justify-center hover:border-blue-500/50 transition-all">
                                                <Upload className="w-8 h-8 text-zinc-600" />
                                            </div>
                                            <input id="embedded-upload-init" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                        </div>
                                        <p className="font-bold text-xs tracking-widest uppercase text-zinc-500">Upload analysis target</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="w-full h-full bg-zinc-950 flex items-center justify-center">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    onLoadedMetadata={(e) => setImageSize({ width: e.target.videoWidth, height: e.target.videoHeight })}
                                    className="w-full h-full object-cover opacity-80"
                                />
                                <canvas ref={canvasRef} className="hidden" />
                                <Overlays faces={liveFaces} parentSize={imageSize} isLive />
                            </div>
                        )}

                        {/* Analysis Grid Overlay */}
                        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
                        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                    </div>
                </main>
            </div>

            {/* Registration Dialog */}
            <Dialog open={isRegisterModalOpen} onOpenChange={setIsRegisterModalOpen}>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-white rounded-3xl max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black italic uppercase">Register Identity</DialogTitle>
                        <p className="text-zinc-500 text-sm">Create a recurring identity profile for the detected face.</p>
                    </DialogHeader>
                    <div className="py-6 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-zinc-500 uppercase">Identity Name</Label>
                            <Input
                                value={registrationData.name}
                                onChange={(e) => setRegistrationData({ ...registrationData, name: e.target.value })}
                                placeholder="e.g. Director Jatin"
                                className="bg-black border-zinc-800 h-12 rounded-xl focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsRegisterModalOpen(false)} className="text-zinc-400 hover:text-white">Abort</Button>
                        <Button
                            onClick={handleRegister}
                            disabled={isRegistering || !registrationData.name}
                            className="bg-blue-600 hover:bg-blue-500 px-8 rounded-xl font-bold"
                        >
                            {isRegistering ? <Loader2 className="animate-spin" /> : "PERSIST DATA"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

const Overlays = ({ faces, parentSize, isLive }) => {
    if (!parentSize.width || !faces.length) return null;

    // Use a simpler approach for container relative positioning if isLive
    const containerClasses = isLive ? "absolute inset-0 overflow-hidden" : "absolute top-0 left-0 w-full h-full pointer-events-none";

    return (
        <div className={containerClasses}>
            {faces.map((face, i) => (
                <motion.div
                    key={i}
                    layoutId={`box-${i}`}
                    className={`absolute border-[3px] rounded-2xl transition-all duration-300 ${face.securityAlert?.type === 'Blacklist'
                        ? 'border-red-600 shadow-[0_0_40px_rgba(220,38,38,0.6)] animate-pulse'
                        : face.securityAlert?.type === 'VIP'
                            ? 'border-amber-400 shadow-[0_0_40px_rgba(251,191,36,0.4)]'
                            : 'border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)]'
                        }`}
                    style={{
                        left: `${face.xmin * 100}%`,
                        top: `${face.ymin * 100}%`,
                        width: `${face.width * 100}%`,
                        height: `${face.height * 100}%`,
                    }}
                >
                    {/* Floating Info Badge */}
                    <div className="absolute -top-16 left-0 min-w-max">
                        {face.securityAlert && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`mb-2 px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${face.securityAlert.type === 'Blacklist'
                                    ? 'bg-red-600/90 border-red-500 text-white shadow-xl'
                                    : 'bg-amber-400/90 border-amber-300 text-black shadow-xl'
                                    }`}
                            >
                                <AlertCircle className="w-3 h-3" />
                                {face.securityAlert.message}
                            </motion.div>
                        )}
                        <div className="bg-black/80 backdrop-blur-xl border border-blue-500/40 px-3 py-1.5 rounded-xl flex items-center gap-3">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-tighter leading-none">
                                    {face.identity?.name || "Tracking..."}
                                </span>
                                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                                    Conf: {Math.round(face.confidence * 100)}%
                                </span>
                            </div>
                            <div className="h-4 w-px bg-zinc-800" />
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black text-red-500 uppercase leading-none">
                                    {face.emotions?.dominant || "Neutral"}
                                </span>
                                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                                    Emotion
                                </span>
                            </div>
                            {face.demographics && (
                                <>
                                    <div className="h-4 w-px bg-zinc-800" />
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] font-black text-blue-400 uppercase leading-none">
                                            {face.demographics.gender}
                                        </span>
                                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                                            {face.demographics.age}
                                        </span>
                                    </div>
                                    <div className="h-4 w-px bg-zinc-800" />
                                    <div className="flex flex-col items-center">
                                        <div className={`w-2 h-2 rounded-full mb-1 ${face.demographics.livenessScore > 0.8 ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                        <span className="text-[7px] font-black text-zinc-500 uppercase">Live</span>
                                    </div>
                                </>
                            )}
                        </div>
                        {/* Connecting Line */}
                        <div className="w-px h-6 bg-blue-500 absolute left-4 -bottom-1" />
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

export default FaceDetection;
