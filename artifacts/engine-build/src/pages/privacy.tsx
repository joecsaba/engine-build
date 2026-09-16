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
          <p className="text-sm text-gray-500">Last updated: September 16, 2026</p>

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

          <h2>Cookies &amp; Your Choices</h2>
          <p>
            Engine-build.com uses cookies from Google Analytics and from Mediavine, our
            advertising partner, and Mediavine's ad partners (both described below). You can
            control or block cookies at any time through your browser settings — most browsers
            let you refuse all cookies, accept only certain types, or delete existing cookies.
            Blocking cookies does not affect the calculators or engine data. Visitors in regions
            covered by GDPR or CCPA are shown Mediavine's Consent Management Platform on first
            visit, where you can accept, reject, or customize advertising cookies.
          </p>

          <h2>Google Analytics (GA4)</h2>
          <p>
            We use Google Analytics 4 (measurement ID: <code>G-624Z648DND</code>) to understand
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

          <h2>Advertising (Journey by Mediavine)</h2>
          <p>
            Engine-build.com displays advertising through Journey by Mediavine. Advertising is
            what keeps the calculators and the engine database free to use. Mediavine's
            required disclosure follows, reproduced exactly as they publish it.
          </p>

          {/* Mediavine's required text, Ver 1.1 (05/09/2022), reproduced verbatim from
              help.mediavine.com/privacy-policy-language. Do not edit — it is their
              disclosure, not ours, and they require it unchanged. */}
          <h3>Mediavine Programmatic Advertising (Ver 1.1)</h3>
          <p>
            The Website works with Mediavine to manage third-party interest-based advertising
            appearing on the Website. Mediavine serves content and advertisements when you visit
            the Website, which may use first and third-party cookies. A cookie is a small text
            file which is sent to your computer or mobile device (referred to in this policy as a
            “device”) by the web server so that a website can remember some information about
            your browsing activity on the Website.
          </p>
          <p>
            First party cookies are created by the website that you are visiting. A third-party
            cookie is frequently used in behavioral advertising and analytics and is created by a
            domain other than the website you are visiting. Third-party cookies, tags, pixels,
            beacons and other similar technologies (collectively, “Tags”) may be placed on the
            Website to monitor interaction with advertising content and to target and optimize
            advertising. Each internet browser has functionality so that you can block both first
            and third-party cookies and clear your browser’s cache. The "help" feature of the
            menu bar on most browsers will tell you how to stop accepting new cookies, how to
            receive notification of new cookies, how to disable existing cookies and how to clear
            your browser’s cache. For more information about cookies and how to disable them, you
            can consult the information at{" "}
            <a href="https://www.allaboutcookies.org/manage-cookies/" target="_blank" rel="noreferrer noopener nofollow">
              All About Cookies
            </a>.
          </p>
          <p>
            Without cookies you may not be able to take full advantage of the Website content and
            features. Please note that rejecting cookies does not mean that you will no longer see
            ads when you visit our Site. In the event you opt-out, you will still see
            non-personalized advertisements on the Website.
          </p>
          <p>The Website collects the following data using a cookie when serving personalized ads:</p>
          <ul>
            <li>IP Address</li>
            <li>Operating System type</li>
            <li>Operating System version</li>
            <li>Device Type</li>
            <li>Language of the website</li>
            <li>Web browser type</li>
            <li>Email (in hashed form)</li>
          </ul>
          <p>
            Mediavine Partners (companies listed below with whom Mediavine shares data) may also
            use this data to link to other end user information the partner has independently
            collected to deliver targeted advertisements. Mediavine Partners may also separately
            collect data about end users from other sources, such as advertising IDs or pixels,
            and link that data to data collected from Mediavine publishers in order to provide
            interest-based advertising across your online experience, including devices, browsers
            and apps. This data includes usage data, cookie information, device information,
            information about interactions between users and advertisements and websites,
            geolocation data, traffic data, and information about a visitor’s referral source to
            a particular website. Mediavine Partners may also create unique IDs to create audience
            segments, which are used to provide targeted advertising.
          </p>
          <p>
            If you would like more information about this practice and to know your choices to
            opt-in or opt-out of this data collection, please visit{" "}
            <a href="https://thenai.org/opt-out/" target="_blank" rel="noreferrer noopener nofollow">
              National Advertising Initiative opt out page
            </a>. You may also visit{" "}
            <a href="http://optout.aboutads.info/#/" target="_blank" rel="noreferrer noopener nofollow">
              Digital Advertising Alliance website
            </a>{" "}
            and{" "}
            <a href="http://optout.networkadvertising.org/#" target="_blank" rel="noreferrer noopener nofollow">
              Network Advertising Initiative website
            </a>{" "}
            to learn more information about interest-based advertising. You may download the
            AppChoices app at{" "}
            <a href="https://youradchoices.com/appchoices" target="_blank" rel="noreferrer noopener nofollow">
              Digital Advertising Alliance’s AppChoices app
            </a>{" "}
            to opt out in connection with mobile apps, or use the platform controls on your mobile
            device to opt out.
          </p>
          <p>
            For specific information about Mediavine Partners, the data each collects and their
            data collection and privacy policies, please visit{" "}
            <a href="https://www.mediavine.com/ad-partners/" target="_blank" rel="noreferrer noopener nofollow">
              Mediavine Partners
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
            Our site uses cookies from two services:
          </p>
          <ul>
            <li>
              <strong>Google Analytics</strong> — analytics cookies to measure site usage
              (e.g., <code>_ga</code>, <code>_ga_*</code>)
            </li>
            <li>
              <strong>Mediavine and Mediavine Partners</strong> — advertising and measurement
              cookies used to serve, frequency-cap and, with your consent where required,
              personalize ads. The partners and their policies are listed at{" "}
              <a href="https://www.mediavine.com/ad-partners/" target="_blank" rel="noopener noreferrer">
                Mediavine Partners
              </a>.
            </li>
          </ul>
          <p>
            You can control or disable cookies through your browser settings. Most browsers
            allow you to refuse all cookies, accept only certain types, or be prompted before
            a cookie is stored.
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
            data associated with your visit is held by third-party services (Google Analytics
            and Mediavine). You can exercise your rights with those
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
