import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * TechnicalHandView Component
 * Renders a high-fidelity SVG skeleton for a single hand.
 * Supports auto-centering, depth-based scaling, and technical HUD elements.
 */
const TechnicalHandView = ({ handData, side = 'left', fps = 60 }) => {
    const landmarks = handData?.landmarks || [];
    const score = handData?.score || handData?.gesture_confidence || 0;
    const label = handData?.hand || handData?.label || (side === 'left' ? 'Left' : 'Right');

    // Hand Connections (21 Landmarks - MediaPipe Standard)
    const connections = useMemo(() => [
        [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
        [0, 5], [5, 6], [6, 7], [7, 8],       // Index
        [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
        [0, 13], [13, 14], [14, 15], [15, 16], // Ring
        [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
        [5, 9], [9, 13], [13, 17]             // Palm
    ], []);

    // Auto-centering and scaling logic
    const processedLandmarks = useMemo(() => {
        if (!landmarks || landmarks.length === 0) return [];

        let minX = landmarks[0].x, maxX = landmarks[0].x;
        let minY = landmarks[0].y, maxY = landmarks[0].y;

        landmarks.forEach(lm => {
            if (lm.x < minX) minX = lm.x;
            if (lm.x > maxX) maxX = lm.x;
            if (lm.y < minY) minY = lm.y;
            if (lm.y > maxY) maxY = lm.y;
        });

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const scale = 0.6 / Math.max(maxX - minX, maxY - minY || 0.1);

        return landmarks.map(lm => ({
            ...lm,
            drawX: (lm.x - centerX) * scale + 0.5,
            drawY: (lm.y - centerY) * scale + 0.5,
            drawZ: lm.z * scale
        }));
    }, [landmarks]);

    return (
        <div className={`relative w-full h-full bg-[#0a0c10] overflow-hidden flex flex-col items-center justify-center font-mono select-none border-x border-white/5 shadow-2xl`}>
            {/* HUD Header */}
            <div className={`absolute top-6 ${side === 'left' ? 'left-6' : 'right-6'} z-10`}>
                <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md rounded-lg px-3 py-1.5 border border-white/5 shadow-lg">
                    <div className={`w-2 h-2 rounded-full ${score > 0.5 ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                    <span className="text-[10px] font-black text-zinc-400 tracking-[0.2em] uppercase">[{label} Hand: {(score * 100).toFixed(0)}%]</span>
                </div>
            </div>

            {/* Skeleton View */}
            <div className="relative w-full h-full flex items-center justify-center">
                <svg viewBox="0 0 1 1" className="w-[80%] h-[80%] drop-shadow-[0_0_15px_rgba(34,211,238,0.2)] overflow-visible">
                    <defs>
                        <linearGradient id={`${side}-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={side === 'left' ? '#c026d3' : '#22d3ee'} stopOpacity="0.8" />
                            <stop offset="100%" stopColor={side === 'left' ? '#7c3aed' : '#818cf8'} stopOpacity="0.8" />
                        </linearGradient>
                        <filter id="hand-glow">
                            <feGaussianBlur stdDeviation="0.002" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Connections and Joints Group with Filter */}
                    <g filter="url(#hand-glow)">
                        {processedLandmarks.length > 0 && connections.map(([s, e], idx) => {
                            const p1 = processedLandmarks[s];
                            const p2 = processedLandmarks[e];
                            if (!p1 || !p2) return null;

                            const opacity = Math.max(0.2, 0.7 - (p1.drawZ + p2.drawZ) * 2);

                            return (
                                <line
                                    key={`h-conn-${idx}`}
                                    x1={p1.drawX} y1={p1.drawY}
                                    x2={p2.drawX} y2={p2.drawY}
                                    stroke={`url(#${side}-grad)`}
                                    strokeWidth="0.004"
                                    opacity={opacity}
                                    strokeLinecap="round"
                                />
                            );
                        })}

                        {/* Joints */}
                        {processedLandmarks.map((lm, idx) => {
                            const size = 0.006 - lm.drawZ * 0.02;
                            const opacity = Math.max(0.4, 0.9 - lm.drawZ * 4);
                            return (
                                <circle
                                    key={`h-pt-${idx}`}
                                    cx={lm.drawX} cy={lm.drawY}
                                    r={Math.max(0.003, size)}
                                    fill={side === 'left' ? '#d946ef' : '#22d3ee'}
                                    opacity={opacity}
                                />
                            );
                        })}
                    </g>
                </svg>

                {/* Telemetry Corner */}
                <div className={`absolute bottom-6 ${side === 'left' ? 'left-6' : 'right-6'} space-y-1`}>
                    <TelemetryItem label="LANDMARKS" value={landmarks.length || 21} color={side === 'left' ? 'text-fuchsia-400' : 'text-cyan-400'} />
                    <TelemetryItem label="STABILITY" value={`${(score * 100).toFixed(1)}%`} color={side === 'left' ? 'text-fuchsia-400' : 'text-cyan-400'} />
                    <TelemetryRow label="SIM_FPS" value={fps} accent={side === 'left' ? 'text-fuchsia-500' : 'text-cyan-500'} />
                </div>
            </div>

            {/* Scanlines Overlay */}
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:100%_3px]" />
        </div>
    );
};

const TelemetryItem = ({ label, value, color }) => (
    <div className="flex items-center gap-3 bg-black/30 backdrop-blur-md rounded-md px-2 py-1 border border-white/5 shadow-md min-w-[120px]">
        <span className="text-[8px] font-black text-zinc-500 tracking-widest uppercase">{label}</span>
        <span className={`text-[10px] font-bold ${color} ml-auto`}>{value}</span>
    </div>
);

const TelemetryRow = ({ label, value, accent }) => (
    <div className="flex justify-between items-center text-[9px] font-black text-zinc-600 tracking-widest w-full px-1">
        <span>[{label}]</span>
        <span className={accent}>{value}</span>
    </div>
);

export default TechnicalHandView;
