import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertTriangle, ArrowLeft, Ghost } from 'lucide-react';
import { Button } from '../components/ui/button';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-100 rounded-full blur-[100px] opacity-50" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-100 rounded-full blur-[100px] opacity-50" />

      <div className="max-w-md w-full text-center relative z-10">
        <div className="mb-10 relative">
          <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200 border border-slate-100 flex items-center justify-center mx-auto mb-6 relative z-10">
            <Ghost className="w-12 h-12 text-indigo-500 animate-bounce" />
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-indigo-50 rounded-full blur-2xl -z-0 opacity-60" />
        </div>

        <div className="space-y-4 mb-10">
          <h1 className="text-8xl font-black text-slate-900 tracking-tighter leading-none">404</h1>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight uppercase">Coordinate Mismatch</h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xs mx-auto">
            The requested neural coordinate does not exist in the current sector. Access has been restricted or the link is broken.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-widest text-[10px] h-14 rounded-2xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95">
            <Link to="/">
              <Home className="w-4 h-4 mr-2" />
              Return to Command Center
            </Link>
          </Button>
          <Button variant="ghost" asChild className="text-slate-400 font-bold uppercase tracking-widest text-[10px] h-12 rounded-2xl hover:text-slate-900 transition-all">
            <Link to={-1}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Revert to Previous Sector
            </Link>
          </Button>
        </div>

        <div className="mt-16 pt-8 border-t border-slate-200/60">
          <div className="flex items-center justify-center gap-2 text-[9px] font-bold text-slate-300 uppercase tracking-[0.3em]">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            Neural Network Integrity: 99.9%
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
