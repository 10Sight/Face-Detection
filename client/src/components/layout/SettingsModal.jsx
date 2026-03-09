import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Settings2, User, Zap, Clock } from 'lucide-react';
import {
    closeSettings,
    setUnknownAlerts,
    setSuspiciousAlerts,
    setTimelineVisibility
} from '../../store/slices/uiSlice';

const SettingsModal = () => {
    const dispatch = useDispatch();
    const {
        isSettingsOpen,
        unknownAlertsEnabled,
        suspiciousAlertsEnabled,
        showTimeline
    } = useSelector((state) => state.ui);

    return (
        <Dialog open={isSettingsOpen} onOpenChange={(open) => !open && dispatch(closeSettings())}>
            <DialogContent className="bg-slate-900/95 backdrop-blur-3xl border-white/10 text-white rounded-[2rem] max-w-sm shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)]">
                <DialogHeader className="pt-4 px-6 text-center border-b border-white/5 pb-6">
                    <div className="mx-auto w-12 h-12 bg-indigo-500/20 border border-indigo-400/20 rounded-2xl flex items-center justify-center mb-4">
                        <Settings2 className="w-6 h-6 text-indigo-400" />
                    </div>
                    <DialogTitle className="text-xl font-black tracking-tight mb-1">System Configuration</DialogTitle>
                    <DialogDescription className="text-slate-400 text-xs font-bold uppercase tracking-widest">Behavior Manipulation</DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                                <User className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div className="space-y-0.5">
                                <Label className="text-sm font-bold text-white tracking-tight">Unknown Alerts</Label>
                                <p className="text-[10px] text-slate-500 font-medium">Notify Guest detection</p>
                            </div>
                        </div>
                        <Switch
                            checked={unknownAlertsEnabled}
                            onCheckedChange={(val) => dispatch(setUnknownAlerts(val))}
                            className="data-[state=checked]:bg-indigo-600"
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                                <Zap className="w-5 h-5 text-amber-400" />
                            </div>
                            <div className="space-y-0.5">
                                <Label className="text-sm font-bold text-white tracking-tight">Suspicious Mode</Label>
                                <p className="text-[10px] text-slate-500 font-medium">Reconnaissance triggers</p>
                            </div>
                        </div>
                        <Switch
                            checked={suspiciousAlertsEnabled}
                            onCheckedChange={(val) => dispatch(setSuspiciousAlerts(val))}
                            className="data-[state=checked]:bg-amber-600"
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                                <Clock className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div className="space-y-0.5">
                                <Label className="text-sm font-bold text-white tracking-tight">Entity Timeline</Label>
                                <p className="text-[10px] text-slate-500 font-medium">Show live detection list</p>
                            </div>
                        </div>
                        <Switch
                            checked={showTimeline}
                            onCheckedChange={(val) => dispatch(setTimelineVisibility(val))}
                            className="data-[state=checked]:bg-emerald-600"
                        />
                    </div>
                </div>

                <DialogFooter className="p-6 pt-0">
                    <Button
                        onClick={() => dispatch(closeSettings())}
                        className="w-full h-12 bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-widest text-xs rounded-xl border border-white/10"
                    >
                        Synchronize & Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default SettingsModal;
