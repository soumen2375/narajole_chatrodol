import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, HeartHandshake, Droplet, Heart, Tent, Sparkles, 
  CheckCircle, Check, Flame, ArrowRight, RefreshCw
} from 'lucide-react';

export type FormMode = 'contact' | 'volunteer' | 'blood_request' | 'donate' | 'blood_camp';

interface AntiGravityFormProps {
  initialMode?: FormMode;
  onSuccessSubmit?: (mode: FormMode, data: Record<string, any>) => void;
  className?: string;
}

export default function AntiGravityForm({ initialMode = 'contact', onSuccessSubmit, className = '' }: AntiGravityFormProps) {
  const [activeMode, setActiveMode] = useState<FormMode>(initialMode);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Card 3D tilt interaction states
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });

  // ------------------------------------------------------------------
  // FORM STATES
  // ------------------------------------------------------------------
  // Contact
  const [contactCategory, setContactCategory] = useState('General');
  const [contactData, setContactData] = useState({ name: '', email: '', subject: '', message: '' });

  // Volunteer
  const [volunteerInterests, setVolunteerInterests] = useState<string[]>(['Tutoring']);
  const [volunteerData, setVolunteerData] = useState({ name: '', email: '', phone: '', availability: 'Weekends', motivation: '' });

  // Blood Request
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [isEmergency, setIsEmergency] = useState(false);
  const [bloodData, setBloodData] = useState({ patientName: '', hospital: '', units: '1', contactNumber: '' });

  // Donate
  const [donateAmount, setDonateAmount] = useState<number>(50);
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [customVal, setCustomVal] = useState('');
  const [frequency, setFrequency] = useState<'one-time' | 'monthly'>('monthly');
  const [donorData, setDonorData] = useState({ name: '', email: '', pan: '' });

  // Blood Camp
  const [campData, setCampData] = useState({ organizer: '', location: '', date: '', donorsEst: '50', phone: '' });

  // Handle Mouse Tilt (Anti-Gravity 3D Tilt Effect)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Smooth tilt calculations
    const rX = ((y - centerY) / centerY) * -6; // max 6 deg rotation
    const rY = ((x - centerX) / centerX) * 6;
    
    setRotateX(rX);
    setRotateY(rY);
    setGlowPos({
      x: Math.round((x / rect.width) * 100),
      y: Math.round((y / rect.height) * 100)
    });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  // Reset submitted state when mode changes
  useEffect(() => {
    setSubmitted(false);
    setIsSubmitting(false);
  }, [activeMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      if (onSuccessSubmit) {
        let payload: Record<string, any> = {};
        if (activeMode === 'contact') payload = { ...contactData, category: contactCategory };
        if (activeMode === 'volunteer') payload = { ...volunteerData, interests: volunteerInterests };
        if (activeMode === 'blood_request') payload = { ...bloodData, bloodGroup, isEmergency };
        if (activeMode === 'donate') payload = { ...donorData, amount: isCustomAmount ? customVal : donateAmount, frequency };
        if (activeMode === 'blood_camp') payload = { ...campData };
        onSuccessSubmit(activeMode, payload);
      }
    }, 1200);
  };

  // Themes per form mode
  const modeThemes = {
    contact: {
      bgGradient: 'from-slate-950 via-slate-900 to-indigo-950',
      glowColor: 'rgba(99, 102, 241, 0.25)',
      borderColor: 'border-indigo-500/30',
      accentText: 'text-indigo-400',
      accentBg: 'bg-indigo-600',
      pillBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      btnGradient: 'from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500',
      title: 'Atmospheric Contact',
      subtitle: 'Send a weightless message through the digital medium'
    },
    volunteer: {
      bgGradient: 'from-slate-950 via-emerald-950 to-teal-950',
      glowColor: 'rgba(16, 185, 129, 0.25)',
      borderColor: 'border-emerald-500/30',
      accentText: 'text-emerald-400',
      accentBg: 'bg-emerald-600',
      pillBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      btnGradient: 'from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500',
      title: 'Volunteer Orbit',
      subtitle: 'Join our floating network of passionate community changemakers'
    },
    blood_request: {
      bgGradient: 'from-slate-950 via-rose-950 to-red-950',
      glowColor: 'rgba(244, 63, 94, 0.3)',
      borderColor: 'border-rose-500/40',
      accentText: 'text-rose-400',
      accentBg: 'bg-rose-600',
      pillBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      btnGradient: 'from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500',
      title: 'Urgent Blood Dispatch',
      subtitle: 'High priority levitating dispatch for critical patient emergencies'
    },
    donate: {
      bgGradient: 'from-slate-950 via-indigo-950 to-amber-950',
      glowColor: 'rgba(245, 158, 11, 0.25)',
      borderColor: 'border-amber-500/30',
      accentText: 'text-amber-400',
      accentBg: 'bg-amber-600',
      pillBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      btnGradient: 'from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600',
      title: 'Liquid Gold Contribution',
      subtitle: 'Fuel humanitarian impact with zero-gravity spatial donations'
    },
    blood_camp: {
      bgGradient: 'from-slate-950 via-blue-950 to-cyan-950',
      glowColor: 'rgba(14, 165, 233, 0.25)',
      borderColor: 'border-sky-500/30',
      accentText: 'text-sky-400',
      accentBg: 'bg-sky-600',
      pillBg: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      btnGradient: 'from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500',
      title: 'Camp Registration Hub',
      subtitle: 'Organize a life-saving blood donation drive in your locality'
    }
  };

  const currentTheme = modeThemes[activeMode];

  return (
    <div className={`relative w-full min-h-[700px] overflow-hidden rounded-3xl bg-gradient-to-br ${currentTheme.bgGradient} p-4 sm:p-8 md:p-12 text-white shadow-2xl transition-all duration-700 ${className}`}>
      
      {/* Dynamic Floating Background Particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl animate-pulse" />
        <div className="absolute top-1/2 right-0 h-96 w-96 rounded-full bg-rose-500/10 blur-3xl animate-pulse delay-1000" />
        <div className="absolute -bottom-24 left-1/3 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl animate-pulse delay-700" />

        {/* Anti-Gravity Floating Particles */}
        <div className="absolute top-12 left-10 h-3 w-3 rounded-full bg-white/20 blur-[1px] animate-bounce duration-[4000ms]" />
        <div className="absolute top-1/3 right-16 h-4 w-4 rounded-full bg-amber-400/20 blur-[1px] animate-bounce duration-[6000ms]" />
        <div className="absolute bottom-20 left-20 h-2 w-2 rounded-full bg-cyan-400/30 blur-[1px] animate-bounce duration-[5000ms]" />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* TOP FLOATING GLASS TAB NAVIGATION PILL BAR */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative z-20 mb-8 flex justify-center">
        <div className="inline-flex max-w-full overflow-x-auto rounded-full border border-white/15 bg-white/5 p-1.5 backdrop-blur-2xl shadow-xl space-x-1 no-scrollbar">
          {[
            { id: 'contact', label: 'Contact', icon: Send },
            { id: 'volunteer', label: 'Volunteer', icon: HeartHandshake },
            { id: 'blood_request', label: 'Blood Request', icon: Droplet },
            { id: 'donate', label: 'Donate', icon: Heart },
            { id: 'blood_camp', label: 'Blood Camp', icon: Tent },
          ].map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveMode(tab.id as FormMode)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-slate-950 shadow-lg shadow-white/20 scale-105 font-bold'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <IconComp className={`h-4 w-4 ${isActive ? 'text-slate-950' : 'text-white/70'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* ANTI-GRAVITY 3D TILT GLASSFORMIC FORM CONTAINER */}
      {/* ------------------------------------------------------------------ */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          transition: 'transform 0.15s ease-out, border-color 0.5s ease',
        }}
        className={`relative z-10 mx-auto max-w-3xl rounded-3xl border ${currentTheme.borderColor} bg-white/[0.04] p-6 sm:p-10 backdrop-blur-2xl shadow-2xl shadow-black/50`}
      >
        {/* Dynamic Light Refraction Gradient Follow */}
        <div
          className="pointer-events-none absolute inset-0 rounded-3xl opacity-40 transition-opacity duration-300"
          style={{
            background: `radial-gradient(600px circle at ${glowPos.x}% ${glowPos.y}%, ${currentTheme.glowColor}, transparent 60%)`,
          }}
        />

        {/* Form Header */}
        <div className="mb-8 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider mb-2 border backdrop-blur-md transition-colors duration-500 style-pill">
            <Sparkles className="h-3.5 w-3.5" />
            <span className={currentTheme.accentText}>{currentTheme.title}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {activeMode === 'contact' && 'Get In Touch With Chhatradol'}
            {activeMode === 'volunteer' && 'Become a Certified Volunteer'}
            {activeMode === 'blood_request' && 'Emergency Blood Request'}
            {activeMode === 'donate' && 'Support Our Social Causes'}
            {activeMode === 'blood_camp' && 'Organize a Blood Donation Drive'}
          </h2>
          <p className="mt-1 text-sm text-white/60">
            {currentTheme.subtitle}
          </p>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* SUCCESS LAUNCH STATE */}
        {/* ------------------------------------------------------------------ */}
        {submitted ? (
          <div className="py-12 text-center animate-fadeIn">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-xl shadow-emerald-500/10 animate-bounce">
              <CheckCircle className="h-10 w-10" />
            </div>
            <h3 className="mt-6 text-2xl font-bold text-white">Submission Transmitted!</h3>
            <p className="mt-2 text-sm text-white/70 max-w-md mx-auto">
              Your data has been weightlessly logged into the Chhatradol system. Our coordinators will connect with you shortly.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-2.5 text-xs font-semibold text-white hover:bg-white/20 transition-all"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Submit Another Request</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* ------------------------------------------------------------------ */}
            {/* 1. CONTACT FORM */}
            {/* ------------------------------------------------------------------ */}
            {activeMode === 'contact' && (
              <>
                {/* Category Chips */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-2">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {['General Inquiry', 'Feedback', 'Partnership', 'Media / Press'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setContactCategory(cat)}
                        className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition-all duration-300 ${
                          contactCategory === cat
                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30 scale-105'
                            : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">Full Name</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Rahul Maity"
                      value={contactData.name}
                      onChange={(e) => setContactData({ ...contactData, name: e.target.value })}
                      className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-indigo-400 focus:bg-white/10 focus:outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">Email Address</label>
                    <input
                      required
                      type="email"
                      placeholder="rahul@example.com"
                      value={contactData.email}
                      onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
                      className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-indigo-400 focus:bg-white/10 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1">Subject</label>
                  <input
                    required
                    type="text"
                    placeholder="How can we assist you?"
                    value={contactData.subject}
                    onChange={(e) => setContactData({ ...contactData, subject: e.target.value })}
                    className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-indigo-400 focus:bg-white/10 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1">Message</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Type your message here..."
                    value={contactData.message}
                    onChange={(e) => setContactData({ ...contactData, message: e.target.value })}
                    className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-indigo-400 focus:bg-white/10 focus:outline-none transition-all resize-none"
                  />
                </div>
              </>
            )}

            {/* ------------------------------------------------------------------ */}
            {/* 2. VOLUNTEER SIGN-UP FORM */}
            {/* ------------------------------------------------------------------ */}
            {activeMode === 'volunteer' && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">Full Name</label>
                    <input
                      required
                      type="text"
                      placeholder="Your Full Name"
                      value={volunteerData.name}
                      onChange={(e) => setVolunteerData({ ...volunteerData, name: e.target.value })}
                      className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-emerald-400 focus:outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">Phone Number</label>
                    <input
                      required
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={volunteerData.phone}
                      onChange={(e) => setVolunteerData({ ...volunteerData, phone: e.target.value })}
                      className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-emerald-400 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Interest Selection Orbit Grid */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-2">Areas of Interest (Click to Lift into Orbit)</label>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {[
                      'Blood Donation', 'Free Tutoring', 'Health Camps', 
                      'Environment & Trees', 'Women & Child Safety', 'Disaster Relief'
                    ].map((interest) => {
                      const isSelected = volunteerInterests.includes(interest);
                      return (
                        <button
                          key={interest}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setVolunteerInterests(volunteerInterests.filter(i => i !== interest));
                            } else {
                              setVolunteerInterests([...volunteerInterests, interest]);
                            }
                          }}
                          className={`flex items-center justify-between rounded-2xl p-3 text-xs font-medium border transition-all duration-300 ${
                            isSelected
                              ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400 -translate-y-1.5 shadow-lg shadow-emerald-500/20'
                              : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:-translate-y-0.5'
                          }`}
                        >
                          <span>{interest}</span>
                          {isSelected && <Check className="h-4 w-4 text-emerald-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Availability */}
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1">Availability</label>
                  <select
                    value={volunteerData.availability}
                    onChange={(e) => setVolunteerData({ ...volunteerData, availability: e.target.value })}
                    className="w-full rounded-2xl border border-white/15 bg-slate-900 px-4 py-3 text-sm text-white focus:border-emerald-400 focus:outline-none"
                  >
                    <option value="Weekends">Weekends Only</option>
                    <option value="Weekdays">Weekdays</option>
                    <option value="Evenings">Evenings</option>
                    <option value="Flexible / On-Call">Flexible / On-Call Emergency</option>
                  </select>
                </div>
              </>
            )}

            {/* ------------------------------------------------------------------ */}
            {/* 3. BLOOD REQUEST FORM */}
            {/* ------------------------------------------------------------------ */}
            {activeMode === 'blood_request' && (
              <>
                {/* Emergency Toggle */}
                <div className="flex items-center justify-between rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isEmergency ? 'bg-rose-600 text-white animate-pulse' : 'bg-white/10 text-white/60'}`}>
                      <Flame className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Immediate Emergency Request</h4>
                      <p className="text-xs text-white/60">Triggers urgent alert to active voluntary donors nearby</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEmergency(!isEmergency)}
                    className={`h-6 w-11 rounded-full p-1 transition-colors ${isEmergency ? 'bg-rose-600' : 'bg-white/20'}`}
                  >
                    <div className={`h-4 w-4 rounded-full bg-white transition-transform ${isEmergency ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Blood Group Floating Pills */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-2">Required Blood Group</label>
                  <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-8">
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((grp) => (
                      <button
                        key={grp}
                        type="button"
                        onClick={() => setBloodGroup(grp)}
                        className={`flex h-12 items-center justify-center rounded-2xl font-mono text-sm font-bold border transition-all duration-300 ${
                          bloodGroup === grp
                            ? 'bg-rose-600 text-white border-rose-400 scale-110 shadow-lg shadow-rose-600/40'
                            : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {grp}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">Patient Name</label>
                    <input
                      required
                      type="text"
                      placeholder="Patient Full Name"
                      value={bloodData.patientName}
                      onChange={(e) => setBloodData({ ...bloodData, patientName: e.target.value })}
                      className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-rose-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">Hospital Location</label>
                    <input
                      required
                      type="text"
                      placeholder="Hospital & City Name"
                      value={bloodData.hospital}
                      onChange={(e) => setBloodData({ ...bloodData, hospital: e.target.value })}
                      className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-rose-400 focus:outline-none"
                    />
                  </div>
                </div>
              </>
            )}

            {/* ------------------------------------------------------------------ */}
            {/* 4. DONATE FORM */}
            {/* ------------------------------------------------------------------ */}
            {activeMode === 'donate' && (
              <>
                {/* Frequency Toggle */}
                <div className="flex justify-center mb-4">
                  <div className="inline-flex rounded-full bg-white/10 p-1 border border-white/15">
                    <button
                      type="button"
                      onClick={() => setFrequency('monthly')}
                      className={`rounded-full px-5 py-1.5 text-xs font-bold transition-all ${frequency === 'monthly' ? 'bg-amber-500 text-stone-950 shadow-md' : 'text-white/70'}`}
                    >
                      Monthly Contribution
                    </button>
                    <button
                      type="button"
                      onClick={() => setFrequency('one-time')}
                      className={`rounded-full px-5 py-1.5 text-xs font-bold transition-all ${frequency === 'one-time' ? 'bg-amber-500 text-stone-950 shadow-md' : 'text-white/70'}`}
                    >
                      One-Time Donation
                    </button>
                  </div>
                </div>

                {/* Amount Selector Preset */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-2">Select Donation Amount</label>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {[25, 50, 100, 250].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => { setDonateAmount(amt); setIsCustomAmount(false); }}
                        className={`flex h-14 flex-col items-center justify-center rounded-2xl border transition-all duration-300 ${
                          !isCustomAmount && donateAmount === amt
                            ? 'bg-amber-500 text-stone-950 border-amber-400 font-extrabold scale-105 shadow-lg shadow-amber-500/30'
                            : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <span className="text-lg font-bold">₹{amt * 80}</span>
                        <span className="text-[10px] opacity-70">(${amt})</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setIsCustomAmount(true)}
                      className={`flex h-14 flex-col items-center justify-center rounded-2xl border transition-all duration-300 ${
                        isCustomAmount
                          ? 'bg-amber-500 text-stone-950 border-amber-400 font-extrabold scale-105 shadow-lg shadow-amber-500/30'
                          : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-sm font-bold">Custom</span>
                    </button>
                  </div>
                  {isCustomAmount && (
                    <div className="mt-3">
                      <input
                        type="number"
                        placeholder="Enter custom amount in ₹"
                        value={customVal}
                        onChange={(e) => setCustomVal(e.target.value)}
                        className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Donor Details */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">Donor Name</label>
                    <input
                      required
                      type="text"
                      placeholder="Your Full Name"
                      value={donorData.name}
                      onChange={(e) => setDonorData({ ...donorData, name: e.target.value })}
                      className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">Email (for 80G tax receipt)</label>
                    <input
                      required
                      type="email"
                      placeholder="donor@example.com"
                      value={donorData.email}
                      onChange={(e) => setDonorData({ ...donorData, email: e.target.value })}
                      className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>
              </>
            )}

            {/* ------------------------------------------------------------------ */}
            {/* 5. BLOOD CAMP REGISTRATION FORM */}
            {/* ------------------------------------------------------------------ */}
            {activeMode === 'blood_camp' && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">Organizer / Club Name</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Narajole Youth Club"
                      value={campData.organizer}
                      onChange={(e) => setCampData({ ...campData, organizer: e.target.value })}
                      className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">Contact Phone</label>
                    <input
                      required
                      type="tel"
                      placeholder="+91 78110 73412"
                      value={campData.phone}
                      onChange={(e) => setCampData({ ...campData, phone: e.target.value })}
                      className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">Proposed Location</label>
                    <input
                      required
                      type="text"
                      placeholder="Venue Address / Village"
                      value={campData.location}
                      onChange={(e) => setCampData({ ...campData, location: e.target.value })}
                      className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1">Estimated Donors</label>
                    <input
                      required
                      type="number"
                      placeholder="e.g. 50"
                      value={campData.donorsEst}
                      onChange={(e) => setCampData({ ...campData, donorsEst: e.target.value })}
                      className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                </div>
              </>
            )}

            {/* ------------------------------------------------------------------ */}
            {/* SUBMIT BUTTON WITH ANTI-GRAVITY GLOW & LAUNCH PULSE */}
            {/* ------------------------------------------------------------------ */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`relative w-full overflow-hidden rounded-2xl bg-gradient-to-r ${currentTheme.btnGradient} py-4 text-sm font-bold text-white shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98] disabled:opacity-50`}
              >
                <div className="relative z-10 flex items-center justify-center gap-2">
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      <span>Transmitting via Anti-Gravity Link...</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {activeMode === 'contact' && 'Send Anti-Gravity Message'}
                        {activeMode === 'volunteer' && 'Submit Volunteer Application'}
                        {activeMode === 'blood_request' && 'Dispatch Urgent Blood Request'}
                        {activeMode === 'donate' && 'Proceed to Secure Payment'}
                        {activeMode === 'blood_camp' && 'Register Blood Camp Application'}
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </div>
              </button>
            </div>

          </form>
        )}
      </div>

    </div>
  );
}
