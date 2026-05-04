import { motion } from 'framer-motion';
import { 
  Cpu, 
  PackageSearch, 
  LineChart, 
  FileJson, 
  ShieldCheck, 
  ArrowRightLeft 
} from 'lucide-react';

export const FunctionalitiesExposition = () => {
  return (
    <section id="deep-dive" className="bg-slate-900 py-20 lg:py-32 overflow-hidden border-t border-slate-800">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-24">
          <h2 className="text-emerald-500 font-semibold tracking-wide uppercase text-sm mb-3">
            Arquitectura de Vanguardia
          </h2>
          <p className="text-4xl lg:text-6xl font-medium text-white mb-6">
            El motor detrás de <span className="text-emerald-500 font-bold font-serif italic">Veltro</span>
          </p>
          <p className="text-xl text-slate-400">
            Descubre cómo utilizamos Edge Computing y patrones de diseño avanzados para procesar tus operaciones en tiempo real, sin depender de servidores pesados.
          </p>
        </div>

        <div className="space-y-32">
          
          {/* Feature 1: YOLOv8n + CLIP (Image Left, Text Right) */}
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="w-full lg:w-[60%]"
            >
              <div className="relative aspect-video bg-[#FEFAF1] rounded-3xl border border-slate-200 overflow-hidden shadow-2xl flex items-center justify-center group">
                <img 
                  src="/images_landingPage/pos.jpeg" 
                  alt="POS Ultra Rápido" 
                  className="w-full h-full object-cover object-[24%_0%]"
                />
              </div>
            </motion.div>
            <div className="w-full lg:w-[40%]">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <Cpu className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-3xl font-bold text-white">POS Ultra-Rápido con IA</h3>
              </div>
              <p className="text-lg text-slate-400 mb-6 leading-relaxed">
                Ejecutamos un modelo <strong className="text-slate-200">YOLOv8n directamente en tu navegador</strong> usando Edge Computing (ONNX Runtime Web).
              </p>
              <p className="text-lg text-slate-400 leading-relaxed">
                Al escanear un producto sin código de barras, Veltro realiza un <em>tracking</em> visual en tiempo real a 60 FPS y utiliza búsqueda semántica (<strong className="text-slate-200">CLIP</strong>) para identificarlo al instante, todo sin enviar pesados videos al servidor.
              </p>
            </div>
          </div>

          {/* Feature 2: Inventory & Purchasing (Text Left, Image Right) */}
          <div className="flex flex-col-reverse lg:flex-row items-center gap-12 lg:gap-20">
            <div className="w-full lg:w-[40%]">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <PackageSearch className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-3xl font-bold text-white">Gestión Proactiva de Inventario</h3>
              </div>
              <p className="text-lg text-slate-400 mb-6 leading-relaxed">
                Cada venta deduce el stock automáticamente mediante un patrón de eventos. Si un producto baja de su umbral, nuestro <strong className="text-slate-200">Chain of Responsibility</strong> dispara alertas de <em>Stock Crítico</em> o <em>Stock Bajo</em>.
              </p>
              <p className="text-lg text-slate-400 leading-relaxed">
                Resolviendo alertas, el flujo de Órdenes de Compra restablece el inventario de forma segura, transitando de manera inmutable por un <strong className="text-slate-200">State Pattern</strong> (Pendiente → Parcial → Recibido).
              </p>
            </div>
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="w-full lg:w-[60%]"
            >
              <div className="relative aspect-video bg-[#FEFAF1] rounded-3xl border border-slate-200 overflow-hidden shadow-2xl flex items-center justify-center">
                <img 
                  src="/images_landingPage/alerta.PNG" 
                  alt="Gestión de Alertas de Inventario" 
                  className="w-full h-full object-cover object-[24%_0%]"
                />
              </div>
            </motion.div>
          </div>

          {/* Feature 3: Dashboard (Image Left, Text Right) */}
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="w-full lg:w-[60%]"
            >
              <div className="relative aspect-video bg-[#FEFAF1] rounded-3xl border border-slate-200 overflow-hidden shadow-2xl flex items-center justify-center">
                <img 
                  src="/images_landingPage/reporte.PNG" 
                  alt="Dashboard Financiero" 
                  className="w-full h-full object-cover object-[23.5%_0%] scale-[1.05]"
                />
              </div>
            </motion.div>
            <div className="w-full lg:w-[40%]">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <LineChart className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-3xl font-bold text-white">Dashboard Financiero</h3>
              </div>
              <p className="text-lg text-slate-400 mb-6 leading-relaxed">
                Utilizando el <strong className="text-slate-200">Facade Pattern</strong>, nuestro backend consolida información compleja en una única vista.
              </p>
              <p className="text-lg text-slate-400 leading-relaxed">
                Obtén métricas en tiempo real de ventas, ticket promedio, y rentabilidad estimada. Además, nuestro <strong className="text-slate-200">Factory Method</strong> genera reportes consolidados exportables instantáneamente a PDF (iText) o Excel (Apache POI).
              </p>
            </div>
          </div>

          {/* Feature 4: Forensic Audit (Text Left, Image Right) */}
          <div className="flex flex-col-reverse lg:flex-row items-center gap-12 lg:gap-20">
            <div className="w-full lg:w-[40%]">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-3xl font-bold text-white">Auditoría Forense Inmutable</h3>
              </div>
              <p className="text-lg text-slate-400 mb-6 leading-relaxed">
                Las eliminaciones fantasma son historia. Veltro implementa un estricto "Audit Trail" bajo el <strong className="text-slate-200">Command Pattern</strong>.
              </p>
              <p className="text-lg text-slate-400 leading-relaxed">
                Toda operación crítica (anulaciones, ajustes manuales, cambios de stock) guarda un <em>snapshot</em> exacto de los datos en JSON, capturando el "Antes" y el "Después". Nuestro <strong className="text-slate-200">DiffViewer</strong> permite a los administradores rastrear con exactitud quién hizo qué, y cuándo.
              </p>
            </div>
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="w-full lg:w-[60%]"
            >
              <div className="relative aspect-video bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden shadow-2xl p-10 font-mono text-sm flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-200 text-slate-600 font-semibold">
                  <FileJson className="w-5 h-5" />
                  <span>DiffViewer: Ajuste de Inventario</span>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 rounded-xl border border-red-100 shadow-sm">
                    <p className="text-red-700 font-bold flex items-center gap-2">
                      <ArrowRightLeft className="w-4 h-4" /> 
                      PREVIOUS_DATA
                    </p>
                    <p className="text-slate-600 mt-2">"current_stock": <span className="text-red-600 line-through">15</span></p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 shadow-sm">
                    <p className="text-emerald-700 font-bold flex items-center gap-2">
                      <ArrowRightLeft className="w-4 h-4" /> 
                      NEW_DATA
                    </p>
                    <p className="text-slate-600 mt-2">"current_stock": <span className="text-emerald-600 font-bold">10</span></p>
                    <p className="text-emerald-700/60 mt-1 text-xs">"reason": "Merma por vencimiento"</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
};
