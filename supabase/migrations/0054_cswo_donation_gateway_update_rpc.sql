-- ══════════════════════════════════════════════════════════════════════════════
-- 0054_cswo_donation_gateway_update_rpc.sql
--
-- PostgREST needs a SELECT policy to determine the affected-row count for
-- UPDATE/PATCH requests, even when the client doesn't request the row back
-- (return=minimal). Anonymous donors deliberately have no SELECT policy at
-- all (one would leak every pending donor's name/email/phone to any
-- visitor), so every client-side "attach the gateway order id" /
-- "mark cancelled on dismiss" update was silently a no-op — proven live via
-- a real ngrok test donation: it stayed linked to no cashfree_order_id, so
-- server-side verification could never find it and timed out.
--
-- Fix: route these narrow, specific transitions through a SECURITY DEFINER
-- RPC instead of raw table UPDATE. It bypasses RLS/the SELECT-policy
-- requirement entirely (runs as the function owner), while still being far
-- more restrictive than opening table UPDATE ever could be: only the gateway
-- order id and status columns can move, only forward from 'created' to
-- 'created'/'failed'/'cancelled' — never to 'paid' (that stays exclusive to
-- the server-side finalizePayment()).
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.cswo_update_donation_gateway_link(
  p_donation_id uuid,
  p_gateway text,
  p_order_id text,
  p_status text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_status NOT IN ('created', 'failed', 'cancelled') THEN
    RAISE EXCEPTION 'invalid status for client-side donation update: %', p_status;
  END IF;

  IF p_gateway = 'cashfree' THEN
    UPDATE public.cswo_donations
      SET cashfree_order_id = COALESCE(p_order_id, cashfree_order_id),
          status = p_status::cswo_payment_status,
          updated_at = now()
      WHERE id = p_donation_id AND status = 'created';
  ELSIF p_gateway = 'razorpay' THEN
    UPDATE public.cswo_donations
      SET razorpay_order_id = COALESCE(p_order_id, razorpay_order_id),
          status = p_status::cswo_payment_status,
          updated_at = now()
      WHERE id = p_donation_id AND status = 'created';
  ELSE
    RAISE EXCEPTION 'invalid gateway: %', p_gateway;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cswo_update_donation_gateway_link(uuid, text, text, text)
  TO anon, authenticated;
