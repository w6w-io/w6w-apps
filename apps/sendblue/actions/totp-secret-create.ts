import type { ActionDefinition } from "@w6w/types";
import { compact, SendblueClient } from "../lib/client.ts";

interface Input {
  uri?: string;
  secret?: string;
  label?: string;
  issuer?: string;
  algorithm?: "SHA1" | "SHA256" | "SHA512";
  digits?: 6 | 8;
  period?: number;
}

/**
 * `POST /api/v2/totp/secrets` — stores an encrypted TOTP secret so an
 * automation can generate its own 2FA codes instead of a human reading them
 * off a phone-based authenticator app. Provide either the full `uri` (from a
 * QR code scan — overrides every other field) or a base32 `secret` plus
 * `label`/`issuer`/etc. The response's `secret` field is the ONLY time the
 * plaintext base32 value is ever returned — `totp-secret-list` never includes
 * it.
 */
const totpSecretCreate: ActionDefinition<Input> = {
  key: "totp-secret-create",
  type: "perform",
  resource: "totp",
  title: "Register TOTP Secret",
  description: "Store a TOTP secret for this account, from either an otpauth:// URI or a " +
    "base32 secret.",
  idempotent: false,
  params: [
    {
      key: "uri",
      label: "otpauth:// URI",
      type: "string",
      hint: "From a QR code scan. Overrides every other field when set.",
    },
    { key: "secret", label: "Base32 secret", type: "secret", hint: "Omit to auto-generate one." },
    {
      key: "label",
      label: "Label",
      type: "string",
      hint: 'e.g. "GitHub - agent@example.com". Required unless uri is set.',
    },
    { key: "issuer", label: "Issuer", type: "string", hint: 'e.g. "GitHub".' },
    {
      key: "algorithm",
      label: "Algorithm",
      type: "select",
      options: [{ value: "SHA1", label: "SHA1" }, { value: "SHA256", label: "SHA256" }, {
        value: "SHA512",
        label: "SHA512",
      }],
      advanced: true,
    },
    {
      key: "digits",
      label: "Code length",
      type: "select",
      options: [{ value: 6, label: "6" }, { value: 8, label: "8" }],
      advanced: true,
    },
    { key: "period", label: "Rotation period (seconds)", type: "number", advanced: true },
  ],
  output: [{ key: "totp_secret", type: "object", label: "Stored TOTP secret" }],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.post(
      "/api/v2/totp/secrets",
      compact({
        uri: input.uri,
        secret: input.secret,
        label: input.label,
        issuer: input.issuer,
        algorithm: input.algorithm,
        digits: input.digits,
        period: input.period,
      }),
    );
  },
};

export default totpSecretCreate;
