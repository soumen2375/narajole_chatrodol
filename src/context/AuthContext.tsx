import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Member } from '@/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  member: Member | null;
  loading: boolean;
  isAdmin: boolean;
  isApproved: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMember: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMember = useCallback(async (userId: string): Promise<Member | null> => {
    const { data, error } = await supabase
      .from('cswo_members')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load member profile', error.message);
      return null;
    }
    return data as Member | null;
  }, []);

  const refreshMember = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      setMember(await fetchMember(data.user.id));
    }
  }, [fetchMember]);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) {
        setMember(await fetchMember(data.session.user.id));
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!active) return;
      setSession(newSession);
      if (newSession?.user) {
        setMember(await fetchMember(newSession.user.id));
      } else {
        setMember(null);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [fetchMember]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw new Error(translateAuthError(error.message));
      if (!data.user) throw new Error('লগইন ব্যর্থ হয়েছে।');

      const profile = await fetchMember(data.user.id);
      if (!profile) {
        await supabase.auth.signOut();
        throw new Error('আপনার কোনো সদস্য প্রোফাইল নেই। অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।');
      }
      if (profile.role !== 'admin' && profile.status !== 'approved') {
        await supabase.auth.signOut();
        const msg =
          profile.status === 'pending'
            ? 'আপনার অ্যাকাউন্ট এখনও অনুমোদনের অপেক্ষায় আছে। অ্যাডমিন অনুমোদন করলে আপনি লগইন করতে পারবেন।'
            : 'আপনার অ্যাকাউন্ট সক্রিয় নয়। অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।';
        throw new Error(msg);
      }
      setMember(profile);
    },
    [fetchMember],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setMember(null);
    setSession(null);
  }, []);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    member,
    loading,
    isAdmin: member?.role === 'admin' && member?.status === 'approved',
    isApproved: member?.status === 'approved',
    signIn,
    signOut,
    refreshMember,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function translateAuthError(message: string): string {
  if (message.toLowerCase().includes('invalid login credentials')) {
    return 'ভুল ইমেল বা পাসওয়ার্ড।';
  }
  if (message.toLowerCase().includes('email not confirmed')) {
    return 'ইমেল এখনও নিশ্চিত করা হয়নি।';
  }
  return message;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
