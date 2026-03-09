import React, { useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';

/**
 * 3D Face Mesh Component using Three.js
 * Renders vertices and high-density line segments for a "Human Preview" look.
 */
const FaceMesh3D = ({ landmarks }) => {
    const pointsRef = useRef();
    const linesRef = useRef();

    // High Density Face Mesh Connections (MediaPipe standard indices)
    // We'll use a dense subset to create the volume
    const faceIndices = useMemo(() => {
        const FACEMESH_TESSELATION = [
            127, 34, 34, 139, 139, 127, 11, 0, 0, 37, 37, 11, 232, 231, 231, 120, 120, 232,
            72, 37, 37, 39, 39, 72, 38, 12, 12, 268, 268, 38, 12, 269, 269, 267, 267, 12,
            365, 367, 367, 439, 439, 365, 376, 352, 352, 440, 440, 376, 411, 427, 427, 434, 434, 411,
            // (Truncated list for brevity, but we'll use a procedural pattern to bridge points)
        ];

        // Procedurally generate a dense technical mesh structure
        const connections = [];
        for (let i = 0; i < 468; i++) {
            // Horizontal connections
            if (i % 30 !== 29 && i + 1 < 468) connections.push(i, i + 1);
            // Vertical connections
            if (i + 30 < 468) connections.push(i, i + 30);
            // Diagonal/Structural
            if (i % 50 === 0 && i + 100 < 468) connections.push(i, i + 100);
        }

        // Feature Specific Loops (Eyes/Lips)
        const featureLoops = [
            [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246, 33], // Left Eye
            [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466, 263], // Right Eye
            [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 61], // Lips
        ];
        featureLoops.forEach(loop => {
            for (let i = 0; i < loop.length - 1; i++) connections.push(loop[i], loop[i + 1]);
        });

        return new Uint16Array(connections);
    }, []);

    const positions = useMemo(() => new Float32Array(468 * 3), []);

    // Stable Centering for non-frame-loop elements
    const { centerX, centerY, scale } = useMemo(() => {
        if (!landmarks || landmarks.length === 0) return { centerX: 0.5, centerY: 0.5, scale: 1 };
        let minX = 1, maxX = 0, minY = 1, maxY = 0;
        landmarks.forEach(lm => {
            if (lm.x < minX) minX = lm.x; if (lm.x > maxX) maxX = lm.x;
            if (lm.y < minY) minY = lm.y; if (lm.y > maxY) maxY = lm.y;
        });
        return {
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2,
            scale: 5.5 / Math.max(maxX - minX, maxY - minY)
        };
    }, [landmarks]);

    useFrame(() => {
        if (!landmarks || landmarks.length === 0) return;

        landmarks.forEach((lm, i) => {
            if (i >= 468) return;
            // Map to Three.js space: Mirror X, Invert Y, Zoom Z
            positions[i * 3] = (centerX - lm.x) * scale;
            positions[i * 3 + 1] = (centerY - lm.y) * scale;
            positions[i * 3 + 2] = -lm.z * scale * 1.5; // Exaggerate Z for 3D feel
        });

        if (pointsRef.current) pointsRef.current.geometry.attributes.position.needsUpdate = true;
        if (linesRef.current) linesRef.current.geometry.attributes.position.needsUpdate = true;
    });

    return (
        <group>
            {/* 1. Technical Nodes (Vertices) */}
            <Points ref={pointsRef}>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" count={468} array={positions} itemSize={3} />
                </bufferGeometry>
                <PointMaterial transparent color="#22d3ee" size={0.06} sizeAttenuation={true} depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.8} />
            </Points>

            {/* 2. Structured Joints (Line Segments) */}
            <lineSegments ref={linesRef}>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" count={468} array={positions} itemSize={3} />
                    <bufferAttribute attach="index" count={faceIndices.length} array={faceIndices} itemSize={1} />
                </bufferGeometry>
                <lineBasicMaterial transparent color="#818cf8" opacity={0.25} linewidth={1} blending={THREE.AdditiveBlending} />
            </lineSegments>

            {/* Highlight Irises */}
            {landmarks[468] && (
                <mesh position={[(centerX - landmarks[468].x) * scale, (centerY - landmarks[468].y) * scale, -landmarks[468].z * scale * 1.5]}>
                    <sphereGeometry args={[0.04, 16, 16]} />
                    <meshBasicMaterial color="#ef4444" transparent opacity={0.6} />
                </mesh>
            )}
            {landmarks[473] && (
                <mesh position={[(centerX - landmarks[473].x) * scale, (centerY - landmarks[473].y) * scale, -landmarks[473].z * scale * 1.5]}>
                    <sphereGeometry args={[0.04, 16, 16]} />
                    <meshBasicMaterial color="#ef4444" transparent opacity={0.6} />
                </mesh>
            )}
        </group>
    );
};

// Container with HUD Overlays
const TechnicalMeshView = ({ meshData, fps = 60 }) => {
    const mesh = meshData?.[0];
    const landmarks = mesh?.landmarks || [];
    const metrics = mesh?.metrics || {};
    const rotation = metrics.rotation || { yaw: 0, pitch: 0, roll: 0 };
    const blendshapes = mesh?.blendshapes || {};

    const smileScore = blendshapes['mouthSmileLeft'] || (blendshapes['Smile'] || 0.1);

    return (
        <div className="relative w-full h-full bg-[#0a0c10] overflow-hidden flex items-center justify-center font-mono select-none border-l border-white/5 shadow-2xl">
            {/* Radar Background Layers */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                <div className="w-[500px] h-[500px] rounded-full border border-cyan-500/20" />
                <div className="w-[400px] h-[400px] rounded-full border border-cyan-500/10" />
                <div className="w-[300px] h-[300px] rounded-full border border-cyan-500/5" />
                <div className="absolute w-full h-px bg-cyan-400/10" />
                <div className="absolute h-full w-px bg-cyan-400/10" />
            </div>

            {/* Three.js Canvas */}
            <div className="w-full h-full cursor-grab active:cursor-grabbing">
                <Canvas gl={{ antialias: true }} dpr={[1, 2]}>
                    <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={35} />
                    <OrbitControls enableZoom={false} enablePan={false} />
                    <ambientLight intensity={0.4} />
                    <pointLight position={[10, 10, 10]} intensity={1} color="#22d3ee" />
                    <FaceMesh3D landmarks={landmarks} />
                    <gridHelper args={[20, 20]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -5]}>
                        <meshBasicMaterial transparent color="#22d3ee" opacity={0.03} />
                    </gridHelper>
                </Canvas>
            </div>

            {/* Technical HUD Overlays */}
            <div className="absolute top-8 left-8 space-y-3">
                <AngleStatus label="YAW" value={rotation.yaw} />
                <AngleStatus label="PITCH" value={rotation.pitch} />
                <AngleStatus label="ROLL" value={rotation.roll} />
            </div>

            <div className="absolute top-8 right-8">
                <div className="bg-slate-900/70 backdrop-blur-xl border border-white/5 rounded-2xl p-4 w-52 shadow-2xl">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase">[SM-ACC]</span>
                        <span className="text-cyan-400 text-xs font-black">{(smileScore * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex items-end gap-[2px] h-10">
                        {[...Array(16)].map((_, i) => (
                            <motion.div
                                key={i}
                                animate={{ height: `${20 + Math.random() * 80 * smileScore}%` }}
                                className="flex-1 bg-gradient-to-t from-indigo-500 to-cyan-400 rounded-t-[1px]"
                            />
                        ))}
                    </div>
                </div>
            </div>

            <div className="absolute bottom-8 left-8 bg-black/40 backdrop-blur-md rounded-xl p-3 border border-white/5 shadow-xl">
                <div className="flex justify-between w-40 text-[10px] font-bold border-b border-white/5 pb-1 mb-1">
                    <span className="text-zinc-500 uppercase">Track ID</span>
                    <span className="text-cyan-400">FX-{mesh?.track_id || '741'}</span>
                </div>
                <div className="flex justify-between w-40 text-[10px] font-bold">
                    <span className="text-zinc-500 uppercase">FPS</span>
                    <span className="text-emerald-400">{fps}</span>
                </div>
            </div>

            <div className="absolute bottom-8 right-8 text-right opacity-40 font-black tracking-[0.4em] uppercase text-[9px] text-zinc-600">
                10Sight Tech Simulation Layer
            </div>
        </div>
    );
};

const AngleStatus = ({ label, value }) => (
    <div className="flex items-center gap-4 bg-slate-900/60 backdrop-blur-lg border border-white/5 rounded-lg px-3 py-1.5 w-44 shadow-lg transition-transform hover:scale-105">
        <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
        <span className="text-[10px] font-black text-zinc-300 tracking-tight">[{label}: {value > 0 ? '+' : ''}{value.toFixed(1)}°]</span>
    </div>
);

export default TechnicalMeshView;
