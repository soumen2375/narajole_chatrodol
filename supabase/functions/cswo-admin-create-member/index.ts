import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader) return json({ error: 'অননুমোদিত।' }, 401);

    // Identify the caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: 'অননুমোদিত।' }, 401);

    const admin = createClient(supabaseUrl, serviceKey);

    // Verify caller is an approved admin
    const { data: caller } = await admin
      .from('cswo_members')
      .select('role,status')
      .eq('id', userData.user.id)
      .maybeSingle();
    if (!caller || caller.role !== 'admin' || caller.status !== 'approved') {
      return json({ error: 'শুধুমাত্র অ্যাডমিন নতুন সদস্য তৈরি করতে পারেন।' }, 403);
    }

    const body = await req.json();
    const full_name = String(body.full_name ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const phone = body.phone ? String(body.phone).trim() : null;
    const designation = body.designation ? String(body.designation).trim() : null;
    const role = body.role === 'admin' ? 'admin' : 'member';

    if (!full_name || !email || password.length < 6) {
      return json({ error: 'নাম, ইমেল ও কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড আবশ্যক।' }, 400);
    }

    // Create the auth user
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (createErr || !created.user) {
      return json({ error: createErr?.message ?? 'ব্যবহারকারী তৈরি ব্যর্থ হয়েছে।' }, 400);
    }

    // Create the member profile (approved)
    const { error: memberErr } = await admin.from('cswo_members').insert({
      id: created.user.id,
      full_name,
      email,
      phone,
      designation,
      role,
      status: 'approved',
    });
    if (memberErr) {
      // rollback the auth user to avoid orphans
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: memberErr.message }, 400);
    }

    return json({ ok: true, id: created.user.id });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'সার্ভার ত্রুটি।' }, 500);
  }
});
