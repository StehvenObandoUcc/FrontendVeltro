import { CheckCircle2, XCircle } from 'lucide-react';

export const PricingSection = () => {
  return (
    <section id="prices" className="bg-slate-900">
      <div className="max-w-screen-xl sm:px-7 px-4 py-10 lg:py-20 mx-auto">
        <div className="xl:items-center xl:-mx-8 xl:flex">
          <div className="flex flex-col items-center xl:items-start xl:mx-8">
            <h2 className="text-4xl font-medium text-white lg:text-5xl max-w-[400px]">
              Nuestros <span className="text-emerald-500 font-bold font-serif italic">Planes</span>
            </h2>
            <div className="mt-4">
              <span className="inline-block w-40 h-1 bg-emerald-500 rounded-full"></span>
              <span className="inline-block w-3 h-1 mx-1 bg-emerald-500 rounded-full"></span>
              <span className="inline-block w-1 h-1 bg-emerald-500 rounded-full"></span>
            </div>
            <p className="mt-4 text-slate-400 text-center xl:text-left max-w-sm">
              Escoge el plan que mejor se adapte al tamaño de tu negocio. Empieza gratis y escala cuando lo necesites.
            </p>
          </div>

          <div className="flex-1 xl:mx-8">
            <div className="mt-8 space-y-8 md:-mx-4 md:flex md:items-center md:justify-center md:space-y-0 xl:mt-0">
              
              {/* Essential Plan */}
              <div className="max-w-sm mx-auto border border-slate-700 rounded-2xl md:mx-4 bg-slate-800 transition-transform hover:-translate-y-2 duration-300">
                <div className="p-6">
                  <h2 className="text-xl font-medium text-white capitalize lg:text-2xl">Emprendedor</h2>
                  <p className="mt-4 text-slate-400 text-sm">
                    Ideal para pequeños negocios que buscan digitalizar su inventario.
                  </p>
                  <h2 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">
                    $0.00 <span className="text-base font-medium text-slate-400">/Mes</span>
                  </h2>
                  <p className="mt-1 text-slate-500 text-xs">Plan gratuito para siempre</p>
                  
                  <button className="w-full px-4 py-3 mt-6 font-bold text-white transition-colors bg-slate-700 rounded-full hover:bg-slate-600">
                    Empezar Gratis
                  </button>
                </div>

                <hr className="border-slate-700" />

                <div className="p-6">
                  <h2 className="text-lg font-medium text-white capitalize lg:text-xl">Incluye:</h2>
                  <div className="mt-8 space-y-4">
                    <div className="flex items-center text-slate-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-4 flex-shrink-0" />
                      <span>Punto de Venta Básico</span>
                    </div>
                    <div className="flex items-center text-slate-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-4 flex-shrink-0" />
                      <span>Control de Inventario (hasta 500 ítems)</span>
                    </div>
                    <div className="flex items-center text-slate-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-4 flex-shrink-0" />
                      <span>Soporte por email</span>
                    </div>
                    <div className="flex items-center text-slate-500">
                      <XCircle className="w-5 h-5 text-slate-600 mr-4 flex-shrink-0" />
                      <span className="line-through">Búsqueda visual con IA</span>
                    </div>
                    <div className="flex items-center text-slate-500">
                      <XCircle className="w-5 h-5 text-slate-600 mr-4 flex-shrink-0" />
                      <span className="line-through">Auditoría forense</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Premium Plan */}
              <div className="max-w-sm mx-auto border-2 border-emerald-500 rounded-2xl md:mx-4 bg-slate-800 transition-transform hover:-translate-y-2 duration-300 relative shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-4">
                   <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                     Popular
                   </span>
                </div>
                <div className="p-6">
                  <h2 className="text-xl font-medium text-white capitalize lg:text-2xl">Profesional</h2>
                  <p className="mt-4 text-slate-400 text-sm">
                    Para empresas en crecimiento que requieren herramientas avanzadas e IA.
                  </p>
                  <h2 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">
                    $29.99 <span className="text-base font-medium text-slate-400">/Mes</span>
                  </h2>
                  <p className="mt-1 text-slate-500 text-xs">Facturación anual disponible</p>
                  
                  <button className="w-full px-4 py-3 mt-6 font-bold text-white transition-colors bg-emerald-600 rounded-full hover:bg-emerald-700 shadow-lg shadow-emerald-900/50">
                    Obtener Profesional
                  </button>
                </div>

                <hr className="border-slate-700" />

                <div className="p-6">
                  <h2 className="text-lg font-medium text-white capitalize lg:text-xl">Todo lo anterior, más:</h2>
                  <div className="mt-8 space-y-4">
                    <div className="flex items-center text-slate-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-4 flex-shrink-0" />
                      <span>Ítems ilimitados</span>
                    </div>
                    <div className="flex items-center text-slate-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-4 flex-shrink-0" />
                      <span className="font-semibold text-emerald-400">Búsqueda visual con IA</span>
                    </div>
                    <div className="flex items-center text-slate-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-4 flex-shrink-0" />
                      <span>Reportes avanzados y métricas</span>
                    </div>
                    <div className="flex items-center text-slate-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-4 flex-shrink-0" />
                      <span>Auditoría forense detallada</span>
                    </div>
                    <div className="flex items-center text-slate-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-4 flex-shrink-0" />
                      <span>Soporte prioritario 24/7</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
