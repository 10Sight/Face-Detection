import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Peer from 'peerjs';
import { Camera, Video, AlertCircle, Loader2, Wifi, WifiOff } from 'lucide-react';
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
        <div className="fixed inset-0 bg-black text-white flex flex-col items-center justify-center p-6 font-sans">
            <div className="w-full max-w-sm space-y-8 text-center">
                <div className="space-y-2">
                    <div className="flex justify-center mb-4">
                        <div className={`p-4 rounded-3xl ${status === 'streaming' ? 'bg-blue-600 animate-pulse' : 'bg-zinc-800'} border border-white/10`}>
                            {status === 'streaming' ? <Video className="w-10 h-10" /> : <Camera className="w-10 h-10 text-zinc-500" />}
                        </div>
                    </div>
                    <h1 className="text-3xl font-black tracking-tighter uppercase">Remote <span className="text-blue-500">Uplink</span></h1>
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Neural Surveillance Node v1.0</p>
                </div>

                <div className="relative aspect-video bg-zinc-900 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover grayscale opacity-50" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                        {status === 'idle' && (
                            <div className="text-center space-y-4">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Ready for handoff</span>
                                <Button
                                    onClick={startStreaming}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs h-12 px-8 rounded-2xl"
                                >
                                    Initiate Stream
                                </Button>
                            </div>
                        )}
                        {status === 'connecting' && (
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Establishing Neural Tunnel...</span>
                            </div>
                        )}
                        {status === 'streaming' && (
                            <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-blue-500/50">
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Live Uplink</span>
                            </div>
                        )}
                    </div>

                    {/* Visual Grids */}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                </div>

                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-left">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                        <span className="text-[10px] font-bold text-red-400 uppercase tracking-tight leading-tight">{error}</span>
                    </div>
                )}

                <div className="pt-4 space-y-4">
                    <div className="flex items-center justify-between px-6 py-4 bg-white/[0.03] border border-white/5 rounded-2xl">
                        <div className="text-left">
                            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Session Status</p>
                            <p className="text-xs font-bold text-white capitalize">{status}</p>
                        </div>
                        {status === 'streaming' ? <Wifi className="w-5 h-5 text-blue-500" /> : <WifiOff className="w-5 h-5 text-zinc-700" />}
                    </div>

                    {status === 'streaming' && (
                        <Button
                            onClick={stopStreaming}
                            variant="ghost"
                            className="text-red-500 font-bold uppercase tracking-widest text-[10px] hover:bg-red-500/10"
                        >
                            Deactivate Link
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RemoteCapture;
