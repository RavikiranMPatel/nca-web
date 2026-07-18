import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import publicApi from "../api/publicApi";

export default function PrivacyPolicyPage() {
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

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: January 2025</p>

        <div className="prose prose-gray max-w-none space-y-10">

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">1. Introduction</h2>
            <p className="text-gray-600 leading-relaxed">
              {academyName} ("we", "us", "our") is committed to protecting your privacy.
              This Privacy Policy describes how we collect, use, and share information when you use
              our platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">2. Information We Collect</h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              We collect the following categories of information:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-2">
              <li><strong>Account information:</strong> name, email address, and password (stored as a bcrypt hash)</li>
              <li><strong>Player information:</strong> date of birth, contact details, batch enrollment</li>
              <li><strong>Payment information:</strong> fee amounts and receipt numbers (card details are not stored by us)</li>
              <li><strong>Usage data:</strong> pages visited, features used, timestamps</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">3. How We Use Your Information</h2>
            <p className="text-gray-600 leading-relaxed">
              We use your information to provide and operate the Service, process payments, send
              receipts and important notifications, respond to your requests, and improve the platform.
              We do not use your information for advertising or sell it to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">4. Data Retention and Deletion</h2>
            <p className="text-gray-600 leading-relaxed">
              We retain your personal data for as long as your account is active. If you request
              deletion of your account, we will remove your personal data within 30 days, except
              where retention is required for legal or financial compliance purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">5. Third-Party Services</h2>
            <p className="text-gray-600 leading-relaxed">
              We use email delivery services and may use payment gateways for fee processing.
              These providers process data under their own privacy policies. We do not control their
              data practices and encourage you to review their policies directly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">6. Data Security</h2>
            <p className="text-gray-600 leading-relaxed">
              We use industry-standard security measures including password hashing, JWT-based
              authentication with token versioning, and HTTPS for all data in transit. No method
              of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">7. Cookies</h2>
            <p className="text-gray-600 leading-relaxed">
              We use browser local storage to persist your login session. We do not use third-party
              tracking cookies or advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">8. Your Rights</h2>
            <p className="text-gray-600 leading-relaxed">
              You have the right to access, correct, or request deletion of your personal data.
              Please contact us at the address below to exercise these rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">9. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
              For privacy-related inquiries, contact the {academyName} administrator
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
          <Link to="/terms" className="hover:text-blue-600 hover:underline">Terms of Service</Link>
          <Link to="/" className="hover:text-blue-600 hover:underline">Home</Link>
        </div>
      </div>
    </div>
  );
}
