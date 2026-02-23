import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Search, Filter, ShieldCheck,
    ShieldAlert, Star, Trash2, Edit3,
    MoreVertical, Info, Save, X,
    Plus, Upload, Loader2, Database,
    Activity, Shield, UserCheck
} from 'lucide-react';
import {
    useGetAllIdentitiesQuery,
    useRegisterFaceMutation,
    useUpdateIdentityMutation,
    useDeleteIdentityMutation
} from '../store/api/analyticsApi';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';

const NeuralRegistry = () => {
    const { data, isLoading, isFetching, refetch } = useGetAllIdentitiesQuery();
    const [updateIdentity] = useUpdateIdentityMutation();
    const [deleteIdentity] = useDeleteIdentityMutation();
    const [registerFace, { isLoading: isRegistering }] = useRegisterFaceMutation();

    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', watchlist: { type: 'Staff', severity: 'Medium' } });

    // Registration Modal State
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [registerForm, setRegisterForm] = useState({
        name: '',
        image: null,
        watchlistType: 'Staff',
        severity: 'Medium'
    });
    const [previewImage, setPreviewImage] = useState(null);

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

        try {
            await registerFace(formData).unwrap();
            setShowRegisterModal(false);
            setRegisterForm({ name: '', image: null, watchlistType: 'Staff', severity: 'Medium' });
            setPreviewImage(null);
        } catch (err) {
            console.error("Registration failed:", err);
            alert("Registration failed. Please ensure a clear face is visible.");
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setRegisterForm({ ...registerForm, image: file });
            setPreviewImage(URL.createObjectURL(file));
        }
    };

    return (
        <div className="page-shell space-y-6 lg:space-y-8 flex flex-col h-full overflow-hidden">
            {/* Header Area */}
            <div className="surface-card px-4 py-4 sm:px-6 sm:py-5 flex flex-col xl:flex-row xl:justify-between xl:items-end gap-4 shrink-0">
                <div className="min-w-0">
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase mb-2">
                        Neural <span className="text-blue-500">Registry</span>
                    </h1>
                    <div className="text-zinc-500 font-medium tracking-widest uppercase text-xs flex items-center gap-2 flex-wrap">
                        <Users className="w-3 h-3 text-blue-500" />
                        Biometric Identity Core & Security Clearance
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 sm:gap-4 bg-white/[0.03] p-1.5 border border-white/10 rounded-2xl backdrop-blur-3xl self-start xl:self-auto">
                    <div className="flex items-center gap-3 px-4 py-2 bg-black/40 border border-white/5 rounded-xl min-w-[200px]">
                        <Search className="w-4 h-4 text-zinc-600" />
                        <input
                            type="text"
                            placeholder="Search identities..."
                            className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none w-full text-white placeholder:text-zinc-700"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button
                        onClick={() => setShowRegisterModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-widest text-[10px] h-10 px-6 rounded-xl shadow-lg shadow-blue-500/20"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Register
                    </Button>
                </div>
            </div>

            {/* Stats Quickbar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
                <StatItem label="Total Registry" value={stats.total} icon={<Database className="w-4 h-4" />} color="blue" />
                <StatItem label="VIP Access" value={stats.vips} icon={<Star className="w-4 h-4" />} color="amber" />
                <StatItem label="Watchlist" value={stats.watchlist} icon={<ShieldAlert className="w-4 h-4" />} color="red" />
                <StatItem label="Authorized Personnel" value={stats.staff} icon={<UserCheck className="w-4 h-4" />} color="emerald" />
            </div>

            {/* Main Table Workspace */}
            <div className="flex-1 bg-black border border-white/10 rounded-[2rem] overflow-hidden flex flex-col min-h-0 shadow-2xl relative">
                {/* Analysis Grid Decoration */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-8 py-5 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-white/[0.02] z-10">
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
                                className="h-full flex items-center justify-center flex-col gap-4"
                            >
                                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Querying Biometric Core...</span>
                            </motion.div>
                        ) : filteredIdentities.length > 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="divide-y divide-white/[0.03]"
                            >
                                {filteredIdentities.map((id, i) => (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                        key={id._id}
                                        className="grid grid-cols-12 gap-4 px-8 py-5 items-center hover:bg-white/[0.02] transition-all group border-l-2 border-transparent hover:border-blue-500"
                                    >
                                        <div className="col-span-1 font-mono text-[10px] text-zinc-700">#{id._id.slice(-4).toUpperCase()}</div>
                                        <div className="col-span-4 lg:col-span-4 flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center border border-white/5 relative overflow-hidden group-hover:border-blue-500/30 transition-colors">
                                                <Users className="w-6 h-6 text-zinc-600" />
                                                <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                {editingId === id._id ? (
                                                    <input
                                                        className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1 text-sm text-white outline-none focus:border-blue-500"
                                                        value={editForm.name}
                                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span className="text-base font-bold text-white uppercase tracking-tight leading-none group-hover:text-blue-400 transition-colors">{id.name}</span>
                                                )}
                                                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest leading-none">ID: {id._id}</span>
                                            </div>
                                        </div>
                                        <div className="col-span-3 lg:col-span-3">
                                            {editingId === id._id ? (
                                                <select
                                                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white text-[10px] font-black uppercase outline-none focus:border-blue-500"
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
                                                <Badge variant="outline" className={`font-black text-[9px] px-3 py-1 flex items-center gap-2 w-max transition-all ${id.watchlist?.type === 'Blacklist' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                        id.watchlist?.type === 'VIP' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                                            id.watchlist?.type === 'Unauthorized' ? 'bg-red-500/10 text-red-400 border-red-500/10' :
                                                                'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                    }`}>
                                                    {id.watchlist?.type === 'Blacklist' ? <ShieldAlert className="w-3 h-3" /> :
                                                        id.watchlist?.type === 'VIP' ? <Star className="w-3 h-3" /> :
                                                            id.watchlist?.type === 'Unauthorized' ? <Shield className="w-3 h-3" /> :
                                                                <ShieldCheck className="w-3 h-3" />}
                                                    {id.watchlist?.type || "Staff"}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="col-span-3 lg:col-span-3 flex flex-col gap-1 text-zinc-500">
                                            <div className="text-[10px] font-mono font-bold tracking-tight text-white/50">
                                                {new Date(id.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </div>
                                            <div className="text-[9px] font-medium text-zinc-700 uppercase tracking-widest">
                                                Linked {new Date(id.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                        <div className="col-span-1 text-right flex justify-end gap-2">
                                            {editingId === id._id ? (
                                                <>
                                                    <Button onClick={() => handleSave(id._id)} size="icon" variant="ghost" className="h-8 w-8 text-emerald-500 hover:bg-emerald-500/10">
                                                        <Save className="w-4 h-4" />
                                                    </Button>
                                                    <Button onClick={() => setEditingId(null)} size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:bg-white/5">
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button onClick={() => handleEdit(id)} size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all">
                                                        <Edit3 className="w-4 h-4" />
                                                    </Button>
                                                    <Button onClick={() => handleDelete(id._id)} size="icon" variant="ghost" className="h-8 w-8 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all">
                                                        <Trash2 className="w-4 h-4" />
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
                                className="h-full flex flex-col items-center justify-center text-zinc-600 gap-6"
                            >
                                <div className="w-24 h-24 rounded-[2.5rem] bg-white/[0.02] border border-white/5 flex items-center justify-center">
                                    <Users className="w-10 h-10 opacity-20" />
                                </div>
                                <div className="text-center group">
                                    <span className="text-xs font-black uppercase tracking-[0.4em] opacity-30 group-hover:opacity-50 transition-opacity block mb-2">Neural Registry Empty</span>
                                    <span className="text-[9px] font-bold text-zinc-800 uppercase tracking-widest">Initiate identity uplink to populate registry</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Registration Modal - Redesigned */}
            <Dialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
                <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-md rounded-[2rem] overflow-hidden">
                    <DialogHeader className="p-6 pb-0">
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Identity <span className="text-blue-500">Uplink</span></DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleRegisterSubmit} className="p-6 space-y-6">
                        <div className="space-y-5">
                            <div className="grid gap-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Identity Signature</Label>
                                <Input
                                    placeholder="Enter full name..."
                                    className="bg-white/[0.03] border-white/10 rounded-2xl h-14 px-5 font-bold focus:border-blue-500/50 transition-all"
                                    value={registerForm.name}
                                    onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Biometric Capture</Label>
                                <div
                                    className="relative h-56 border-2 border-dashed border-white/10 rounded-3xl bg-white/[0.02] hover:bg-white/[0.04] transition-all flex flex-col items-center justify-center gap-4 group cursor-pointer overflow-hidden border-spacing-4"
                                    onClick={() => document.getElementById('file-upload').click()}
                                >
                                    {previewImage ? (
                                        <div className="relative w-full h-full">
                                            <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-white/70">Source Verified</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center group-hover:scale-110 group-hover:border-blue-500/30 transition-all duration-500">
                                                <Upload className="w-7 h-7 text-zinc-600 group-hover:text-blue-500" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Click to link face</p>
                                                <p className="text-[8px] font-bold text-zinc-700 uppercase">Single Front-Facing Frame</p>
                                            </div>
                                        </>
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
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Clearance Tier</Label>
                                    <select
                                        className="bg-white/[0.03] border border-white/10 rounded-2xl h-14 px-5 text-sm font-bold appearance-none outline-none focus:border-blue-500/50 transition-all cursor-pointer"
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
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">Criticality</Label>
                                    <select
                                        className="bg-white/[0.03] border border-white/10 rounded-2xl h-14 px-5 text-sm font-bold appearance-none outline-none focus:border-blue-500/50 transition-all cursor-pointer"
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

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setShowRegisterModal(false)}
                                className="font-bold uppercase tracking-widest text-[10px] text-zinc-600"
                            >
                                Abort
                            </Button>
                            <Button
                                type="submit"
                                disabled={isRegistering || !registerForm.image || !registerForm.name}
                                className="bg-blue-600 hover:bg-blue-700 font-bold uppercase tracking-widest text-[10px] h-12 rounded-xl px-8 min-w-[160px]"
                            >
                                {isRegistering ? <Loader2 className="w-4 h-4 animate-spin" /> : "Initiate Link"}
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
        blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
        amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        red: 'text-red-500 bg-red-500/10 border-red-500/20',
    };

    return (
        <div className="p-5 bg-zinc-900/40 border border-white/[0.03] rounded-3xl hover:border-white/10 transition-all group overflow-hidden relative">
            <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label}</div>
                <div className={`p-2 rounded-xl border ${colorMap[color]}`}>
                    {icon}
                </div>
            </div>
            <div className="text-2xl font-black text-white tracking-tighter relative z-10">{value}</div>
            <div className="absolute -bottom-6 -right-6 w-16 h-16 rounded-full bg-white opacity-[0.02] blur-xl group-hover:opacity-[0.05] transition-opacity" />
        </div>
    );
};

export default NeuralRegistry;
