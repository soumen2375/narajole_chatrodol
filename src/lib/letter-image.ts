/**
 * letter-image.ts — getting a picture ready for the letterhead.
 *
 * Two ceilings meet here. The body column is 169 mm wide, so nothing above
 * about 1400 pixels across can be told apart on paper; and the cswo-media
 * bucket refuses anything over its own limit — which was 200 KB until a
 * photograph off a phone met it and came back as "The object exceeded the
 * maximum allowed size", true but not much help to the secretary.
 *
 * So the picture is redrawn at print size and re-encoded until it fits, which
 * is exactly what the office would otherwise be doing by hand in an online
 * image resizer before coming back to the letter.
 *
 * The result is always a JPEG on a white ground: the sheet is white paper, a
 * transparent PNG has nothing to be transparent against, and JPEG is what
 * carries a photograph at this size without spending the whole budget.
 */

/**
 * The widest a picture is ever printed.
 *
 * A picture on a page of its own covers the whole 210 mm sheet, so the ceiling
 * is set for that rather than for the 169 mm body column: 1800 px across A4 is
 * a little over 210 dpi, which is as much as the paper will show.
 */
export const PRINT_MAX_PX = 1800;

/**
 * What a picture may weigh once it has been sized for print.
 *
 * The bucket itself allows 5 MB (migration 0067). This is the smaller,
 * self-imposed budget: a 1400-pixel photograph at good quality lands well
 * under it, so in practice the first rung of the ladder is the one used and
 * nothing is degraded for the sake of a limit nobody is near.
 */
export const UPLOAD_MAX_BYTES = 1_500 * 1024;

/**
 * Sizes and qualities to try, in order. The first that fits is used, so a
 * small picture keeps its detail and only a large one is pushed down.
 */
const LADDER = [
  { px: 1800, quality: 0.86 },
  { px: 1800, quality: 0.74 },
  { px: 1400, quality: 0.78 },
  { px: 1150, quality: 0.74 },
  { px: 950, quality: 0.70 },
  { px: 750, quality: 0.62 },
] as const;

interface Source { width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; done: () => void }

/** Decodes the file, by whichever route the browser offers. */
async function decode(file: File): Promise<Source> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
        done: () => bitmap.close(),
      };
    } catch {
      // Fall through to the <img> route.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('That file could not be read as a picture.'));
      el.src = url;
    });
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      draw: (ctx, w, h) => ctx.drawImage(image, 0, 0, w, h),
      done: () => URL.revokeObjectURL(url),
    };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

/**
 * Returns the picture as it should be uploaded: at most PRINT_MAX_PX across
 * and, wherever the browser can manage it, under the bucket's limit.
 *
 * A picture that is already small enough, in both senses, is handed back
 * untouched — re-encoding a small PNG would only cost it sharpness.
 */
export async function fitImageForLetter(file: File): Promise<File> {
  const source = await decode(file);
  try {
    const longest = Math.max(source.width, source.height);
    if (file.size <= UPLOAD_MAX_BYTES && longest <= PRINT_MAX_PX) return file;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    let smallest: Blob | null = null;

    for (const step of LADDER) {
      const scale = Math.min(1, step.px / longest);
      canvas.width = Math.max(1, Math.round(source.width * scale));
      canvas.height = Math.max(1, Math.round(source.height * scale));

      // The sheet is white; a transparent corner would otherwise come out
      // black once the picture is a JPEG.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingQuality = 'high';
      source.draw(ctx, canvas.width, canvas.height);

      const blob = await encode(canvas, step.quality);
      if (!blob) break;
      smallest = blob;
      if (blob.size <= UPLOAD_MAX_BYTES) break;
    }

    if (!smallest || smallest.size >= file.size) return file;

    const base = file.name.replace(/\.[^.]+$/, '') || 'picture';
    return new File([smallest], `${base}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } finally {
    source.done();
  }
}

/** A size in the units the office thinks in. */
export function readableSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
