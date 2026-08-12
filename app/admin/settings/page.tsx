"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { adminGql } from "@/lib/admin";
import { SITE_QUERY, UPDATE_SITE } from "@/lib/queries";
import { ImageUploadField } from "@/components/admin/ImageUploadField";

export default function AdminSettingsPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [logo, setLogo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminGql<{ site: any }>(SITE_QUERY)
      .then((data) => {
        setName(data.site?.name || "");
        setEmail(data.site?.email || "");
        setLogo(data.site?.logo || "");
      })
      .catch(console.error);
  }, []);

  async function save() {
    setSaving(true);
    try {
      await adminGql(UPDATE_SITE, {
        input: { name, email, logo },
      });
      toast.success("Saved");
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1
          className="text-3xl md:text-4xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Site Settings
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Restaurant name, contact, and logo. Stripe secrets stay in environment
          variables.
        </p>
      </div>

      <div className="surface-card space-y-3 rounded-2xl p-5">
        <input
          className="input"
          placeholder="Restaurant name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="input"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <ImageUploadField label="Logo" value={logo} onChange={setLogo} />

        <button
          className="btn btn-primary w-full"
          disabled={saving}
          onClick={save}
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>

      <div className="surface-card rounded-2xl p-5 text-sm text-[var(--muted)]">
        <p className="mb-2 font-semibold text-[var(--ink)]">Payments setup</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Set `STRIPE_SECRET_KEY` and webhook secret on the server.</li>
          <li>
            In Stripe Dashboard → Settings → Payment methods, enable Apple Pay
            and Google Pay.
          </li>
          <li>
            Hosted Checkout shows wallets automatically on supported devices.
          </li>
        </ol>
      </div>
    </div>
  );
}
