import { motion } from 'framer-motion';

const technologies = [
  "React 18",
  "TypeScript",
  "Vite",
  "Tailwind CSS 4",
  "React Query",
  "Zustand",
  "Framer Motion",
  "PostgreSQL",
  "YOLOv8n AI Vision"
];

export const TechMarquee = () => {
  return (
    <section id="tech" className="py-20 bg-[#FEFAF1] overflow-hidden border-t border-slate-200">
      <div className="flex flex-col text-center pb-10 text-slate-900 max-w-screen-md mx-auto">
        <h2 className="text-4xl font-medium lg:text-7xl">
          Tecnologías que <span className="text-emerald-500 font-bold font-serif italic">usamos</span>
        </h2>
      </div>
      
      <div className="relative flex max-w-[100vw] overflow-hidden group">
        {/* Left/Right Gradients for smooth fade using beige color */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-[#FEFAF1] to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-[#FEFAF1] to-transparent z-10" />

        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ 
            ease: "linear", 
            duration: 30, 
            repeat: Infinity 
          }}
          className="flex whitespace-nowrap gap-16 px-8 items-center"
        >
          {/* Duplicate the array twice to ensure seamless infinite loop */}
          {[...technologies, ...technologies, ...technologies].map((tech, idx) => (
            <span 
              key={idx} 
              className="text-xl md:text-2xl font-bold text-slate-400 hover:text-emerald-600 transition-colors cursor-default"
            >
              {tech}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
