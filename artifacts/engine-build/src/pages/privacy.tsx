import { SEOHead } from "@/components/SEOHead";
import { PageHeader } from "@/components/layout/PageHeader";

export default function Privacy() {
  return (
    <>
      <SEOHead
        title="Privacy Policy"
        description="Privacy Policy for Engine-build.com — how we handle your data, cookies, and third-party services."
        canonical="/privacy"
      />

      <PageHeader
        title="Privacy Policy"
        subtitle="How we handle your data and protect your privacy."
      />

      <div className="container mx-auto max-w-4xl px-4 py-10">
        <div className="bg-white rounded-xl shadow-sm border p-8 md:p-12 prose prose-gray max-w-none">
          <p className="text-sm text-gray-500">Last updated: June 6, 2026</p>

          <h2>Introduction</h2>
          <p>
            Engine-build.com ("we," "us," or "our") is committed to protecting your privacy.
            This Privacy Policy explains how we collect, use, and safeguard information when
            you visit our website at <strong>engine-build.com</strong>.
          </p>

          <h2>Information We Do Not Collect</h2>
          <p>
            Engine-build.com does not require user accounts, logins, or registration. We do
            not collect personal information such as names, email addresses, or payment
            information through general site usage. There is no user database in the current
            version of the site.
          </p>

          <h2>Cookie Consent</h2>
          <p>
            The first time you visit Engine-build.com you will see a consent banner offering
            two choices: <strong>Accept all</strong> or <strong>Reject non-essential</strong>.
            No analytics or advertising cookies are set on your device until you choose
            <strong> Accept all</strong>. Your choice is saved to your browser's local storage
            (key: <code>ebcom_cookie_consent_v1</code>) so we do not ask again on subsequent visits.
            To change your decision later, clear your browser's site data for engine-build.com
            and refresh the page.
          </p>

          <h2>Google Analytics (GA4) — only after consent</h2>
          <p>
            If (and only if) you click <strong>Accept all</strong> on the cookie banner, we
            load Google Analytics 4 (measurement ID: <code>G-624Z648DND</code>) to understand
            how visitors interact with our site. Google Analytics collects information such as:
          </p>
          <ul>
            <li>Pages visited and time spent on each page</li>
            <li>Browser type, operating system, and screen resolution</li>
            <li>Referring website or search terms</li>
            <li>General geographic location (city/region level)</li>
            <li>Device type (desktop, mobile, tablet)</li>
          </ul>
          <p>
            This data is aggregated and anonymized. We use it solely to improve our content
            and user experience. Google Analytics places cookies on your browser to identify
            unique visitors. For more information, see{" "}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
              Google's Privacy Policy
            </a>.
          </p>

          <h2>Advertising (planned)</h2>
          <p>
            Engine-build.com is currently in the process of onboarding with an ad network so
            we can keep the calculators free. No display ads are running on the site today.
            When advertising goes live, this Privacy Policy will be updated with the specific
            network we partner with, the cookies they place, the personalized-advertising
            controls available to you, and a Consent Management Platform that is compliant
            with the IAB Transparency &amp; Consent Framework (TCF).
          </p>

          <h2>Contact Form (Formspree)</h2>
          <p>
            If you use our contact form, your submission (including your email address and
            message) is processed by{" "}
            <a href="https://formspree.io/legal/privacy-policy" target="_blank" rel="noopener noreferrer">
              Formspree
            </a>, a third-party form handling service. Formspree transmits your message to us
            via email. We do not store contact form submissions in any database. Please refer
            to Formspree's privacy policy for details on how they handle your data.
          </p>

          <h2>NHTSA VIN Decoder API</h2>
          <p>
            Our site includes a vehicle identification number (VIN) lookup feature that sends
            VIN data to the National Highway Traffic Safety Administration (NHTSA) public API.
            The VIN you enter is transmitted directly to this U.S. government API to retrieve
            vehicle specifications. We do not store or log the VINs you look up.
          </p>

          <h2>Local Storage</h2>
          <p>
            We use your browser's <code>localStorage</code> to save build planner state and
            calculator preferences. This data is stored entirely on your device and is never
            transmitted to our servers. You can clear this data at any time through your
            browser settings.
          </p>

          <h2>Cookies in use</h2>
          <p>
            With consent (Accept all), our site uses cookies from the following services:
          </p>
          <ul>
            <li>
              <strong>Google Analytics</strong> — analytics cookies to measure site usage
              (e.g., <code>_ga</code>, <code>_ga_*</code>)
            </li>
          </ul>
          <p>
            Without consent (Reject non-essential), only one piece of browser storage is used:
            the <code>localStorage</code> key recording your consent choice. No analytics or
            advertising cookies are placed. You can also control or disable cookies through
            your browser settings.
          </p>

          <h2>Children's Privacy</h2>
          <p>
            Engine-build.com is not directed at children under the age of 13. We do not
            knowingly collect personal information from children. If you believe a child has
            provided us with personal information, please contact us and we will promptly
            remove it.
          </p>

          <h2>Your Rights (California / GDPR)</h2>
          <p>
            If you are a California resident, you have the right under the California Consumer
            Privacy Act (CCPA) to request disclosure of data collected about you and to
            request its deletion. If you are located in the European Economic Area, you have
            rights under the General Data Protection Regulation (GDPR) including the right to
            access, correct, or delete your personal data, and the right to restrict or object
            to processing.
          </p>
          <p>
            Because we do not maintain user accounts or a personal data database, most of the
            data associated with your visit is held by third-party services (Google Analytics,
            and our future advertising network). You can exercise your rights with those
            services directly, or refuse all non-essential cookies on the consent banner. For
            any other requests, please contact us.
          </p>

          <h2>Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Changes will be posted on
            this page with an updated "Last updated" date.
          </p>

          <h2>Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, you can reach us at{" "}
            <a href="mailto:joe@engine-build.com">joe@engine-build.com</a>.
          </p>
        </div>
      </div>
    </>
  );
}
