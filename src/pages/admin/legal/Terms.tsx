import { LegalLayout, List, Section } from '@/components/legal/Legal';
import { ORG } from '@/data/content';

export default function Terms() {
  return (
    <LegalLayout title="Terms & Conditions">
      <p>
        These Terms &amp; Conditions ("Terms") govern your use of the website operated by{' '}
        <strong>{ORG.nameEn}</strong> (also known as ছাত্রদল), a public charitable trust registered under the
        Indian Trusts Act, 1882, having its registered office at {ORG.address.en.join(', ')} ("the Organization",
        "we", "us", or "our"). By accessing or using this website, making a donation, or registering as a member,
        you agree to be bound by these Terms.
      </p>

      <Section heading="1. About us">
        <p>
          The Organization is a non-profit, non-trading public charitable trust working in the fields of education,
          healthcare, environmental protection, disaster relief and social welfare. All activities are carried out
          solely for charitable purposes without any profit motive.
        </p>
      </Section>

      <Section heading="2. Eligibility & accounts">
        <List
          items={[
            'There is no public self–registration. Member and administrator accounts are created and approved only by the Organization’s administrators.',
            'You are responsible for keeping your login credentials confidential and for all activity that occurs under your account.',
            'You agree to provide accurate, current and complete information and to keep it updated.',
            'We may suspend or terminate accounts that violate these Terms or are used for unlawful purposes.',
          ]}
        />
      </Section>

      <Section heading="3. Donations">
        <List
          items={[
            'All donations are entirely voluntary and are used to further the charitable objects of the Organization.',
            'A donation does not entitle the donor to any goods, services, ownership, membership rights, or any commercial benefit in return.',
            'Online payments are processed securely through our third-party payment partner, Razorpay. We do not store your card, UPI or banking credentials.',
            'Donation receipts/acknowledgements are issued electronically to the email or contact details provided.',
            'Any tax exemption on donations is subject to the Organization holding the relevant registrations under the Income Tax Act, 1961, and applicable law.',
          ]}
        />
      </Section>

      <Section heading="4. Acceptable use">
        <p>You agree not to:</p>
        <List
          items={[
            'use the website for any unlawful, fraudulent or harmful purpose;',
            'attempt to gain unauthorised access to any part of the website, accounts, or systems;',
            'upload content that is defamatory, obscene, infringing, or otherwise objectionable;',
            'disrupt or interfere with the security or proper working of the website.',
          ]}
        />
      </Section>

      <Section heading="5. Member-submitted content">
        <p>
          Members may submit posts and other content. Such content is published only after review and approval by an
          administrator and may be edited or removed at our discretion. By submitting content you confirm that you own
          or have the right to share it and grant the Organization a licence to display it on this website and its
          official channels.
        </p>
      </Section>

      <Section heading="6. Intellectual property">
        <p>
          All content on this website, including text, logos, graphics and images (other than member-submitted
          content), is the property of the Organization and is protected by applicable laws. You may not reproduce or
          distribute it without prior written permission.
        </p>
      </Section>

      <Section heading="7. Limitation of liability">
        <p>
          The website is provided on an "as is" and "as available" basis. To the maximum extent permitted by law, the
          Organization shall not be liable for any indirect, incidental or consequential loss arising from the use of,
          or inability to use, this website.
        </p>
      </Section>

      <Section heading="8. Governing law & jurisdiction">
        <p>
          These Terms are governed by the laws of India. Any dispute shall be subject to the exclusive jurisdiction of
          the courts at Paschim Medinipur, West Bengal.
        </p>
      </Section>

      <Section heading="9. Changes to these Terms">
        <p>
          We may update these Terms from time to time. The revised version will be posted on this page with an updated
          date. Continued use of the website constitutes acceptance of the revised Terms.
        </p>
      </Section>
    </LegalLayout>
  );
}
