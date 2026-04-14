import { motion } from 'framer-motion';
import { Store, Cpu, LineChart } from 'lucide-react';

export const FeaturesGrid = () => {
  return (
    <section id="features" className="bg-[#FEFAF1] py-10">
      <div className="mx-auto sm:px-7 px-4 max-w-screen-xl">
        
        {/* Dashboard Image (Overlaps previous section) */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="border-4 border-slate-800 block mx-auto mt-[-200px] relative bg-slate-900 rounded-2xl w-full max-w-[1000px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden"
        >
          <img 
            src="/dashboard.png" 
            alt="Veltro Dashboard Preview" 
            className="w-full h-auto object-contain"
          />
        </motion.div>

        {/* Section Header */}
        <div className="flex flex-col text-center pb-20 pt-28 text-slate-900 max-w-screen-md mx-auto">
          <h2 className="text-4xl font-medium lg:text-7xl">
            Cómo <span className="text-emerald-600 font-bold font-serif italic">funciona</span>
          </h2>
          <span className="text-slate-600 pt-5 text-[20px] leading-[26px]">
            Un ecosistema integrado que simplifica tus ventas y potencia tu control de inventario usando Inteligencia Artificial.
          </span>
        </div>

        {/* Features Grid */}
        <div className="pb-10 lg:pb-20">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-3">
            
            {/* Feature 1 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6 text-emerald-600">
                <Store className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Punto de Venta Ultra Rápido</h2>
              <p className="mt-4 text-slate-600 leading-relaxed">
                Factura en segundos con un sistema POS diseñado para fluidez. Soporta búsqueda rápida, control de cajas y facturación electrónica.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6 text-emerald-600">
                <Cpu className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Inventario con Inteligencia Artificial</h2>
              <p className="mt-4 text-slate-600 leading-relaxed">
                Reconocimiento visual de productos. Escanea un artículo con tu cámara y la IA de Veltro lo identificará instantáneamente.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6 text-emerald-600">
                <LineChart className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Auditoría y Reportes</h2>
              <p className="mt-4 text-slate-600 leading-relaxed">
                Control total sobre cada movimiento. Rastrea el rendimiento de tu negocio con analíticas precisas y auditoría forense en tiempo real.
              </p>
            </motion.div>

          </div>
        </div>
      </div>
    </section>
  );
};
