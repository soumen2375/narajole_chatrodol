-- The cswo-media bucket accepted 200 KB, which nothing the office actually
-- uploads is smaller than: a photograph off a phone is megabytes, and the
-- scanned stamped copy of a letter — the whole point of the "signed copy"
-- button — is never that small. Uploads failed with Storage's own message,
-- "The object exceeded the maximum allowed size", and no signed copy had
-- ever been filed.
--
-- Letter pictures are redrawn at print size in the browser before they are
-- uploaded (src/lib/letter-image.ts), so this ceiling is not what keeps them
-- small; it is here so a scan or an untouched original is not refused.

UPDATE storage.buckets
   SET file_size_limit = 5 * 1024 * 1024
 WHERE id = 'cswo-media'
   AND coalesce(file_size_limit, 0) < 5 * 1024 * 1024;
