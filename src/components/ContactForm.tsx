import { useState } from "react";
import publicApi from "../api/publicApi";
import {
  Send,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  Loader2,
  Clock,
} from "lucide-react";

type Props = {
  primaryColor: string;
  cardStyle: React.CSSProperties;
  getShadowClass: () => string;
  settings: {
    CONTACT_ADDRESS_LINE1?: string;
    CONTACT_ADDRESS_LINE2?: string;
    CONTACT_PHONE?: string;
    CONTACT_EMAIL?: string;
    CONTACT_HOURS?: string;
  };
};

export default function ContactForm({ primaryColor, settings }: Props) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const set =
    (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError("Please fill in Name, Email, and Message.");
      return;
    }
    setSubmitting(true);
    try {
      await publicApi.post("/contact", form);
      setSubmitted(true);
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch {
      setError("Something went wrong. Please call us directly.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="contact"
      className="py-20 px-4 relative overflow-hidden"
      style={{ backgroundColor: "#f8faff" }}
    >
      {/* Background decoration blobs */}
      <div
        className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-5 -translate-y-1/2 translate-x-1/2 pointer-events-none"
        style={{ backgroundColor: primaryColor }}
      />
      <div
        className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-5 translate-y-1/2 -translate-x-1/2 pointer-events-none"
        style={{ backgroundColor: primaryColor }}
      />

      <div className="max-w-6xl mx-auto relative">
        {/* Header */}
        <div className="text-center mb-14">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-4"
            style={{
              backgroundColor: `${primaryColor}15`,
              color: primaryColor,
            }}
          >
            <Mail size={14} />
            Contact Us
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-3">
            Get in Touch
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto text-base leading-relaxed">
            Questions about admissions, batch timings, or fees? We'll get back
            to you within 24 hours.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* ── LEFT: Contact Info ── */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            <InfoCard
              icon={<MapPin size={20} />}
              title="Visit Us"
              line1={settings.CONTACT_ADDRESS_LINE1 || "Cricket Ground Road"}
              line2={settings.CONTACT_ADDRESS_LINE2 || "Mysore, Karnataka"}
              primaryColor={primaryColor}
            />

            <InfoCard
              icon={<Phone size={20} />}
              title="Call Us"
              line1={settings.CONTACT_PHONE || "+91 98765 43210"}
              line2={settings.CONTACT_HOURS || "Mon–Sun: 6 AM – 9 PM"}
              primaryColor={primaryColor}
            />

            <InfoCard
              icon={<Mail size={20} />}
              title="Email Us"
              line1={settings.CONTACT_EMAIL || "info@nca-academy.com"}
              line2="We reply within 24 hours"
              primaryColor={primaryColor}
            />

            {/* Tip box */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}18 0%, ${primaryColor}08 100%)`,
                border: `1px solid ${primaryColor}25`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Clock size={15} style={{ color: primaryColor }} />
                <p
                  className="font-semibold text-sm"
                  style={{ color: primaryColor }}
                >
                  Pro Tip
                </p>
              </div>
              <p className="text-gray-500 text-xs leading-relaxed">
                Mention your child's{" "}
                <strong className="text-gray-700">age</strong> and{" "}
                <strong className="text-gray-700">cricket experience</strong> in
                your message — it helps us suggest the right batch instantly.
              </p>
            </div>
          </div>

          {/* ── RIGHT: Form ── */}
          <div className="lg:col-span-3">
            {submitted ? (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center py-20 text-center px-8">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <CheckCircle size={42} style={{ color: primaryColor }} />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  Message Sent!
                </h3>
                <p className="text-gray-400 max-w-xs mb-8 text-sm leading-relaxed">
                  Thank you for reaching out. Our team will contact you within
                  24 hours.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="text-sm font-semibold px-6 py-2.5 rounded-xl border-2 transition hover:opacity-80"
                  style={{ borderColor: primaryColor, color: primaryColor }}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8"
              >
                <h3 className="text-lg font-bold text-gray-800 mb-6">
                  Send us a message
                </h3>

                {/* Name + Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <Field
                    label="Name"
                    required
                    type="text"
                    placeholder="Your full name"
                    value={form.name}
                    onChange={set("name")}
                    primaryColor={primaryColor}
                  />
                  <Field
                    label="Email"
                    required
                    type="email"
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={set("email")}
                    primaryColor={primaryColor}
                  />
                </div>

                {/* Phone */}
                <div className="mb-4">
                  <Field
                    label="Phone"
                    type="tel"
                    optional
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={set("phone")}
                    primaryColor={primaryColor}
                  />
                </div>

                {/* Message */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Message <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    rows={5}
                    placeholder="My child is 13 years old, plays for school team, looking for weekend batch..."
                    value={form.message}
                    onChange={set("message")}
                    className="w-full border-2 bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none resize-none transition-all"
                    style={{ borderColor: "#f3f4f6" }}
                    onFocus={(e) => {
                      e.target.style.borderColor = primaryColor;
                      e.target.style.backgroundColor = "#fff";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#f3f4f6";
                      e.target.style.backgroundColor = "#f9fafb";
                    }}
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-500">
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60 text-sm"
                  style={{
                    backgroundColor: primaryColor,
                    boxShadow: `0 8px 24px ${primaryColor}35`,
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Send Message
                    </>
                  )}
                </button>

                <p className="text-center text-xs text-gray-400 mt-4">
                  🔒 Your information is never shared with anyone.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function InfoCard({
  icon,
  title,
  line1,
  line2,
  primaryColor,
}: {
  icon: React.ReactNode;
  title: string;
  line1: string;
  line2: string;
  primaryColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-4 hover:shadow-md transition shadow-sm">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${primaryColor}12` }}
      >
        <span style={{ color: primaryColor }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
          {title}
        </p>
        <p className="text-sm font-bold text-gray-800 truncate">{line1}</p>
        <p className="text-xs text-gray-400 mt-0.5">{line2}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  placeholder,
  value,
  onChange,
  primaryColor,
  required,
  optional,
}: {
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  primaryColor: string;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
        {optional && (
          <span className="text-gray-400 font-normal text-xs">(optional)</span>
        )}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full border-2 bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none transition-all"
        style={{ borderColor: "#f3f4f6" }}
        onFocus={(e) => {
          e.target.style.borderColor = primaryColor;
          e.target.style.backgroundColor = "#fff";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "#f3f4f6";
          e.target.style.backgroundColor = "#f9fafb";
        }}
      />
    </div>
  );
}
