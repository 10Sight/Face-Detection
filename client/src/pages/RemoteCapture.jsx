import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Peer from 'peerjs';
import { Camera, Video, AlertCircle, Loader2, Wifi, WifiOff, Globe } from 'lucide-react';
import { Button } from '../components/ui/button';

const RemoteCapture = () => {
    const [searchParams] = useSearchParams();
    const uplinkId = searchParams.get('id');
    const [status, setStatus] = useState('idle'); // idle, connecting, streaming, error
    const [error, setError] = useState(null);
    const videoRef = useRef(null);
    const peerRef = useRef(null);
    const streamRef = useRef(null);

    useEffect(() => {
        if (!uplinkId) {
            setError('Missing Uplink ID. Please scan the QR code again.');
            setStatus('error');
        }
    }, [uplinkId]);

    const startStreaming = async () => {
        setStatus('connecting');
        setError(null);

        try {
            // 1. Get Camera
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: 640, height: 480 },
                audio: false
            });
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;

            // 2. Initialize Peer
            const peer = new Peer();
            peerRef.current = peer;

            peer.on('open', (id) => {
                console.log('My peer ID is: ' + id);
                // 3. Connect to Mission Control
                const call = peer.call(uplinkId, stream);
                setStatus('streaming');

                call.on('close', () => {
                    setStatus('idle');
                    stopStreaming();
                });
            });

            peer.on('error', (err) => {
                console.error('Peer error:', err);
                setError(`Connection failed: ${err.type}`);
                setStatus('error');
            });

        } catch (err) {
            console.error('Streaming error:', err);
            setError('Camera access denied or hardware error.');
            setStatus('error');
        }
    };

    const stopStreaming = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (peerRef.current) {
            peerRef.current.destroy();
        }
        setStatus('idle');
    };

    return (
        <div className="fixed inset-0 bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 font-sans overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            <div className="absolute -top-40 -left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="w-full max-w-sm space-y-10 text-center relative z-10">
                {/* Header */}
                <div className="space-y-4">
                    <div className="flex justify-center">
                        <div className={`p-5 rounded-2xl transition-all duration-700 ${status === 'streaming' ? 'bg-indigo-600 shadow-2xl shadow-indigo-200 scale-110' : 'bg-white shadow-xl shadow-slate-200'} border border-slate-100`}>
                            {status === 'streaming' ?
                                <Video className="w-10 h-10 text-white animate-pulse" /> :
                                <Camera className="w-10 h-10 text-slate-300" />
                            }
                        </div>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight uppercase">Remote <span className="text-indigo-600">Uplink</span></h1>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">Neural Surveillance Node v2.0</p>
                    </div>
                </div>

                {/* Video Preview / State Area */}
                <div className="relative aspect-video bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-2xl shadow-slate-200 group">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover transition-opacity duration-1000 ${status === 'streaming' ? 'opacity-100 grayscale-0' : 'opacity-20 grayscale'}`}
                    />

                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 backdrop-blur-[2px] bg-white/10">
                        {status === 'idle' && (
                            <div className="text-center space-y-6">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Signal Verified</span>
                                    <span className="text-xs font-bold text-slate-600 block">Ready for handoff</span>
                                </div>
                                <Button
                                    onClick={startStreaming}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-widest text-[10px] h-11 px-10 rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                                >
                                    Initiate Stream
                                </Button>
                            </div>
                        )}

                        {status === 'connecting' && (
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative">
                                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                                    <Globe className="w-4 h-4 text-indigo-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Establishing Neural Tunnel...</span>
                            </div>
                        )}

                        {status === 'streaming' && (
                            <div className="absolute top-6 right-6 flex items-center gap-2.5 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-indigo-100">
                                <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-ping" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-900">Live Uplink</span>
                            </div>
                        )}
                    </div>

                    {/* Scanning Line Animation (only when streaming) */}
                    {status === 'streaming' && (
                        <div className="absolute inset-x-0 h-1 bg-indigo-500/30 blur-sm top-0 animate-[scan_2s_ease-in-out_infinite]" />
                    )}
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-4 text-left shadow-sm"
                    >
                        <div className="p-2 bg-rose-100 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                        </div>
                        <span className="text-[10px] font-bold text-rose-600 uppercase tracking-tight leading-relaxed">{error}</span>
                    </motion.div>
                )}

                {/* Session Info */}
                <div className="pt-2 space-y-4">
                    <div className="flex items-center justify-between px-6 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                        <div className="text-left space-y-1">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Node Path</p>
                            <p className="text-sm font-bold text-slate-900 capitalize flex items-center gap-2">
                                {status === 'streaming' ? 'Active Tunnel' : 'Standby Node'}
                                <span className={`w-1.5 h-1.5 rounded-full ${status === 'streaming' ? 'bg-indigo-500' : 'bg-slate-200'}`} />
                            </p>
                        </div>
                        <div className={`p-2.5 rounded-xl ${status === 'streaming' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-300'}`}>
                            {status === 'streaming' ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
                        </div>
                    </div>

                    {status === 'streaming' && (
                        <Button
                            onClick={stopStreaming}
                            variant="ghost"
                            className="text-rose-500 font-bold uppercase tracking-widest text-[10px] hover:bg-rose-50 hover:text-rose-600 w-full h-11 rounded-xl transition-all"
                        >
                            Deactivate Mission Link
                        </Button>
                    )}
                </div>
            </div>

            {/* In-page Styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes scan {
                    0% { top: 0%; }
                    50% { top: 100%; }
                    100% { top: 0%; }
                }
            `}} />
        </div>
    );
};

export default RemoteCapture;
