import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Save, Trash2, Plus, MousePointer2, Box } from 'lucide-react';
import { useCreateZoneMutation, useDeleteZoneMutation, useGetZonesQuery } from '../../store/api/zoneApi';
import { toast } from 'react-hot-toast';

const ZoneEditor = ({ cameraId, onClose }) => {
    const { data: zonesData, isLoading } = useGetZonesQuery(cameraId);
    const [createZone] = useCreateZoneMutation();
    const [deleteZone] = useDeleteZoneMutation();

    const [points, setPoints] = useState([]);
    const [name, setName] = useState('');
    const [type, setType] = useState('monitoring');
    const [dwellThreshold, setDwellThreshold] = useState(30);
    const [isDrawing, setIsDrawing] = useState(false);

    const svgRef = useRef(null);

    const handleSvgClick = (e) => {
        if (!isDrawing) return;

        const svg = svgRef.current;
        const rect = svg.getBoundingClientRect();

        // Calculate normalized coordinates (0-1)
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        setPoints([...points, { x: parseFloat(x.toFixed(4)), y: parseFloat(y.toFixed(4)) }]);
    };

    const handleSave = async () => {
        if (!name || points.length < 3) {
            toast.error("Please provide a name and draw at least a triangle.");
            return;
        }

        try {
            await createZone({
                cameraId,
                name,
                type,
                polygon: points,
                dwellThreshold: parseInt(dwellThreshold)
            }).unwrap();

            toast.success("Zone saved successfully");
            setPoints([]);
            setName('');
            setIsDrawing(false);
        } catch (err) {
            toast.error("Failed to save zone: " + err.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Delete this zone?")) {
            try {
                await deleteZone(id).unwrap();
                toast.success("Zone deleted");
            } catch (err) {
                toast.error("Failed to delete zone");
            }
        }
    };

    return (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[100] flex flex-col pointer-events-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
                <div className="flex items-center gap-3">
                    <Box className="w-5 h-5 text-blue-400" />
                    <h3 className="text-white font-medium">Zone Management - {cameraId}</h3>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                </button>
            </div>

            <div className="flex-1 flex min-h-0">
                {/* Drawing Canvas */}
                <div className="flex-1 relative bg-black/20 cursor-crosshair overflow-hidden border-r border-white/5">
                    <svg
                        ref={svgRef}
                        className="w-full h-full absolute inset-0"
                        onClick={handleSvgClick}
                    >
                        {/* Render existing zones */}
                        {zonesData?.data?.map((zone, idx) => (
                            <polygon
                                key={zone._id}
                                points={zone.polygon.map(p => `${p.x * 100}% ${p.y * 100}%`).join(', ')}
                                className={`fill-${zone.type === 'restricted' ? 'red' : 'blue'}-500/20 stroke-${zone.type === 'restricted' ? 'red' : 'blue'}-500 stroke-2`}
                            />
                        ))}

                        {/* Render currently drawing polygon */}
                        {points.length > 0 && (
                            <polyline
                                points={points.map(p => `${p.x * 100}% ${p.y * 100}%`).join(', ')}
                                className="fill-none stroke-yellow-400 stroke-2 stroke-dasharray-4"
                            />
                        )}
                        {points.map((p, idx) => (
                            <circle
                                key={idx}
                                cx={`${p.x * 100}%`}
                                cy={`${p.y * 100}%`}
                                r="4"
                                className="fill-yellow-400"
                            />
                        ))}
                    </svg>

                    {!isDrawing && !points.length && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-black/60 text-white px-4 py-2 rounded-full text-sm border border-white/10">
                                Click "New Zone" to start drawing
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="w-80 bg-black/40 p-4 overflow-y-auto">
                    {!isDrawing ? (
                        <>
                            <button
                                onClick={() => setIsDrawing(true)}
                                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md flex items-center justify-center gap-2 mb-6 transition-colors font-medium shadow-lg shadow-blue-600/20"
                            >
                                <Plus className="w-5 h-5" /> New Zone
                            </button>

                            <div className="space-y-4">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Existing Zones</h4>
                                {zonesData?.data?.length === 0 && <p className="text-gray-500 text-sm italic">No zones defined.</p>}
                                {zonesData?.data?.map((zone) => (
                                    <div key={zone._id} className="bg-white/5 border border-white/10 rounded-lg p-3 group hover:border-white/20 transition-all">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-white font-medium text-sm">{zone.name}</span>
                                            <button
                                                onClick={() => handleDelete(zone._id)}
                                                className="text-gray-500 hover:text-red-400 p-1 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-tight ${zone.type === 'restricted' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                                }`}>
                                                {zone.type}
                                            </span>
                                            <span className="text-[10px] text-gray-500">{zone.dwellThreshold}s dwell</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="space-y-6">
                            <h4 className="text-white font-medium">Define New Zone</h4>

                            <div className="space-y-1.5">
                                <label className="text-xs text-gray-400 uppercase">Zone Name</label>
                                <input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Restricted Exit"
                                    className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 text-sm transition-all"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs text-gray-400 uppercase">Type</label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm transition-all"
                                >
                                    <option value="monitoring">Monitoring</option>
                                    <option value="restricted">Restricted</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs text-gray-400 uppercase">Dwell Threshold (s)</label>
                                <input
                                    type="number"
                                    value={dwellThreshold}
                                    onChange={(e) => setDwellThreshold(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm transition-all"
                                />
                            </div>

                            <div className="pt-2 flex flex-col gap-2">
                                <button
                                    onClick={handleSave}
                                    className="w-full py-2 bg-green-600 hover:bg-green-500 text-white rounded-md flex items-center justify-center gap-2 transition-colors font-medium"
                                >
                                    <Save className="w-5 h-5" /> Save Zone
                                </button>
                                <button
                                    onClick={() => {
                                        setIsDrawing(false);
                                        setPoints([]);
                                    }}
                                    className="w-full py-2 bg-white/5 hover:bg-white/10 text-white rounded-md transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                            </div>

                            <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg flex items-start gap-3 mt-4">
                                <MousePointer2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-blue-300 leading-relaxed italic">
                                    Click on the video feed to add points for your polygon. You need at least 3 points to define a zone.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ZoneEditor;
