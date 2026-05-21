import { LegalLayout, List, Section } from '@/components/legal/Legal';
import { ORG } from '@/data/content';

export default function Refunds() {
  return (
    <LegalLayout title="Cancellation & Refund Policy">
      <p>
        This policy explains how cancellations and refunds are handled for contributions and donations made to{' '}
        <strong>{ORG.nameEn}</strong> through this website.
      </p>

      <Section heading="1. Nature of donations">
        <p>
          Donations and monthly contributions to the Organisation are voluntary charitable gifts. As they are applied
          towards charitable activities, they are generally <strong>non-refundable</strong> once successfully processed.
        </p>
      </Section>

      <Section heading="2. Erroneous or duplicate payments">
        <p>
          We understand that mistakes can happen. A refund may be considered in the following cases:
        </p>
        <List
          items={[
            'an amount was charged more than once for the same transaction (duplicate payment);',
            'an incorrect amount was charged due to a technical error;',
            'a payment was made in error and is reported promptly.',
          ]}
        />
      </Section>

      <Section heading="3. How to request a refund">
        <List
          items={[
            <>
              Email us at{' '}
              <a href={`mailto:${ORG.email}`} className="text-blue-600 hover:underline">{ORG.email}</a> within{' '}
              <strong>7 days</strong> of the transaction.
            </>,
            'Include the donor name, registered email/phone, transaction date, amount, and the Razorpay payment ID.',
            'Our team will verify the transaction and respond, usually within 3–5 business days.',
          ]}
        />
      </Section>

      <Section heading="4. Refund processing">
        <p>
          Approved refunds are processed back to the original payment method through Razorpay. Once initiated, it
          typically takes <strong>5–7 business days</strong> for the amount to reflect, depending on your bank or card
          issuer. No cancellation or processing fee is charged by the Organisation for genuine erroneous transactions.
        </p>
      </Section>

      <Section heading="5. Recurring / monthly contributions">
        <p>
          Monthly contributions are paid by members for individual months. A future month that has not yet been paid is
          simply not charged. Already-completed monthly payments follow the same refund rules as above.
        </p>
      </Section>

      <Section heading="6. Contact">
        <p>
          For any questions about cancellations or refunds, please contact us using the details below.
        </p>
      </Section>
    </LegalLayout>
  );
}
