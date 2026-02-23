import React, { useState } from 'react';
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
  LogOut
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';

const HomeLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();

  const navItems = [
    { name: 'Mission Control', icon: Activity, path: '/' },
    { name: 'Forensic Search', icon: Fingerprint, path: '/search' },
    { name: 'Intelligence Hub', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Neural Registry', icon: Users, path: '/registry' },
    { name: 'Capture History', icon: History, path: '/history' },
    { name: 'Data Reports', icon: FileText, path: '/reports' },
  ];

  return (
    <div className="flex min-h-screen bg-[#020202] text-zinc-300 overflow-auto antialiased">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.05),transparent)] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10 pointer-events-none" />

      {/* Primary Navigation Sidebar */}
      <aside className={`relative z-50 bg-[#050505]/80 backdrop-blur-2xl border-r border-white/[0.05] flex flex-col shrink-0 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isSidebarOpen ? 'w-72' : 'w-20'}`}>
        {/* Brand Identity */}
        <div className="h-24 flex items-center px-8 border-b border-white/[0.03]">
          <Link to="/" className="flex items-center gap-4 group">
            <div className="min-w-[48px] h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-transform group-hover:scale-110">
              <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex flex-col leading-none"
                >
                  <span className="text-lg font-black tracking-tighter text-white uppercase italic">10Sight</span>
                  <span className="text-[10px] font-black text-blue-500 tracking-[0.3em] mt-1 uppercase opacity-80">Vision OS</span>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>
        </div>

        {/* Workspace Navigation */}
        <ScrollArea className="flex-1 py-8 px-4">
          <div className="space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all relative group ${isActive ? 'bg-blue-600/10 text-white' : 'hover:bg-white/[0.03] text-zinc-500'}`}
                >
                  <item.icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'text-blue-500 scale-110' : 'group-hover:text-white'}`} />
                  <AnimatePresence>
                    {isSidebarOpen && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[11px] font-black uppercase tracking-[0.15em]"
                      >
                        {item.name}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {isActive && (
                    <motion.div layoutId="activeHighlight" className="absolute left-0 w-1 h-6 bg-blue-500 rounded-full shadow-[0_0_15px_#3b82f6]" />
                  )}
                </Link>
              );
            })}
          </div>

          {isSidebarOpen && (
            <div className="mt-12 mb-4 px-4">
              <div className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.2em] mb-4">Neural Cluster</div>
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="text-zinc-500">Node Latency</span>
                  <span className="text-blue-500">12ms</span>
                </div>
                <div className="w-full h-1 bg-white/[0.05] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '65%' }}
                    className="h-full bg-blue-600 shadow-[0_0_10px_#2563eb]"
                  />
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Global Controls */}
        <div className="p-6 space-y-3">
          <Button variant="ghost" className="w-full h-12 flex justify-start items-center gap-4 px-4 rounded-2xl hover:bg-white/[0.05] text-zinc-500 group transition-all">
            <Settings className="w-5 h-5 group-hover:text-white group-hover:rotate-45 transition-transform" />
            {isSidebarOpen && <span className="text-[10px] font-black uppercase tracking-widest group-hover:text-white">System Config</span>}
          </Button>

          <Separator className="bg-white/[0.03] my-2" />

          <div className={`flex items-center gap-4 p-3 ${isSidebarOpen ? 'bg-zinc-900/40 border border-white/[0.03] rounded-3xl' : ''}`}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-800 to-black border border-white/10 flex items-center justify-center text-xs font-black shadow-inner">JK</div>
            {isSidebarOpen && (
              <div className="flex flex-col flex-1 leading-none">
                <span className="text-[10px] font-black text-white uppercase tracking-tighter">Security Chief</span>
                <span className="text-[8px] font-bold text-zinc-600 mt-1 uppercase tracking-widest">ID: 10S-OFF-22</span>
              </div>
            )}
            {isSidebarOpen && <LogOut className="w-4 h-4 text-zinc-700 hover:text-red-500 cursor-pointer" />}
          </div>
        </div>
      </aside>

      {/* Execution Viewport */}
      <main className="flex-1 flex flex-col relative min-w-0">
        {/* Global Operational Header */}
        <header className="h-20 lg:h-24 border-b border-white/[0.03] bg-black/20 backdrop-blur-xl flex items-center justify-between px-4 sm:px-6 lg:px-10 relative z-40">
          <div className="flex items-center gap-4 sm:gap-6 lg:gap-8 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="w-10 h-10 flex items-center justify-center bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-xl transition-colors"
            >
              {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.25em] text-zinc-600 truncate">
                <Database className="w-3 h-3" />
                Archive / <span className="text-white">{navItems.find(n => n.path === location.pathname)?.name || 'Surveillance'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 lg:gap-8">
            <div className="hidden xl:flex items-center gap-4 px-4 lg:px-6 py-2.5 bg-white/[0.02] rounded-2xl border border-white/5 group focus-within:border-blue-500/30 transition-all">
              <SearchIcon className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
              <input
                type="text"
                placeholder="Lookup neural ID..."
                className="bg-transparent text-[11px] font-bold tracking-widest outline-none w-40 lg:w-56 text-zinc-400 placeholder:text-zinc-700 uppercase"
              />
            </div>

            <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
              <Cpu className="w-4 h-4 text-blue-500 animate-pulse" />
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Matrix: Active</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="relative p-2.5 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/5 cursor-pointer transition-all hover:scale-105">
                <Bell className="w-4 h-4 text-zinc-500" />
                <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-black shadow-[0_0_10px_#ef4444]" />
              </div>
              <div className="hidden sm:block p-2.5 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/5 cursor-pointer transition-all hover:scale-105">
                <Maximize2 className="w-4 h-4 text-zinc-500" />
              </div>
            </div>
          </div>
        </header>

        {/* Workspace Content */}
        <ScrollArea className="flex-1 relative z-10">
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
    </div>
  );
};

export default HomeLayout;
