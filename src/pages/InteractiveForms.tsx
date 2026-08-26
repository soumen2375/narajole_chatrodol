import { PageShell } from './_field-journal';
import Breadcrumb from '@/components/ui/Breadcrumb';
import AntiGravityForm from '@/components/ui/AntiGravityForm';
import { Sparkles } from 'lucide-react';

export default function InteractiveForms() {
  return (
    <PageShell>
      <Breadcrumb title="Anti-Gravity Dynamic Forms" />
      
      {/* Header */}
      <section className="bg-site-green-2 text-white py-12 px-6 sm:px-10 text-center border-b border-white/10">
        <div className="mx-auto max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-site-line bg-site-cream px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-site-green mb-4 backdrop-blur-md">
            <Sparkles className="h-4 w-4" />
            <span>Interactive Micro-Interactions Engine</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Anti-Gravity Dynamic Forms
          </h1>
          <p className="mt-4 text-sm sm:text-base text-site-faint max-w-2xl mx-auto leading-relaxed">
            Experience fluid motion, weightless levitation physics, 3D mouse tracking, and zero-gravity glassmorphic UI across 5 custom form modes.
          </p>
        </div>
      </section>

      {/* Main Interactive Form Container */}
      <section className="bg-site-green-2 py-12 px-4 sm:px-8 md:px-12 min-h-screen">
        <div className="mx-auto max-w-5xl">
          <AntiGravityForm initialMode="volunteer" />
        </div>
      </section>
    </PageShell>
  );
}
