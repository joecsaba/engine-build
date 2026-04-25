import { SEOHead } from "@/components/SEOHead";
import { PageHeader } from "@/components/layout/PageHeader";

export default function Terms() {
  return (
    <>
      <SEOHead
        title="Terms of Service"
        description="Terms of Service for Engine-build.com — usage terms, disclaimers, and liability limitations."
        canonical="/terms"
      />

      <PageHeader
        title="Terms of Service"
        subtitle="Please read these terms carefully before using our site."
      />

      <div className="container mx-auto max-w-4xl px-4 py-10">
        <div className="bg-white rounded-xl shadow-sm border p-8 md:p-12 prose prose-gray max-w-none">
          <p className="text-sm text-gray-500">Last updated: April 22, 2026</p>

          <h2>Acceptance of Terms</h2>
          <p>
            By accessing and using Engine-build.com ("the Site"), you agree to be bound by
            these Terms of Service. If you do not agree with any part of these terms, please
            do not use the Site.
          </p>

          <h2>Torque Specifications Disclaimer</h2>
          <p>
            All torque specifications published on Engine-build.com have been validated
            against a minimum of two independent sources. However, specifications can vary by
            production year, casting number, and factory revisions.{" "}
            <strong>
              You must always verify torque values against the factory service manual for your
              specific engine before performing any assembly work.
            </strong>
          </p>
          <p>
            Engine-build.com provides torque data as a convenient reference tool. We make no
            warranty, express or implied, regarding the accuracy or completeness of any
            specification listed on this site.
          </p>

          <h2>Calculator Accuracy</h2>
          <p>
            The calculators and tools provided on Engine-build.com (including but not limited
            to displacement, compression ratio, ring gap, cam duration, rod ratio, HP/torque,
            and piston speed calculators) are intended for{" "}
            <strong>reference and educational purposes only</strong>. They do not constitute
            professional engineering advice.
          </p>
          <p>
            Calculated results depend on the accuracy of the values you input. Always
            cross-reference results with established engineering references and consult a
            qualified professional when making critical engine assembly decisions.
          </p>

          <h2>Limitation of Liability</h2>
          <p>
            Engine-build.com, its owner, contributors, and affiliates shall not be held liable
            for any direct, indirect, incidental, consequential, or special damages arising
            from:
          </p>
          <ul>
            <li>Use of or reliance on any torque specifications published on this site</li>
            <li>Results produced by any calculator or tool on this site</li>
            <li>Any errors, omissions, or inaccuracies in the content</li>
            <li>Engine damage, personal injury, or financial loss resulting from use of information on this site</li>
          </ul>
          <p>
            All content is provided "as is" without warranty of any kind. Use of this site
            and its tools is entirely at your own risk.
          </p>

          <h2>Intellectual Property</h2>
          <p>
            Original content, design, and code on Engine-build.com are the property of
            Engine-build.com. The following attributions apply:
          </p>
          <ul>
            <li>
              <strong>Vizard Method</strong> — Compression ratio and related calculation
              methodologies credited to David Vizard's published work. Used for educational
              reference.
            </li>
            <li>
              <strong>NHTSA Data</strong> — Vehicle identification data retrieved from the
              NHTSA VIN Decoder API is public domain information provided by the U.S.
              government.
            </li>
          </ul>

          <h2>Affiliate Links Disclosure</h2>
          <p>
            Engine-build.com participates in the Amazon Services LLC Associates Program, an
            affiliate advertising program designed to provide a means for sites to earn
            advertising fees by advertising and linking to Amazon.com. Some links on this site
            are affiliate links, meaning we may earn a small commission if you make a purchase
            through them, at no additional cost to you.
          </p>

          <h2>Right to Modify Content</h2>
          <p>
            We reserve the right to add, update, correct, or remove any content on
            Engine-build.com at any time without prior notice. This includes specifications,
            calculator formulas, articles, and any other materials published on the site.
          </p>

          <h2>Changes to These Terms</h2>
          <p>
            We may revise these Terms of Service at any time. Changes will be posted on this
            page with an updated "Last updated" date. Continued use of the Site after changes
            are posted constitutes acceptance of the revised terms.
          </p>

          <h2>Contact Us</h2>
          <p>
            If you have questions about these Terms of Service, you can reach us at{" "}
            <a href="mailto:joe@engine-build.com">joe@engine-build.com</a>.
          </p>
        </div>
      </div>
    </>
  );
}
