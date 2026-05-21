import { LegalLayout, List, Section } from '@/components/legal/Legal';
import { ORG } from '@/data/content';

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>
        <strong>{ORG.nameEn}</strong> ("we", "us", "our") respects your privacy and is committed to protecting the
        personal information you share with us. This Privacy Policy explains what we collect, how we use it, and your
        rights.
      </p>

      <Section heading="1. Information we collect">
        <List
          items={[
            'Contact details you provide — name, email address, phone number and postal address.',
            'Member profile information — designation, blood group, photograph (if provided), and activity records such as attendance and contributions.',
            'Donation details — amount, purpose, and a payment reference. Payments are handled by Razorpay; we do not collect or store your card/UPI/bank credentials.',
            'Messages and applications you submit through our contact or volunteer forms.',
            'Limited technical data stored in your browser (e.g. login session and language preference).',
          ]}
        />
      </Section>

      <Section heading="2. How we use your information">
        <List
          items={[
            'to operate the website and member/administrator portals;',
            'to process donations and monthly contributions and to issue receipts;',
            'to record attendance, activities and other membership information;',
            'to respond to your enquiries and volunteer applications;',
            'to comply with legal, accounting and audit obligations.',
          ]}
        />
      </Section>

      <Section heading="3. Payment processing">
        <p>
          Online payments are processed by <strong>Razorpay</strong>, a PCI-DSS compliant payment gateway. Your
          sensitive payment information is collected and processed directly by Razorpay under their own privacy and
          security policies. We only receive a transaction reference and status.
        </p>
      </Section>

      <Section heading="4. Data sharing">
        <p>We do not sell or rent your personal information. We may share it only:</p>
        <List
          items={[
            'with trusted service providers who help us run the website (e.g. our hosting and database provider Supabase, and our payment partner Razorpay);',
            'when required by law, regulation, or a valid legal request;',
            'with the Organisation’s administrators and trustees for legitimate operational purposes.',
          ]}
        />
      </Section>

      <Section heading="5. Data security">
        <p>
          We use industry-standard measures, including row-level security on our database and encrypted connections, to
          protect your data. However, no method of transmission over the internet is completely secure, and we cannot
          guarantee absolute security.
        </p>
      </Section>

      <Section heading="6. Data retention">
        <p>
          We retain personal and financial records for as long as necessary to fulfil the purposes described above and
          to meet legal, accounting and audit requirements.
        </p>
      </Section>

      <Section heading="7. Your rights">
        <p>
          You may request access to, correction of, or deletion of your personal information by contacting us using the
          details below, subject to any legal obligations that require us to retain certain records.
        </p>
      </Section>

      <Section heading="8. Children’s privacy">
        <p>
          The member portal is intended for use by adults acting on behalf of the Organisation. We do not knowingly
          collect personal information from children without appropriate consent.
        </p>
      </Section>

      <Section heading="9. Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. Any changes will be posted on this page with a revised
          date.
        </p>
      </Section>
    </LegalLayout>
  );
}
