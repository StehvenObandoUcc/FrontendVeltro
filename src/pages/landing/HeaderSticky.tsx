import { ShieldCheck, LogIn, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const HeaderSticky = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 p-4 shadow-lg flex justify-between items-center">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <ShieldCheck className="w-6 h-6 text-emerald-500" />
        <span className="text-xl font-bold text-white">Veltro</span>
      </div>
      


      <div className="flex gap-3">
        {isAuthenticated ? (
          <Link to="/app/dashboard" className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-full text-sm font-bold transition-all border border-slate-700">
             <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-xs text-white">
               {user?.username?.charAt(0).toUpperCase()}
             </div>
             <span>Dashboard</span>
          </Link>
        ) : (
          <>
            <Link 
              to="/login"
              className="flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white transition-colors px-2"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Ingresar</span>
            </Link>
            <Link 
              to="/register"
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-full text-sm font-bold transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Registrarse</span>
            </Link>
          </>
        )}
      </div>
    </header>
  );
};
