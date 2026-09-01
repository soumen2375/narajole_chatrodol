-- Drop "Annual Audit" and "GST Registration" from the statutory register.
--
-- Both were seeded by 0020 as part of a generic NGO checklist, but neither
-- applies to this trust: the annual audit lives in the document vault as a
-- file rather than as a registration with a number and an expiry, and the
-- organisation is not GST-registered.
--
-- The register is now fully editable from /admin/compliance (create, edit and
-- delete), so this migration only exists so a freshly provisioned database
-- does not reintroduce the two rows that 0020 would otherwise seed.
--
-- Scoped by ckey, which is the register's stable natural key. Rows an admin
-- added by hand ('custom-…') are untouched.

DELETE FROM public.cswo_compliance
 WHERE ckey IN ('audit', 'gst');
