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
  signIn: (email: string, password: string) => Promise<Member>;
  signOut: () => Promise<void>;
  refreshMember: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const CACHE_KEY = 'cswo_member_cache';
const FETCH_TIMEOUT_MS = 10000; // 10s — covers Supabase cold-start on free tier

function readCache(userId: string): Member | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { userId: string; member: Member };
    return parsed.userId === userId ? parsed.member : null;
  } catch {
    return null;
  }
}

function writeCache(userId: string, member: Member | null) {
  try {
    if (member) localStorage.setItem(CACHE_KEY, JSON.stringify({ userId, member }));
    else localStorage.removeItem(CACHE_KEY);
  } catch { /* ignore */ }
}

// Wraps a thenable (including Supabase query builders) with a hard timeout.
function withTimeout<T>(thenable: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    Promise.resolve(thenable),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('request_timeout')), ms),
    ),
  ]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMember = useCallback(async (userId: string): Promise<Member | null> => {
    try {
      // Convert the Supabase thenable to a real Promise so Promise.race works
      const query: Promise<{ data: Member | null; error: { message: string } | null }> =
        Promise.resolve(
          supabase.from('cswo_members').select('*').eq('id', userId).maybeSingle() as PromiseLike<{ data: Member | null; error: { message: string } | null }>
        );

      const { data, error } = await withTimeout(query, FETCH_TIMEOUT_MS);
      if (error) {
        console.error('Failed to load member profile', error.message);
        return null;
      }
      const m = data ?? null;
      writeCache(userId, m);
      return m;
    } catch (err) {
      console.warn('fetchMember:', err instanceof Error ? err.message : err);
      return null;
    }
  }, []);

  const refreshMember = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) setMember(await fetchMember(data.user.id));
  }, [fetchMember]);

  useEffect(() => {
    let active = true;

    // Safety net: never show spinner for more than 12 seconds.
    const safetyTimer = setTimeout(() => {
      if (active) setLoading(false);
    }, 12000);

    (async () => {
      try {
        const { data } = await withTimeout(supabase.auth.getSession(), FETCH_TIMEOUT_MS);
        if (!active) return;
        setSession(data.session);
        const uid = data.session?.user?.id;
        if (uid) {
          // Show cached data instantly, then revalidate silently.
          const cached = readCache(uid);
          if (cached) {
            setMember(cached);
            setLoading(false);
            fetchMember(uid).then((fresh) => active && fresh && setMember(fresh));
            return;
          }
          setMember(await fetchMember(uid));
        }
      } catch {
        /* network error or timeout — let finally clear loading */
      } finally {
        clearTimeout(safetyTimer);
        if (active) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!active) return;
      setSession(newSession);
      if (newSession?.user) {
        const cached = readCache(newSession.user.id);
        if (cached) setMember(cached);
        const fresh = await fetchMember(newSession.user.id);
        if (active && fresh) setMember(fresh);
      } else {
        setMember(null);
      }
    });

    return () => {
      active = false;
      clearTimeout(safetyTimer);
      sub.subscription.unsubscribe();
    };
  }, [fetchMember]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email: email.trim(), password }),
        FETCH_TIMEOUT_MS,
      );
      if (error) throw new Error(translateAuthError(error.message));
      if (!data.user) throw new Error('Login failed.');

      const profile = await fetchMember(data.user.id);
      if (!profile) {
        await supabase.auth.signOut();
        throw new Error('No member profile found. Please contact an administrator. / সদস্য প্রোফাইল নেই, অ্যাডমিনের সাথে যোগাযোগ করুন।');
      }
      if (profile.role !== 'admin' && profile.status !== 'approved') {
        await supabase.auth.signOut();
        const msg =
          profile.status === 'pending'
            ? 'Your account is awaiting approval. / আপনার অ্যাকাউন্ট অনুমোদনের অপেক্ষায় আছে।'
            : 'Your account is not active. Please contact an administrator. / আপনার অ্যাকাউন্ট সক্রিয় নয়।';
        throw new Error(msg);
      }
      setMember(profile);
      return profile;
    },
    [fetchMember],
  );

  const signOut = useCallback(async () => {
    writeCache('', null);
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
    return 'Wrong email or password. / ভুল ইমেল বা পাসওয়ার্ড।';
  }
  if (message === 'request_timeout') {
    return 'Connection timed out. Check your internet. / সংযোগ বিলম্বিত হয়েছে।';
  }
  return message;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
