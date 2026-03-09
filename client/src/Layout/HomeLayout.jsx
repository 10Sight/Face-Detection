import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BrainCircuit,
  LayoutDashboard,
  Users,
  History,
  Settings,
  ShieldCheck,
  Activity,
  Menu,
  X,
  Database,
  Search as SearchIcon,
  Maximize2,
  Fingerprint,
  FileText,
  Bell,
  Cpu,
  LogOut,
  Minimize2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import SettingsModal from '../components/layout/SettingsModal';
import { openSettings, toggleFullScreen, setFullScreen } from '../store/slices/uiSlice';

const HomeLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const dispatch = useDispatch();
  const location = useLocation();
  const { latency } = useSelector(state => state.performance);
  const { isFullScreen } = useSelector(state => state.ui);

  const navItems = [
    { name: 'Mission Control', icon: Activity, path: '/' },
    { name: 'Forensic Search', icon: Fingerprint, path: '/search' },
    { name: 'Intelligence Hub', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Neural Registry', icon: Users, path: '/registry' },
    { name: 'Capture History', icon: History, path: '/history' },
    { name: 'Data Reports', icon: FileText, path: '/reports' },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-600 overflow-hidden antialiased">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.05),transparent)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(slate-200_1px,transparent_1px)] [background-size:32px_32px] opacity-40 pointer-events-none" />

      {/* Mobile Sidebar Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && window.innerWidth < 1024 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Primary Navigation Sidebar */}
      {!isFullScreen && (
        <aside className={`fixed lg:relative z-50 bg-white/80 backdrop-blur-2xl border-r border-slate-200/60 flex flex-col shrink-0 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] h-full ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-20 lg:translate-x-0 -translate-x-full lg:w-20'}`}>
          {/* Brand Identity */}
          <div className="h-20 flex items-center px-6 border-b border-slate-100/50">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="min-w-[40px] h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 transition-transform group-hover:scale-110 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-400/20 to-transparent animate-pulse" />
                <BrainCircuit className="w-6 h-6 text-white relative z-10" />
              </div>
              <AnimatePresence>
                {isSidebarOpen && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex flex-col leading-none"
                  >
                    <span className="text-xl font-bold tracking-tight text-slate-900">10Sight</span>
                    <span className="text-[10px] font-semibold text-indigo-500 tracking-wider mt-1 uppercase opacity-80">Vision OS</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </Link>
          </div>

          {/* Workspace Navigation */}
          <ScrollArea className="flex-1 py-6 px-3">
            <div className="space-y-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all relative group ${isActive ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'hover:bg-slate-100/50 text-slate-500'}`}
                  >
                    <item.icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'text-indigo-600 scale-110' : 'group-hover:text-slate-800'}`} />
                    <AnimatePresence>
                      {isSidebarOpen && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-xs font-semibold tracking-wide"
                        >
                          {item.name}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {isActive && (
                      <motion.div
                        layoutId="activeHighlight"
                        className="absolute left-0 w-1.5 h-7 bg-indigo-500 rounded-r-full shadow-[0_0_15px_rgba(99,102,241,0.6)]"
                        initial={{ opacity: 0, scaleY: 0 }}
                        animate={{ opacity: 1, scaleY: 1 }}
                        transition={{ duration: 0.4, ease: "circOut" }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>

            {isSidebarOpen && (
              <div className="mt-8 mb-2 px-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Neural Cluster</div>
                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-slate-500">Node Latency</span>
                    <span className="text-indigo-600">{latency || '0'}ms</span>
                  </div>
                  <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((latency / 500) * 100, 100)}%` }}
                      className={`h-full shadow-sm ${latency > 300 ? 'bg-amber-500' : 'bg-indigo-600'}`}
                    />
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Global Controls */}
          <div className="p-6 space-y-3">
            <Button
              variant="ghost"
              onClick={() => dispatch(openSettings())}
              className="w-full h-12 flex justify-start items-center gap-4 px-4 rounded-2xl hover:bg-slate-100/80 text-slate-500 group transition-all"
            >
              <Settings className="w-5 h-5 group-hover:text-slate-800 group-hover:rotate-45 transition-transform" />
              {isSidebarOpen && <span className="text-xs font-semibold group-hover:text-slate-800">System Config</span>}
            </Button>

            <Separator className="bg-slate-100 my-2" />

            <div className={`flex items-center gap-3 p-2.5 ${isSidebarOpen ? 'bg-slate-50 border border-slate-200/60 rounded-2xl shadow-sm' : ''}`}>
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-800 shadow-sm">JK</div>
              {isSidebarOpen && (
                <div className="flex flex-col flex-1 leading-none">
                  <span className="text-[11px] font-bold text-slate-900">Security Chief</span>
                  <span className="text-[9px] font-semibold text-slate-400 mt-0.5 uppercase tracking-widest">ID: 10S-OFF-22</span>
                </div>
              )}
              {isSidebarOpen && <LogOut className="w-3.5 h-3.5 text-slate-400 hover:text-red-500 cursor-pointer transition-colors" />}
            </div>
          </div>
        </aside>
      )}

      {/* Execution Viewport */}
      <main className={`flex-1 flex flex-col relative min-w-0 h-screen overflow-hidden ${isFullScreen ? 'p-0' : ''}`}>
        {/* Global Operational Header */}
        {!isFullScreen && (
          <header className="h-16 lg:h-18 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl flex items-center justify-between px-4 sm:px-6 lg:px-8 relative z-30 shrink-0">
            <div className="flex items-center gap-4 sm:gap-6 lg:gap-8 min-w-0">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="w-10 h-10 flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-200 shadow-sm rounded-xl transition-all"
              >
                {isSidebarOpen ? <X className="w-4 h-4 text-slate-600" /> : <Menu className="w-4 h-4 text-slate-600" />}
              </button>
              <div className="h-4 w-px bg-slate-200" />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 text-xs font-semibold uppercase tracking-wider text-slate-400 truncate">
                  <Database className="w-3.5 h-3.5" />
                  Archive / <span className="text-slate-900">{navItems.find(n => n.path === location.pathname)?.name || 'Surveillance'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 lg:gap-8">
              <div className="hidden xl:flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 group focus-within:border-indigo-400 transition-all shadow-sm">
                <SearchIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                <input
                  type="text"
                  placeholder="Lookup neural ID..."
                  className="bg-transparent text-xs font-medium outline-none w-40 lg:w-48 text-slate-600 placeholder:text-slate-400"
                />
              </div>

              <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-xl shadow-sm">
                <Cpu className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Active</span>
              </div>

              <div className="flex items-center gap-2 sm:gap-4">
                <div className="relative p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-all hover:scale-105 shadow-sm">
                  <Bell className="w-4 h-4 text-slate-500" />
                  <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white shadow-sm" />
                </div>
                <div
                  className="hidden sm:block p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-all hover:scale-105 shadow-sm"
                  onClick={() => dispatch(setFullScreen(true))}
                >
                  <Maximize2 className="w-4 h-4 text-slate-500" />
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Floating Exit Button for Full Screen */}
        <AnimatePresence>
          {isFullScreen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-6 right-6 z-[60]"
            >
              <Button
                variant="secondary"
                size="sm"
                onClick={() => dispatch(setFullScreen(false))}
                className="bg-white/90 backdrop-blur-md border border-slate-200 shadow-xl hover:bg-white text-slate-600 font-bold px-4 h-10 rounded-xl flex items-center gap-2"
              >
                <Minimize2 className="w-4 h-4" />
                Exit Full Screen
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Workspace Content */}
        <ScrollArea className="flex-1 relative z-10 min-h-0 h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </ScrollArea>
      </main>
      <SettingsModal />
    </div>
  );
};

export default HomeLayout;
