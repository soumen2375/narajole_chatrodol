-- Let finance managers actually edit the records they are allowed to edit.
--
-- The bug: UPDATE on cswo_donations was granted to anon/authenticated on only
-- six columns — cashfree_order_id, razorpay_order_id, razorpay_payment_id,
-- razorpay_signature, status, updated_at — left over from when the browser
-- linked gateway orders directly. Any other update ("allocate this donation to
-- an event", "mark as monthly", "edit this manual entry") was refused by
-- Postgres with `permission denied for table cswo_donations` BEFORE row-level
-- security was ever consulted, so the RLS policy that was supposed to allow it
-- never got a say.
--
-- Gateway linking now goes through cswo_update_donation_gateway_link() (a
-- SECURITY DEFINER RPC), so the narrow column list no longer protects the
-- payment path — it only broke the admin path.
--
-- The fix is to let RLS be the gate, which is what it is for:
--   * cswo_donations_admin_write      → cswo_can_manage_finance() for everything
--   * cswo_donations_public_link_order → still limited to status = 'created'
-- Paid donations therefore stay editable only by finance managers.
--
-- anon is deliberately NOT widened; it keeps its six columns.

GRANT UPDATE ON public.cswo_donations TO authenticated;

-- Same class of bug on monthly dues: the tracker upserts `note` and
-- `recorded_by`, neither of which authenticated could write, so marking a
-- member paid could fail for the signed-in treasurer.
GRANT UPDATE (note, recorded_by) ON public.cswo_monthly_contributions TO authenticated;
