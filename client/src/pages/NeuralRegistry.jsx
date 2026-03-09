import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Search, Filter, ShieldCheck,
    ShieldAlert, Star, Trash2, Edit3,
    MoreVertical, Info, Save, X,
    Plus, Upload, Loader2, Database,
    Activity, Shield, UserCheck, MapPin,
    Camera, RefreshCcw, FlipHorizontal, CheckCircle2,
    Target
} from 'lucide-react';
import {
    useGetAllIdentitiesQuery,
    useRegisterFaceMutation,
    useUpdateIdentityMutation,
    useDeleteIdentityMutation
} from '../store/api/analyticsApi';
import {
    useRegisterObjectMutation,
    useRegisterObjectFromImageMutation,
    useGetAllObjectsQuery,
    useDeleteObjectMutation
} from '../store/api/objectApi';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

const NeuralRegistry = () => {
    const { data, isLoading, isFetching, refetch } = useGetAllIdentitiesQuery();
    const [updateIdentity] = useUpdateIdentityMutation();
    const [deleteIdentity] = useDeleteIdentityMutation();
    const [registerFace, { isLoading: isRegistering }] = useRegisterFaceMutation();

    // Object API Hooks
    const { data: objectData, isLoading: isObjectLoading, isFetching: isObjectFetching } = useGetAllObjectsQuery();
    const [registerObject] = useRegisterObjectMutation();
    const [registerObjectFromImage, { isLoading: isObjectRegistering }] = useRegisterObjectFromImageMutation();
    const [deleteObject] = useDeleteObjectMutation();

    const [activeTab, setActiveTab] = useState('biometric');

    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', dateOfBirth: '', gender: '', watchlist: { type: 'Staff', severity: 'Medium' } });

    // Registration Modal State
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [registerForm, setRegisterForm] = useState({
        name: '',
        image: null,
        watchlistType: 'Staff',
        severity: 'Medium',
        dateOfBirth: '',
        gender: ''
    });
    const [previewImage, setPreviewImage] = useState(null);

    // Object Registration State
    const [showObjectRegisterModal, setShowObjectRegisterModal] = useState(false);
    const [objectRegisterForm, setObjectRegisterForm] = useState({
        name: '',
        category: '',
        image: null
    });
    const [objectPreviewImage, setObjectPreviewImage] = useState(null);

    // Camera Integration State
    const [isCameraMode, setIsCameraMode] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const videoRef = React.useRef(null);
    const streamRef = React.useRef(null);

    // FIX: Bind stream to video element when they both become available
    React.useEffect(() => {
        if (isStreaming && streamRef.current && videoRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [isStreaming, isCameraMode]);

    const identities = data?.data || [];
    const filteredIdentities = identities.filter(id =>
        id.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Stats Calculation
    const stats = {
        total: identities.length,
        vips: identities.filter(id => id.watchlist?.type === 'VIP').length,
        watchlist: identities.filter(id => id.watchlist?.type === 'Blacklist' || id.watchlist?.type === 'Unauthorized').length,
        staff: identities.filter(id => id.watchlist?.type === 'Staff').length
    };

    const handleEdit = (id) => {
        setEditingId(id._id);
        setEditForm({
            name: id.name,
            dateOfBirth: id.dateOfBirth || '',
            gender: id.gender || '',
            watchlist: id.watchlist || { type: 'Staff', severity: 'Medium', notes: '' }
        });
    };

    const handleSave = async (id) => {
        await updateIdentity({ id, data: editForm });
        setEditingId(null);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Purge this identity from Neural Database?")) {
            await deleteIdentity(id);
        }
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        if (!registerForm.image || !registerForm.name) return;

        const formData = new FormData();
        formData.append('file', registerForm.image);
        formData.append('name', registerForm.name);
        formData.append('watchlistType', registerForm.watchlistType);
        formData.append('severity', registerForm.severity);
        if (registerForm.dateOfBirth) formData.append('dateOfBirth', registerForm.dateOfBirth);
        if (registerForm.gender) formData.append('gender', registerForm.gender);

        try {
            await registerFace(formData).unwrap();
            setShowRegisterModal(false);
            setRegisterForm({ name: '', image: null, watchlistType: 'Staff', severity: 'Medium', dateOfBirth: '', gender: '' });
            setPreviewImage(null);
        } catch (err) {
            console.error("Registration failed:", err);
            alert("Registration failed. Please ensure a clear face is visible.");
        }
    };

    const handleObjectRegisterSubmit = async (e) => {
        e.preventDefault();
        if (!objectRegisterForm.image || !objectRegisterForm.name || !objectRegisterForm.category) return;

        const formData = new FormData();
        formData.append('file', objectRegisterForm.image);
        formData.append('name', objectRegisterForm.name);
        formData.append('category', objectRegisterForm.category);

        try {
            await registerObjectFromImage(formData).unwrap();
            setShowObjectRegisterModal(false);
            setObjectRegisterForm({ name: '', category: '', image: null });
            setObjectPreviewImage(null);
        } catch (err) {
            console.error("Object registration failed:", err);
            alert("Object registration failed. Please ensure the object is clearly visible in the image.");
        }
    };

    const handleObjectDelete = async (id) => {
        if (window.confirm("Purge this object from Neural Database?")) {
            await deleteObject(id);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setRegisterForm({ ...registerForm, image: file });
            setPreviewImage(URL.createObjectURL(file));
            setIsCameraMode(false);
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720, facingMode: 'user' }
            });
            streamRef.current = stream;
            setIsCameraMode(true);
            setIsStreaming(true);
        } catch (err) {
            console.error("Camera access failed:", err);
            alert("Could not access camera. Please check permissions.");
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsStreaming(false);
    };

    const capturePhoto = () => {
        if (!videoRef.current) return;

        const video = videoRef.current;
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const context = canvas.getContext("2d");
        // Flip horizontal for natural mirror feel if it's the front camera
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
            const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
            setRegisterForm({ ...registerForm, image: file });
            setPreviewImage(URL.createObjectURL(file));
            stopCamera();
            setIsCameraMode(false);
        }, "image/jpeg", 0.95);
    };

    const toggleCameraMode = () => {
        if (!isCameraMode) {
            startCamera();
        } else {
            stopCamera();
            setIsCameraMode(false);
        }
    };

    // Close modal extension to stop camera
    const handleModalOpenChange = (open) => {
        if (!open) stopCamera();
        setShowRegisterModal(open);
    };

    return (
        <div className="page-shell space-y-6 lg:space-y-8 flex flex-col h-full overflow-hidden">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 shrink-0">
                <div className="min-w-0">
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight uppercase mb-2">
                        Neural <span className="text-indigo-600">Registry</span>
                    </h1>
                    <div className="text-slate-500 font-semibold tracking-wide uppercase text-xs flex items-center gap-2 flex-wrap">
                        <Users className="w-3.5 h-3.5 text-indigo-500" />
                        Biometric Identity Core & Security Clearance
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 sm:gap-4 self-start xl:self-auto">
                    <div className="flex items-center gap-3 px-4 py-2 bg-white border border-slate-200 rounded-xl min-w-[240px] shadow-sm">
                        <Search className="w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search identities..."
                            className="bg-transparent text-[10px] font-bold uppercase tracking-widest outline-none w-full text-slate-900 placeholder:text-slate-300"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button
                        onClick={() => activeTab === 'biometric' ? setShowRegisterModal(true) : setShowObjectRegisterModal(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-widest text-[10px] h-11 px-6 rounded-xl shadow-lg shadow-indigo-500/20"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        {activeTab === 'biometric' ? 'Register Identity' : 'Register Object'}
                    </Button>
                </div>
            </div>

            {/* Tab Switcher */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-slate-100 p-1 rounded-xl mb-4">
                    <TabsTrigger value="biometric" className="px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm">
                        <Users className="w-3.5 h-3.5 mr-2" />
                        Biometric Registry
                    </TabsTrigger>
                    <TabsTrigger value="objects" className="px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm">
                        <Target className="w-3.5 h-3.5 mr-2" />
                        Object Registry
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="biometric" className="space-y-6">
                    {/* Stats Quickbar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
                        <StatItem label="Total Registry" value={stats.total} icon={<Database className="w-4 h-4" />} color="blue" />
                        <StatItem label="VIP Access" value={stats.vips} icon={<Star className="w-4 h-4" />} color="amber" />
                        <StatItem label="Watchlist" value={stats.watchlist} icon={<ShieldAlert className="w-4 h-4" />} color="red" />
                        <StatItem label="Authorized Personnel" value={stats.staff} icon={<UserCheck className="w-4 h-4" />} color="emerald" />
                    </div>

                    {/* Main Table Workspace */}
                    <div className="flex-1 bg-white border border-slate-200/60 rounded-2xl overflow-hidden flex flex-col min-h-[500px] shadow-lg relative">
                        {/* Analysis Grid Decoration */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50/50 z-10">
                            <div className="col-span-1 italic">Index</div>
                            <div className="col-span-4 lg:col-span-4">Biometric Profile</div>
                            <div className="col-span-3 lg:col-span-3">Security Tier</div>
                            <div className="col-span-3 lg:col-span-3">Registry Temporal</div>
                            <div className="col-span-1 text-right">Ops</div>
                        </div>

                        {/* Scrollable Body */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
                            <AnimatePresence mode="wait">
                                {isLoading || isFetching ? (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="h-full flex items-center justify-center flex-col gap-4 py-20"
                                    >
                                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Querying Biometric Core...</span>
                                    </motion.div>
                                ) : filteredIdentities.length > 0 ? (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="divide-y divide-slate-100"
                                    >
                                        {filteredIdentities.map((id, i) => (
                                            <motion.div
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.03 }}
                                                key={id._id}
                                                className="grid grid-cols-12 gap-4 px-8 py-5 items-center hover:bg-slate-50/50 transition-all group border-l-4 border-transparent hover:border-indigo-500"
                                            >
                                                <div className="col-span-1 font-mono text-[10px] text-slate-300">#{id._id.slice(-4).toUpperCase()}</div>
                                                <div className="col-span-4 lg:col-span-4 flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 relative overflow-hidden group-hover:border-indigo-500/30 transition-colors shadow-sm">
                                                        <Users className="w-5 h-5 text-slate-400" />
                                                        <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        {editingId === id._id ? (
                                                            <div className="flex gap-2 items-center">
                                                                <input
                                                                    className="bg-white border border-slate-300 rounded-lg px-3 py-1 text-sm text-slate-900 outline-none focus:border-indigo-500 shadow-sm w-32"
                                                                    value={editForm.name}
                                                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                                    placeholder="Name"
                                                                    autoFocus
                                                                />
                                                                <input
                                                                    type="date"
                                                                    className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900 outline-none focus:border-indigo-500 shadow-sm w-28"
                                                                    value={editForm.dateOfBirth}
                                                                    onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                                                                />
                                                                <select
                                                                    className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900 outline-none focus:border-indigo-500 shadow-sm"
                                                                    value={editForm.gender}
                                                                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                                                                >
                                                                    <option value="">Gender</option>
                                                                    <option value="Male">Male</option>
                                                                    <option value="Female">Female</option>
                                                                    <option value="Other">Other</option>
                                                                </select>
                                                            </div>
                                                        ) : (
                                                            <span className="text-base font-bold text-slate-900 tracking-tight leading-none group-hover:text-indigo-600 transition-colors">{id.name}</span>
                                                        )}
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                                            ID: {id._id} • {id.gender || 'Unknown'} • {id.dateOfBirth ? new Date().getFullYear() - new Date(id.dateOfBirth).getFullYear() : '??'}y
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="col-span-3 lg:col-span-3">
                                                    {editingId === id._id ? (
                                                        <select
                                                            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 text-[10px] font-bold uppercase outline-none focus:border-indigo-500 shadow-sm"
                                                            value={editForm.watchlist.type}
                                                            onChange={(e) => setEditForm({
                                                                ...editForm,
                                                                watchlist: { ...editForm.watchlist, type: e.target.value }
                                                            })}
                                                        >
                                                            <option value="Staff">Staff</option>
                                                            <option value="VIP">VIP</option>
                                                            <option value="Blacklist">Blacklist</option>
                                                            <option value="Unauthorized">Unauthorized</option>
                                                        </select>
                                                    ) : (
                                                        <Badge variant="outline" className={`font-bold text-[9px] px-3 py-1 flex items-center gap-2 w-max transition-all rounded-lg uppercase tracking-widest ${id.watchlist?.type === 'Blacklist' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                            id.watchlist?.type === 'VIP' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                                id.watchlist?.type === 'Unauthorized' ? 'bg-rose-50 text-rose-500 border-rose-50' :
                                                                    'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                            }`}>
                                                            {id.watchlist?.type === 'Blacklist' ? <ShieldAlert className="w-3 h-3" /> :
                                                                id.watchlist?.type === 'VIP' ? <Star className="w-3 h-3" /> :
                                                                    id.watchlist?.type === 'Unauthorized' ? <Shield className="w-3 h-3" /> :
                                                                        <ShieldCheck className="w-3 h-3" />}
                                                            {id.watchlist?.type || "Staff"}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="col-span-3 lg:col-span-3 flex flex-col gap-1 text-slate-400">
                                                    <div className="text-[10px] font-mono font-bold tracking-tight text-slate-600">
                                                        {new Date(id.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                    </div>
                                                    <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">
                                                        Linked {new Date(id.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                                <div className="col-span-1 text-right flex justify-end gap-2">
                                                    {editingId === id._id ? (
                                                        <>
                                                            <Button onClick={() => handleSave(id._id)} size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 shadow-sm">
                                                                <Save className="w-4 h-4" />
                                                            </Button>
                                                            <Button onClick={() => setEditingId(null)} size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:bg-slate-50">
                                                                <X className="w-4 h-4" />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Button onClick={() => handleEdit(id)} size="icon" variant="ghost" className="h-9 w-9 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 opacity-0 group-hover:opacity-100 transition-all rounded-xl">
                                                                <Edit3 className="w-4.5 h-4.5" />
                                                            </Button>
                                                            <Button onClick={() => handleDelete(id._id)} size="icon" variant="ghost" className="h-9 w-9 text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all rounded-xl">
                                                                <Trash2 className="w-4.5 h-4.5" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="h-full flex flex-col items-center justify-center text-slate-300 gap-5 py-16"
                                    >
                                        <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                                            <Users className="w-8 h-8 opacity-30" />
                                        </div>
                                        <div className="text-center group">
                                            <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 block mb-1.5">Neural Registry Empty</span>
                                            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Initiate identity uplink to populate registry</span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="objects" className="space-y-6">
                    {/* Object Stats Quickbar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
                        <StatItem label="Total Objects" value={objectData?.data?.length || 0} icon={<Database className="w-4 h-4" />} color="emerald" />
                        <StatItem label="Categories" value={new Set(objectData?.data?.map(o => o.category)).size} icon={<Filter className="w-4 h-4" />} color="blue" />
                        <StatItem label="Active Locks" value={objectData?.data?.length || 0} icon={<Activity className="w-4 h-4" />} color="amber" />
                        <StatItem label="Recognition Ready" value="100%" icon={<ShieldCheck className="w-4 h-4" />} color="emerald" />
                    </div>

                    {/* Object Table Workspace */}
                    <div className="flex-1 bg-white border border-slate-200/60 rounded-2xl overflow-hidden flex flex-col min-h-[500px] shadow-lg relative">
                        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#10b981 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50/50 z-10">
                            <div className="col-span-1 italic">Index</div>
                            <div className="col-span-4">Object Identity</div>
                            <div className="col-span-3">Category Classification</div>
                            <div className="col-span-3">Registry Temporal</div>
                            <div className="col-span-1 text-right">Ops</div>
                        </div>

                        {/* Scrollable Body */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
                            <AnimatePresence mode="wait">
                                {isObjectLoading || isObjectFetching ? (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="h-full flex items-center justify-center flex-col gap-4 py-20"
                                    >
                                        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Querying Object Database...</span>
                                    </motion.div>
                                ) : objectData?.data?.length > 0 ? (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="divide-y divide-slate-100"
                                    >
                                        {objectData.data
                                            .filter(obj => obj.name.toLowerCase().includes(searchTerm.toLowerCase()) || obj.category.toLowerCase().includes(searchTerm.toLowerCase()))
                                            .map((obj, i) => (
                                                <motion.div
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: i * 0.03 }}
                                                    key={obj._id}
                                                    className="grid grid-cols-12 gap-4 px-8 py-5 items-center hover:bg-slate-50/50 transition-all group border-l-4 border-transparent hover:border-emerald-500"
                                                >
                                                    <div className="col-span-1 font-mono text-[10px] text-slate-300">#{obj._id.slice(-4).toUpperCase()}</div>
                                                    <div className="col-span-4 flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 relative overflow-hidden group-hover:border-emerald-500/30 transition-colors shadow-sm">
                                                            <Target className="w-5 h-5 text-slate-400" />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-base font-bold text-slate-900 tracking-tight leading-none group-hover:text-emerald-600 transition-colors">{obj.name}</span>
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                                                REF: {obj._id}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="col-span-3">
                                                        <Badge variant="outline" className="font-bold text-[9px] px-3 py-1 flex items-center gap-2 w-max bg-emerald-50 text-emerald-600 border-emerald-100 uppercase tracking-widest">
                                                            <Filter className="w-3 h-3" />
                                                            {obj.category}
                                                        </Badge>
                                                    </div>
                                                    <div className="col-span-3 flex flex-col gap-1 text-slate-400">
                                                        <div className="text-[10px] font-mono font-bold tracking-tight text-slate-600">
                                                            {new Date(obj.createdAt).toLocaleDateString()}
                                                        </div>
                                                        <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">
                                                            {new Date(obj.createdAt).toLocaleTimeString()}
                                                        </div>
                                                    </div>
                                                    <div className="col-span-1 text-right flex justify-end gap-2">
                                                        <Button onClick={() => handleObjectDelete(obj._id)} size="icon" variant="ghost" className="h-9 w-9 text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all rounded-xl">
                                                            <Trash2 className="w-4.5 h-4.5" />
                                                        </Button>
                                                    </div>
                                                </motion.div>
                                            ))}
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="h-full flex flex-col items-center justify-center text-slate-300 gap-5 py-16"
                                    >
                                        <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                                            <Target className="w-8 h-8 opacity-30" />
                                        </div>
                                        <div className="text-center group">
                                            <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 block mb-1.5">Object Database Empty</span>
                                            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Register objects from Video Feed or Manual Upload</span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Registration Modal - Redesigned */}
            <Dialog open={showRegisterModal} onOpenChange={handleModalOpenChange}>
                <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-md rounded-2xl overflow-hidden shadow-2xl p-0">
                    <DialogHeader className="p-6 pb-0">
                        <DialogTitle className="text-xl font-bold tracking-tight uppercase">Identity <span className="text-indigo-600">Uplink</span></DialogTitle>
                        <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            Register new biometric signature to the neural core
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleRegisterSubmit} className="p-6 space-y-5">
                        <div className="space-y-5">
                            <div className="grid gap-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Identity Signature</Label>
                                <Input
                                    placeholder="Enter full name..."
                                    className="bg-slate-50 border-slate-200 rounded-2xl h-14 px-5 font-bold focus:border-indigo-500/50 transition-all placeholder:text-slate-300 text-slate-900 shadow-sm"
                                    value={registerForm.name}
                                    onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center justify-between px-1">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Biometric Capture</Label>
                                    <button
                                        type="button"
                                        onClick={toggleCameraMode}
                                        className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all border ${isCameraMode
                                            ? 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100'
                                            : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100'
                                            }`}
                                    >
                                        {isCameraMode ? (
                                            <><X className="w-3 h-3" /> Cancel Camera</>
                                        ) : (
                                            <><Camera className="w-3 h-3" /> Live Capture</>
                                        )}
                                    </button>
                                </div>

                                <div className="relative h-64 sm:h-72 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 hover:bg-slate-100/50 transition-all flex flex-col items-center justify-center gap-4 group cursor-pointer overflow-hidden shadow-inner">
                                    {isCameraMode ? (
                                        <div className="absolute inset-0 bg-black flex items-center justify-center">
                                            <video
                                                ref={videoRef}
                                                autoPlay
                                                playsInline
                                                muted
                                                className="w-full h-full object-cover scale-x-[-1]"
                                            />
                                            {/* Flash/Overlay effects */}
                                            <div className="absolute inset-x-8 inset-y-8 border border-white/20 rounded-2xl pointer-events-none">
                                                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/40 rounded-tl-xl" />
                                                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/40 rounded-tr-xl" />
                                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/40 rounded-bl-xl" />
                                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/40 rounded-br-xl" />
                                            </div>

                                            <div className="absolute bottom-6 flex flex-col items-center gap-4 w-full px-8">
                                                <div className="text-[9px] font-bold text-white/60 uppercase tracking-[0.2em] bg-black/40 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/10">
                                                    Align face within biometric guide
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        capturePhoto();
                                                    }}
                                                    className="w-16 h-16 rounded-full bg-white border-4 border-white/30 flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all group/btn"
                                                >
                                                    <div className="w-12 h-12 rounded-full border-2 border-slate-200 group-hover/btn:border-indigo-500 transition-colors" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : previewImage ? (
                                        <div className="relative w-full h-full">
                                            <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-6">
                                                <div className="flex items-center justify-between">
                                                    <Badge className="bg-indigo-500 text-white border-none font-bold text-[9px] uppercase tracking-widest rounded-lg px-3 py-1 animate-pulse">
                                                        Uplink Ready
                                                    </Badge>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPreviewImage(null);
                                                            setRegisterForm({ ...registerForm, image: null });
                                                        }}
                                                        className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-2 rounded-xl text-white transition-colors"
                                                    >
                                                        <RefreshCcw className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            className="w-full h-full flex flex-col items-center justify-center gap-4"
                                            onClick={() => document.getElementById('file-upload').click()}
                                        >
                                            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center group-hover:scale-110 group-hover:border-indigo-500/30 transition-all duration-500">
                                                <Upload className="w-8 h-8 text-slate-300 group-hover:text-indigo-500" />
                                            </div>
                                            <div className="text-center px-8">
                                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Biometric Frame Required</p>
                                                <p className="text-[8px] font-semibold text-slate-300 uppercase mt-2 tracking-widest">Single Front-Facing clear image or live capture</p>
                                            </div>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        id="file-upload"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Date of Birth</Label>
                                    <Input
                                        type="date"
                                        className="bg-slate-50 border-slate-200 rounded-2xl h-14 px-5 font-bold focus:border-indigo-500/50 transition-all text-slate-900 shadow-sm"
                                        value={registerForm.dateOfBirth}
                                        onChange={(e) => setRegisterForm({ ...registerForm, dateOfBirth: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Gender Identity</Label>
                                    <select
                                        className="bg-slate-50 border border-slate-200 rounded-2xl h-14 px-5 text-sm font-bold appearance-none outline-none focus:border-indigo-500/50 transition-all cursor-pointer shadow-sm text-slate-900"
                                        value={registerForm.gender}
                                        onChange={(e) => setRegisterForm({ ...registerForm, gender: e.target.value })}
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Clearance Tier</Label>
                                    <select
                                        className="bg-slate-50 border border-slate-200 rounded-2xl h-14 px-5 text-sm font-bold appearance-none outline-none focus:border-indigo-500/50 transition-all cursor-pointer shadow-sm text-slate-900"
                                        value={registerForm.watchlistType}
                                        onChange={(e) => setRegisterForm({ ...registerForm, watchlistType: e.target.value })}
                                    >
                                        <option value="Staff">Personnel</option>
                                        <option value="VIP">Premium</option>
                                        <option value="Blacklist">Restricted</option>
                                        <option value="Unauthorized">Unverified</option>
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Criticality</Label>
                                    <select
                                        className="bg-slate-50 border border-slate-200 rounded-2xl h-14 px-5 text-sm font-bold appearance-none outline-none focus:border-indigo-500/50 transition-all cursor-pointer shadow-sm text-slate-900"
                                        value={registerForm.severity}
                                        onChange={(e) => setRegisterForm({ ...registerForm, severity: e.target.value })}
                                    >
                                        <option value="Low">Alpha</option>
                                        <option value="Medium">Beta</option>
                                        <option value="High">Gamma</option>
                                        <option value="Critical">Omega</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="pt-2 gap-3">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setShowRegisterModal(false)}
                                className="font-bold uppercase tracking-widest text-[10px] text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl"
                            >
                                Abort
                            </Button>
                            <Button
                                type="submit"
                                disabled={isRegistering || !registerForm.image || !registerForm.name}
                                className="bg-indigo-600 hover:bg-indigo-700 font-bold uppercase tracking-widest text-[10px] h-12 rounded-xl px-8 min-w-[160px] shadow-lg shadow-indigo-500/20"
                            >
                                {isRegistering ? <Loader2 className="w-4 h-4 animate-spin" /> : "Initiate Link"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Object Registration Modal */}
            <Dialog open={showObjectRegisterModal} onOpenChange={setShowObjectRegisterModal}>
                <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-md rounded-2xl overflow-hidden shadow-2xl p-0">
                    <DialogHeader className="p-6 pb-0">
                        <DialogTitle className="text-xl font-bold tracking-tight uppercase">Object <span className="text-emerald-600">Registry</span></DialogTitle>
                        <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            Register new object signature to the neural core
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleObjectRegisterSubmit} className="p-6 space-y-5">
                        <div className="space-y-5">
                            <div className="grid gap-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Object Name</Label>
                                <Input
                                    placeholder="e.g. My Phone, Office Laptop..."
                                    className="bg-slate-50 border-slate-200 rounded-2xl h-14 px-5 font-bold focus:border-emerald-500/50 transition-all placeholder:text-slate-300 text-slate-900 shadow-sm"
                                    value={objectRegisterForm.name}
                                    onChange={(e) => setObjectRegisterForm({ ...objectRegisterForm, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Category Classification</Label>
                                <select
                                    className="bg-slate-50 border border-slate-200 rounded-2xl h-14 px-5 text-sm font-bold appearance-none outline-none focus:border-emerald-500/50 transition-all cursor-pointer shadow-sm text-slate-900"
                                    value={objectRegisterForm.category}
                                    onChange={(e) => setObjectRegisterForm({ ...objectRegisterForm, category: e.target.value })}
                                    required
                                >
                                    <option value="">Select Category</option>
                                    <option value="cell phone">Cell Phone</option>
                                    <option value="laptop">Laptop</option>
                                    <option value="bottle">Bottle</option>
                                    <option value="backpack">Backpack</option>
                                    <option value="umbrella">Umbrella</option>
                                    <option value="handbag">Handbag</option>
                                    <option value="person">Person</option>
                                </select>
                            </div>

                            <div className="grid gap-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Visual Reference</Label>
                                <div
                                    className="relative h-48 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 hover:bg-slate-100/50 transition-all flex flex-col items-center justify-center gap-4 group cursor-pointer overflow-hidden shadow-inner"
                                    onClick={() => document.getElementById('object-file-upload').click()}
                                >
                                    {objectPreviewImage ? (
                                        <img src={objectPreviewImage} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            <Upload className="w-8 h-8 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Upload Image</span>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        id="object-file-upload"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                setObjectRegisterForm({ ...objectRegisterForm, image: file });
                                                setObjectPreviewImage(URL.createObjectURL(file));
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="pt-2 gap-3">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setShowObjectRegisterModal(false)}
                                className="font-bold uppercase tracking-widest text-[10px] text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl"
                            >
                                Abort
                            </Button>
                            <Button
                                type="submit"
                                disabled={isObjectRegistering || !objectRegisterForm.image || !objectRegisterForm.name}
                                className="bg-emerald-600 hover:bg-emerald-700 font-bold uppercase tracking-widest text-[10px] h-12 rounded-xl px-8 min-w-[160px] shadow-lg shadow-emerald-500/20"
                            >
                                {isObjectRegistering ? <Loader2 className="w-4 h-4 animate-spin" /> : "Initiate Uplink"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

const StatItem = ({ label, value, icon, color }) => {
    const colorMap = {
        blue: 'text-indigo-600 bg-indigo-50 border-indigo-100',
        amber: 'text-amber-600 bg-amber-50 border-amber-100',
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        red: 'text-rose-600 bg-rose-50 border-rose-100',
    };

    return (
        <div className="p-5 bg-white border border-slate-200/60 rounded-2xl hover:border-indigo-200 transition-all group overflow-hidden relative shadow-sm">
            <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</div>
                <div className={`p-2 rounded-xl border ${colorMap[color]}`}>
                    {icon}
                </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight relative z-10 leading-none">{value}</div>
            <div className="absolute -bottom-6 -right-6 w-16 h-16 rounded-full bg-slate-50 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity" />
        </div>
    );
};

export default NeuralRegistry;
