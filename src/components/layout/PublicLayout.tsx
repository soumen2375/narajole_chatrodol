import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import ScrollToTopBtn from '@/components/ui/ScrollToTopBtn';
import FloatingWhatsApp from '@/components/ui/FloatingWhatsApp';
import { PageSkeleton } from '@/components/ui/Skeleton';

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-grow">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <ScrollToTopBtn />
      <FloatingWhatsApp />
    </div>
  );
}
