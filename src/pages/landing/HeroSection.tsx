import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export const HeroSection = () => {
  return (
    <section id="hero" className="bg-gradient-to-b from-slate-900 to-slate-950 pt-20">
      <div className="mx-auto sm:px-7 px-4 max-w-screen-xl relative z-10">
        <div className="gap-x-6 px-4 py-16 pb-64 mx-auto lg:grid xl:px-0 lg:grid-cols-12">
          
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="font-sans font-semibold text-slate-400 lg:col-span-12 uppercase tracking-widest text-sm mb-4"
          >
            Plataforma 4.0 impulsada por IA
          </motion.h1>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="mt-3 text-white lg:col-span-8 lg:mt-6"
          >
            <h2 className="text-5xl font-medium lg:text-7xl leading-tight">
              Escala tu negocio con <br />
              <span className="text-emerald-500 font-bold font-serif italic">gestión inteligente</span>
            </h2>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:col-start-9 lg:col-span-4 flex flex-col justify-center"
          >
            <p className="max-w-3xl mt-4 text-slate-400 text-[20px] leading-[26px] lg:mt-8">
              Punto de Venta avanzado, control de inventario automatizado y auditoría forense para dominar tu mercado.
            </p>
            <div className="flex mt-8 space-x-2 md:space-x-6">
              <Link 
                to="/register" 
                className="bg-emerald-600 text-white font-bold py-4 px-8 rounded-full hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/50"
              >
                Comenzar Ahora
              </Link>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};
