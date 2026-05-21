import { LegalLayout, Section } from '@/components/legal/Legal';
import { ORG } from '@/data/content';

export default function Shipping() {
  return (
    <LegalLayout title="Shipping & Delivery Policy">
      <p>
        <strong>{ORG.nameEn}</strong> is a non-profit public charitable trust. We do not sell any physical products,
        and therefore <strong>no goods are shipped or delivered</strong> as part of any transaction on this website.
      </p>

      <Section heading="1. Donations are digital transactions">
        <p>
          All payments made through this website are voluntary charitable donations or membership contributions. These
          are processed online and do not involve the sale, shipping or physical delivery of any product or merchandise.
        </p>
      </Section>

      <Section heading="2. Acknowledgements & receipts">
        <p>
          On successful payment, a digital acknowledgement/receipt is generated and made available to the donor through
          email or the contact details provided. There is no physical dispatch involved, so there are no shipping
          charges or delivery timelines applicable.
        </p>
      </Section>

      <Section heading="3. Distribution of relief materials">
        <p>
          As part of its charitable work, the Organisation may distribute relief materials (such as clothing, food,
          books or medical supplies) directly to beneficiaries in need. Such distribution is a charitable activity and
          is not a sale or shipment to donors or website users.
        </p>
      </Section>

      <Section heading="4. Contact">
        <p>For any clarification regarding this policy, please contact us using the details below.</p>
      </Section>
    </LegalLayout>
  );
}
