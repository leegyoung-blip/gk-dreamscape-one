"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import BillingAdminShell from "../_components/BillingAdminShell";
import type { BillingSettings } from "../_lib/billingTypes";
import { errorMessage } from "../_lib/billingUtils";

type ConnectionStatus = {
  hitpayConfigured: boolean;
  hitpayEnvironment: string;
  resendConfigured: boolean;
  resendFrom: string;
  serviceRoleConfigured: boolean;
};

const DEFAULT_SETTINGS: BillingSettings = {
  id: true,
  business_name: "Guru Kids Pro",
  business_address: "Blk 4 Queen's Road #02-127, Singapore 260004",
  billing_email: "admin@gurukidspro.com",
  support_email: "admin@gurukidspro.com",
  currency: "SGD",
  timezone: "Asia/Singapore",
  invoice_prefix: "GKP",
  default_due_days: 7,
  grace_period_days: 7,
  default_family_due_day: 25,
  email_sender_name: "Guru Kids Pro",
  is_gst_registered: false,
  gst_registration_number: null,
  payment_terms:
    "Fees are payable in advance. Please complete payment by the stated due date.",
  footer_note: "Thank you for learning with Guru Kids Pro.",
  created_at: "",
  updated_at: "",
};

export default function BillingSettingsClient() {
  const [settings, setSettings] =
    useState<BillingSettings>(DEFAULT_SETTINGS);
  const [connections, setConnections] =
    useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    const { data, error } = await supabase
      .from("gkp_billing_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle();

    if (error) {
      setLoadError(error.message);
      setLoading(false);
      return;
    }

    if (data) {
      setSettings(data as BillingSettings);
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        const response = await fetch("/api/billing/system-status", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        });

        if (response.ok) {
          setConnections(
            (await response.json()) as ConnectionStatus,
          );
        }
      }
    } catch {
      // Settings remain usable even if connection-status checking fails.
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  async function saveSettings() {
    if (!settings.business_name.trim()) {
      setLoadError("Business name is required.");
      return;
    }

    if (!settings.billing_email.trim() || !settings.support_email.trim()) {
      setLoadError("Billing and support email addresses are required.");
      return;
    }

    if (
      settings.is_gst_registered &&
      !String(settings.gst_registration_number || "").trim()
    ) {
      setLoadError(
        "Enter the GST registration number or turn off GST registered.",
      );
      return;
    }

    setSaving(true);
    setLoadError("");
    setNotice("");

    const { error } = await supabase
      .from("gkp_billing_settings")
      .update({
        business_name: settings.business_name.trim(),
        business_address: settings.business_address.trim(),
        billing_email: settings.billing_email.trim(),
        support_email: settings.support_email.trim(),
        currency: settings.currency.trim().toUpperCase(),
        timezone: settings.timezone.trim(),
        invoice_prefix: settings.invoice_prefix.trim().toUpperCase(),
        default_due_days: Number(settings.default_due_days),
        grace_period_days: Number(settings.grace_period_days),
        default_family_due_day: Number(
          settings.default_family_due_day,
        ),
        email_sender_name: settings.email_sender_name.trim(),
        is_gst_registered: settings.is_gst_registered,
        gst_registration_number: settings.is_gst_registered
          ? String(settings.gst_registration_number || "").trim()
          : null,
        payment_terms: settings.payment_terms.trim(),
        footer_note: settings.footer_note.trim(),
      })
      .eq("id", true);

    if (error) {
      setLoadError(error.message);
    } else {
      setNotice("Billing settings saved.");
      await loadSettings();
    }

    setSaving(false);
  }

  return (
    <BillingAdminShell
      eyebrow="Billing administration"
      title="Settings"
      description="Control Guru Kids Pro invoice details and default billing rules. Sensitive API keys remain protected in Vercel."
      actions={
        <>
          <button
            type="button"
            onClick={() => void loadSettings()}
            disabled={loading || saving}
            className="min-h-11 rounded-full border border-[#d7c9ae] bg-white px-4 text-xs font-bold"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void saveSettings()}
            disabled={loading || saving}
            className="min-h-11 rounded-full bg-[#15233b] px-5 text-xs font-bold text-white"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
        </>
      }
    >
      {loadError && <Alert tone="error">{loadError}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      {loading ? (
        <div className="rounded-[2rem] border border-[#ded5c4] bg-white p-10 text-center text-sm text-[#81796d]">
          Loading billing settings…
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div className="grid gap-6">
            <SettingsCard
              eyebrow="Business & invoice identity"
              title="What parents see"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Business name"
                  value={settings.business_name}
                  onChange={(value) =>
                    setSettings((current) => ({
                      ...current,
                      business_name: value,
                    }))
                  }
                />
                <TextField
                  label="Invoice prefix"
                  value={settings.invoice_prefix}
                  onChange={(value) =>
                    setSettings((current) => ({
                      ...current,
                      invoice_prefix: value,
                    }))
                  }
                  note="Affects future invoice numbers only."
                />
              </div>

              <TextAreaField
                label="Business address"
                value={settings.business_address}
                onChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    business_address: value,
                  }))
                }
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Billing email"
                  type="email"
                  value={settings.billing_email}
                  onChange={(value) =>
                    setSettings((current) => ({
                      ...current,
                      billing_email: value,
                    }))
                  }
                />
                <TextField
                  label="Support email"
                  type="email"
                  value={settings.support_email}
                  onChange={(value) =>
                    setSettings((current) => ({
                      ...current,
                      support_email: value,
                    }))
                  }
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Currency"
                  value={settings.currency}
                  onChange={(value) =>
                    setSettings((current) => ({
                      ...current,
                      currency: value,
                    }))
                  }
                  note="Keep SGD for current GKP billing."
                />
                <TextField
                  label="Timezone"
                  value={settings.timezone}
                  onChange={(value) =>
                    setSettings((current) => ({
                      ...current,
                      timezone: value,
                    }))
                  }
                  note="Keep Asia/Singapore."
                />
              </div>
            </SettingsCard>

            <SettingsCard
              eyebrow="Billing rules"
              title="Defaults for new billing records"
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <NumberField
                  label="Default family due day"
                  value={settings.default_family_due_day}
                  min={1}
                  max={28}
                  onChange={(value) =>
                    setSettings((current) => ({
                      ...current,
                      default_family_due_day: value,
                    }))
                  }
                  note="New families only. 25 = prepaid by the 25th."
                />
                <NumberField
                  label="Default due period"
                  value={settings.default_due_days}
                  min={0}
                  max={60}
                  onChange={(value) =>
                    setSettings((current) => ({
                      ...current,
                      default_due_days: value,
                    }))
                  }
                  note="Fallback for non-monthly invoices."
                />
                <NumberField
                  label="Grace period"
                  value={settings.grace_period_days}
                  min={0}
                  max={60}
                  onChange={(value) =>
                    setSettings((current) => ({
                      ...current,
                      grace_period_days: value,
                    }))
                  }
                  note="Used for overdue follow-up rules."
                />
              </div>

              <div className="rounded-2xl border border-[#d8c59e] bg-[#f8f1e3] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.13em] text-[#9a7029]">
                  Locked policy
                </p>
                <strong className="mt-2 block text-lg">
                  Recurring discounts: maximum 4 lessons
                </strong>
                <p className="mt-1 text-sm leading-6 text-[#726858]">
                  A five-lesson month charges the fifth lesson at the full
                  agreed lesson rate. This policy is intentionally not editable
                  from the admin screen.
                </p>
              </div>

              <TextAreaField
                label="Payment terms"
                value={settings.payment_terms}
                onChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    payment_terms: value,
                  }))
                }
              />

              <TextAreaField
                label="Invoice footer"
                value={settings.footer_note}
                onChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    footer_note: value,
                  }))
                }
              />
            </SettingsCard>

            <SettingsCard
              eyebrow="Tax"
              title="GST configuration"
            >
              <label className="flex items-start gap-3 rounded-2xl border border-[#ded5c4] bg-[#fbfaf7] p-4">
                <input
                  type="checkbox"
                  checked={settings.is_gst_registered}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      is_gst_registered: event.target.checked,
                    }))
                  }
                  className="mt-1 h-4 w-4"
                />
                <span>
                  <strong className="block text-sm">
                    Guru Kids Pro is GST registered
                  </strong>
                  <span className="mt-1 block text-xs leading-5 text-[#81796d]">
                    Only enable this when the business is actually GST registered.
                  </span>
                </span>
              </label>

              {settings.is_gst_registered && (
                <TextField
                  label="GST registration number"
                  value={settings.gst_registration_number || ""}
                  onChange={(value) =>
                    setSettings((current) => ({
                      ...current,
                      gst_registration_number: value,
                    }))
                  }
                />
              )}
            </SettingsCard>
          </div>

          <div className="grid content-start gap-6">
            <SettingsCard
              eyebrow="Email"
              title="Resend sender"
            >
              <TextField
                label="Sender display name"
                value={settings.email_sender_name}
                onChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    email_sender_name: value,
                  }))
                }
                note="The sender address itself remains protected/configured on the server."
              />

              <ConnectionRow
                label="Resend"
                connected={Boolean(connections?.resendConfigured)}
                detail={
                  connections?.resendConfigured
                    ? connections.resendFrom
                    : "RESEND_API_KEY not detected"
                }
              />
            </SettingsCard>

            <SettingsCard
              eyebrow="Payments"
              title="HitPay connection"
            >
              <ConnectionRow
                label="HitPay"
                connected={Boolean(connections?.hitpayConfigured)}
                detail={
                  connections?.hitpayConfigured
                    ? `${connections.hitpayEnvironment} credentials detected`
                    : "Production credentials not fully detected"
                }
              />

              <ConnectionRow
                label="Server access"
                connected={Boolean(connections?.serviceRoleConfigured)}
                detail={
                  connections?.serviceRoleConfigured
                    ? "Supabase service role configured"
                    : "Service-role environment variable missing"
                }
              />

              <p className="text-xs leading-5 text-[#81796d]">
                API keys and webhook salts are never displayed or editable here.
                They remain in Vercel Environment Variables.
              </p>
            </SettingsCard>

            <SettingsCard
              eyebrow="Change impact"
              title="Before editing settings"
            >
              <ul className="grid gap-3 text-sm leading-6 text-[#6f675a]">
                <li>
                  <strong className="text-[#15233b]">Invoice prefix:</strong>{" "}
                  only future invoice numbers change.
                </li>
                <li>
                  <strong className="text-[#15233b]">Default due day:</strong>{" "}
                  only newly created family accounts receive the new default.
                </li>
                <li>
                  <strong className="text-[#15233b]">Existing invoices:</strong>{" "}
                  are never rewritten by changing these settings.
                </li>
                <li>
                  <strong className="text-[#15233b]">GST:</strong>{" "}
                  enable only when legally applicable.
                </li>
              </ul>
            </SettingsCard>
          </div>
        </div>
      )}
    </BillingAdminShell>
  );
}

function SettingsCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-[#ded5c4] bg-white p-5 shadow-[0_20px_60px_rgba(21,35,59,0.045)] sm:p-6">
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#9a7029]">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-xl font-semibold">{title}</h2>
      <div className="mt-5 grid gap-4">{children}</div>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  note,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  note?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black uppercase tracking-[0.11em] text-[#766d5f]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      />
      {note && <span className="text-[11px] leading-5 text-[#8a8378]">{note}</span>}
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
  note,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  note?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black uppercase tracking-[0.11em] text-[#766d5f]">
        {label}
      </span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className={inputClass}
      />
      {note && <span className="text-[11px] leading-5 text-[#8a8378]">{note}</span>}
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black uppercase tracking-[0.11em] text-[#766d5f]">
        {label}
      </span>
      <textarea
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      />
    </label>
  );
}

function ConnectionRow({
  label,
  connected,
  detail,
}: {
  label: string;
  connected: boolean;
  detail: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-[#e5ded2] bg-[#fbfaf7] p-4">
      <div>
        <strong className="text-sm">{label}</strong>
        <span className="mt-1 block text-xs text-[#81796d]">{detail}</span>
      </div>
      <span
        className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] ${
          connected
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-red-200 bg-red-50 text-red-700"
        }`}
      >
        {connected ? "Connected" : "Check setup"}
      </span>
    </div>
  );
}

function Alert({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`mb-5 rounded-2xl border p-4 text-sm ${
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      {children}
    </div>
  );
}

const inputClass =
  "min-h-11 w-full rounded-2xl border border-[#d9cfbd] bg-[#fbfaf7] px-4 py-3 text-sm text-[#15233b] outline-none focus:border-[#b38a40]";
