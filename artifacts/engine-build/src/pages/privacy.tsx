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
            The first time you visit Engine-build.com you will see a consent banner from our
            Consent Management Platform (CMP). The CMP is provided by Ezoic via the IAB
            Transparency &amp; Consent Framework (TCF) version 2.3. You can accept, reject,
            or customize which categories of cookies (analytics, personalized advertising,
            etc.) are allowed on your device. Your choice is recorded in your browser and
            governs what tracking can run on subsequent visits. You can revisit the CMP
            and change your decision at any time using the consent controls in the page footer
            (or by clearing your browser's site data and reloading the page).
          </p>

          <h2>Google Analytics (GA4)</h2>
          <p>
            Subject to your consent choices on the CMP banner, we use Google Analytics 4
            (measurement ID: <code>G-624Z648DND</code>) to understand how visitors interact
            with our site. Google Analytics collects information such as:
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

          <h2>Advertising (Ezoic)</h2>
          <p>
            Engine-build.com is a partner of Ezoic, which provides advertising on this
            website. Ezoic and its third-party advertising partners use cookies and similar
            technologies to deliver, measure, and personalize advertising. The categories of
            cookies and partner vendors used are presented to you on the Consent Management
            Platform banner described above, and your selections there govern which vendors
            may operate.
          </p>
          <p>
            For full detail about Ezoic's data collection and your rights, see Ezoic's
            published privacy policy at{" "}
            <a href="https://www.ezoic.com/privacy-policy/" target="_blank" rel="noopener noreferrer">
              ezoic.com/privacy-policy
            </a>.
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
            Subject to your consent, our site uses cookies from the following services:
          </p>
          <ul>
            <li>
              <strong>Google Analytics</strong> — analytics cookies to measure site usage
              (e.g., <code>_ga</code>, <code>_ga_*</code>)
            </li>
            <li>
              <strong>Ezoic and its advertising partners</strong> — cookies used to serve,
              measure, and personalize advertising. The full list of partner vendors is
              shown on the CMP banner.
            </li>
          </ul>
          <p>
            You can also control or disable cookies through your browser settings. Most
            browsers allow you to refuse all cookies, accept only certain types, or be
            prompted before a cookie is stored.
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
