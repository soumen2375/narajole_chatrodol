import { ButtonLink } from './Button';

/** Yellow 48px-radius band that sits above the footer on every page. */
export default function CtaBand() {
  return (
    <section className="px-5 pb-16 pt-4 sm:px-8">
      <div className="mx-auto flex w-full max-w-site flex-wrap items-center justify-between gap-8 rounded-panel bg-site-yellow px-7 py-10 sm:px-14 sm:py-13 md:px-14 md:py-[52px]">
        <div>
          <h2 className="font-archivo text-[clamp(24px,3vw,38px)] font-bold leading-[1.15] tracking-[-0.02em] text-site-ink">
            Every camp needs one more pair of hands
          </h2>
          <p className="mt-3 max-w-xl font-dmsans text-[15.5px] leading-[1.7] text-[#3b3413]">
            Donate, volunteer, or simply register as a blood donor — it takes under three minutes.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink to="/donate" variant="green">
            Donate now
          </ButtonLink>
          <ButtonLink to="/blood-request" variant="ghost-dark">
            Need blood?
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
