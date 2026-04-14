import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export const FooterCTA = () => {
  return (
    <>
      {/* CTA Section */}
      <section id="CTA" className="bg-[#FEFAF1]">
        <div className="max-w-screen-xl sm:px-7 px-4 py-10 lg:py-20 mx-auto">
          <div className="p-10 lg:p-20 bg-gradient-to-b from-white to-slate-200 rounded-3xl shadow-xl">
            <div className="lg:grid lg:grid-cols-12 items-center">
              <div className="text-slate-900 lg:col-span-8 flex flex-col">
                <h2 className="text-4xl font-medium lg:text-7xl">
                  ¿<span className="text-emerald-600 font-bold font-serif italic">Listo</span> para empezar?
                </h2>
                <span className="text-slate-600 pt-4 text-[20px] leading-[26px]">
                  Tenemos un plan gratuito disponible para que comiences a optimizar tus procesos hoy mismo.
                </span>
              </div>
              <div className="mt-10 lg:mt-0 lg:col-start-9 lg:col-span-4 flex">
                <Link 
                  to="/register"
                  className="ml-0 lg:ml-auto bg-emerald-600 text-white font-bold py-4 px-8 rounded-full text-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/20"
                >
                  Comenzar Gratis
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-screen-xl sm:px-7 px-4 py-8 mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-8 h-8 text-emerald-500" />
              <span className="text-slate-900 text-2xl font-bold">Veltro</span>
            </div>
            <p className="text-slate-500 text-sm text-center md:text-left">
              &copy; {new Date().getFullYear()} Todos los derechos reservados. Desarrollado por el equipo de Veltro.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
};
