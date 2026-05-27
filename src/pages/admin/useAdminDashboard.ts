import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type ActivityKind = 'event' | 'donation' | 'post' | 'attendance' | 'contribution' | 'volunteer';

export interface QueueItem {
  id: string;
  kind: 'member' | 'post';
  title: string;
  sub: string;
  at: string;
}

export interface Activity {
  id: string;
  kind: ActivityKind;
  name: string;
  extra: string;
  at: string;
}

export interface MixSeg {
  key: string;
  value: number;
  color: string;
}

export interface AdminDashboardData {
  loading: boolean;
  error: string | null;
  membersTotal: number;
  membersDelta: number;
  membersSpark: number[];
  postsPublished: number;
  postsDelta: number;
  postsSpark: number[];
  eventsYear: number;
  eventsDelta: number;
  eventsSpark: number[];
  donationsYtd: number;
  donationsDeltaPct: number | null;
  donationsSpark: number[];
  pendingMembers: number;
  duesDue: number;
  messages: number;
  volunteers: number;
  donationsWeekly: number[];
  membersCumulative: number[];
  bestWeek: { index: number; value: number };
  avgWeekly: number;
  newMembers: number;
  queue: QueueItem[];
  activity: Activity[];
  mix: { segments: MixSeg[]; total: number; mode: 'donations' | 'posts' };
  refresh: () => void;
}

const EMPTY: Omit<AdminDashboardData, 'refresh'> = {
  loading: true,
  error: null,
  membersTotal: 0, membersDelta: 0, membersSpark: [],
  postsPublished: 0, postsDelta: 0, postsSpark: [],
  eventsYear: 0, eventsDelta: 0, eventsSpark: [],
  donationsYtd: 0, donationsDeltaPct: null, donationsSpark: [],
  pendingMembers: 0, duesDue: 0, messages: 0, volunteers: 0,
  donationsWeekly: [], membersCumulative: [],
  bestWeek: { index: 0, value: 0 }, avgWeekly: 0, newMembers: 0,
  queue: [], activity: [],
  mix: { segments: [], total: 0, mode: 'donations' },
};

export function useAdminDashboard(): AdminDashboardData {
  const [data, setData] = useState<Omit<AdminDashboardData, 'refresh'>>(EMPTY);

  const load = useCallback(async () => {
    const { data: res, error } = await supabase.rpc('cswo_get_admin_dashboard_metrics', {
      p_now: new Date().toISOString(),
    });

    if (error) {
      setData({
        ...EMPTY,
        loading: false,
        error: error.message,
      });
      return;
    }

    setData({
      loading: false,
      error: null,
      ...res,
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  return { ...data, refresh: load };
}

