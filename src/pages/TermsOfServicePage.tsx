import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import publicApi from "../api/publicApi";

export default function TermsOfServicePage() {
  const [academyName, setAcademyName] = useState("the Academy");
  const [contactEmail, setContactEmail] = useState("");

  useEffect(() => {
    publicApi.get("/settings/public").then((res) => {
      setAcademyName(res.data?.ACADEMY_NAME || "the Academy");
      setContactEmail(res.data?.CONTACT_EMAIL || res.data?.CONTACT_EMAIL_2 || "");
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-6">
          <Link to="/" className="text-sm text-blue-600 hover:underline">
            ← Back to home
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: January 2025</p>

        <div className="prose prose-gray max-w-none space-y-10">

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Acceptance of Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              By accessing or using {academyName}'s platform ("Service"), you agree to be bound by
              these Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">2. Data Collection</h2>
            <p className="text-gray-600 leading-relaxed">
              We collect information you provide directly to us, such as when you create an account,
              register a player, or make a payment. This includes names, email addresses, phone numbers,
              and payment information. We also collect usage data automatically when you interact with
              our platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">3. Data Usage</h2>
            <p className="text-gray-600 leading-relaxed">
              Your data is used solely to operate and improve the Service — including managing player
              records, processing payments, sending receipts, and communicating important updates about
              your account or the academy. We do not sell your personal data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Data Retention and Deletion</h2>
            <p className="text-gray-600 leading-relaxed">
              We retain your data for as long as your account is active or as needed to provide the Service.
              You may request deletion of your account and associated data at any time by contacting
              the academy administrator. Some data may be retained to comply with legal obligations
              or resolve disputes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">5. Third-Party Services</h2>
            <p className="text-gray-600 leading-relaxed">
              The platform may integrate with third-party services such as payment processors and email
              delivery providers. These third parties have their own privacy policies and terms of service,
              and we encourage you to review them. We are not responsible for the privacy practices of
              third-party services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">6. Cookie Policy</h2>
            <p className="text-gray-600 leading-relaxed">
              We use session cookies and local storage to maintain your login session and preferences.
              No tracking cookies or advertising cookies are used. You may disable cookies in your
              browser settings, though this may affect your ability to use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">7. Contact Information</h2>
            <p className="text-gray-600 leading-relaxed">
              For questions about these Terms, please contact the {academyName} administrator
              {contactEmail ? (
                <>
                  {" "}at{" "}
                  <a href={`mailto:${contactEmail}`} className="text-blue-600 hover:underline">
                    {contactEmail}
                  </a>
                </>
              ) : (
                " directly"
              )}
              .
            </p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-gray-200 flex gap-4 text-sm text-gray-500">
          <Link to="/privacy" className="hover:text-blue-600 hover:underline">Privacy Policy</Link>
          <Link to="/" className="hover:text-blue-600 hover:underline">Home</Link>
        </div>
      </div>
    </div>
  );
}
