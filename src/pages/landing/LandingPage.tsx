import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { HeaderSticky } from './HeaderSticky';
import { HeroSection } from './HeroSection';
import { FeaturesGrid } from './FeaturesGrid';
import { FunctionalitiesExposition } from './FunctionalitiesExposition';
import { TechMarquee } from './TechMarquee';
import { FooterCTA } from './FooterCTA';

export const LandingPage = () => {
  const { isAuthenticated } = useAuth();

  // If authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-[#FEFAF1] text-slate-900 font-sans selection:bg-emerald-500/30">
      <HeaderSticky />
      
      <main>
        <HeroSection />
        <FeaturesGrid />
        <FunctionalitiesExposition />
        <TechMarquee />
        <FooterCTA />
      </main>
    </div>
  );
};
