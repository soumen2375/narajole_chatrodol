import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import CtaBand from '@/components/site/CtaBand';
import ScrollToTopBtn from '@/components/ui/ScrollToTopBtn';
import FloatingWhatsApp from '@/components/ui/FloatingWhatsApp';
import { PageSkeleton } from '@/components/ui/Skeleton';

export default function PublicLayout() {
  return (
    <div className="site-shell flex min-h-screen flex-col bg-site-cream">
      <Header />
      <main className="flex-grow">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
      <CtaBand />
      <Footer />
      <ScrollToTopBtn />
      <FloatingWhatsApp />
    </div>
  );
}
