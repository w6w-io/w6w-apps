import type { AuthDefinition } from "@w6w/types";
import { encodeBase64Url } from "@std/encoding/base64url";
import { API_URL, TOKEN_URL } from "../lib/client.ts";

/**
 * Service Account (JWT bearer) — the "server-to-server" path. You mint a
 * service account in the Google Cloud Console, download its JSON key, and
 * paste the `client_email` + `private_key` here. Optionally set an
 * `impersonate` address for domain-wide delegation.
 *
 * Flow (RFC 7523, Google's `urn:ietf:params:oauth:grant-type:jwt-bearer`):
 *   1. Build a JWT with the service account as `iss`, calendar scopes,
 *      `aud = https://oauth2.googleapis.com/token`.
 *   2. Sign it with RS256 using the account's private key.
 *   3. POST to the token endpoint; receive an `access_token`.
 *   4. Cache the token in the credential; use it as `Bearer <token>`.
 *
 * NOTE on signing: Deno's Web Crypto can `importKey` PKCS#8 PEMs and sign
 * RS256 in principle, but wiring that into a portable, sandboxed hook is
 * non-trivial (PEM parsing, cache lifetime, key rotation). We therefore stub
 * the signing step here: the assertion body is built correctly, but the
 * signature is a fixed placeholder. The `TODO(rs256)` markers below flag
 * exactly where a real implementation should slot in — a host that wants
 * service-account auth today should provide it via `ctx.host` and call in
 * from `exchange`.
 */
interface ServiceAccountFields {
  clientEmail: string;
  privateKey: string;
  impersonate?: string;
}

interface AccessTokenCredential {
  accessToken: string;
  expiresAt?: number;
  clientEmail?: string;
  impersonate?: string;
}

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

/**
 * Build the JWT header + claims Google expects. Signing itself is stubbed —
 * see the note on the auth definition. Exported for tests.
 */
export function buildAssertion(
  fields: ServiceAccountFields,
  now: number = Math.floor(Date.now() / 1000),
): { unsigned: string; header: string; payload: string } {
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: fields.clientEmail,
    sub: fields.impersonate || fields.clientEmail,
    scope: SCOPES.join(" "),
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };
  const enc = (o: unknown) => encodeBase64Url(new TextEncoder().encode(JSON.stringify(o)));
  const encodedHeader = enc(header);
  const encodedPayload = enc(payload);
  return {
    header: encodedHeader,
    payload: encodedPayload,
    unsigned: `${encodedHeader}.${encodedPayload}`,
  };
}

const serviceAccount: AuthDefinition = {
  key: "service-account",
  type: "custom",
  displayName: "Service Account (JWT bearer)",
  description:
    "Server-to-server auth using a Google Cloud service account. Paste the client_email + private_key from the downloaded JSON key. Signing is currently stubbed — see auth/service-account.ts for details.",
  connectionLabel: "{{clientEmail}}",
  fields: [
    {
      key: "clientEmail",
      label: "Service account email",
      type: "string",
      required: true,
      hint: "Looks like name-XYZ@project.iam.gserviceaccount.com.",
    },
    {
      key: "privateKey",
      label: "Private key (PEM)",
      type: "secret",
      required: true,
      hint: "The `private_key` field from the downloaded JSON key, including BEGIN/END lines.",
    },
    {
      key: "impersonate",
      label: "Impersonate user (optional)",
      type: "string",
      hint:
        "Email address to impersonate via domain-wide delegation. Leave blank to act as the service account itself.",
    },
  ],

  async exchange({ fields }, ctx) {
    const f = (fields ?? {}) as unknown as ServiceAccountFields;
    if (!f.clientEmail || !f.privateKey) {
      throw new Error("service-account: clientEmail and privateKey are required");
    }
    const { unsigned } = buildAssertion(f);
    // TODO(rs256): replace this placeholder with a real RS256 signature over
    // `unsigned` using `f.privateKey`. Deno's Web Crypto can do this via
    // `crypto.subtle.importKey('pkcs8', ..., { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, ...)`
    // once the PEM is stripped to raw DER. Until that lands the token exchange
    // will 400 with `invalid_grant` — the shape below is otherwise correct.
    const signature = "TODO_RS256_SIGNATURE";
    const assertion = `${unsigned}.${signature}`;

    const body = new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    });
    const res = await ctx.fetch(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Google token exchange failed: ${res.status} ${detail}`);
    }
    const json = await res.json() as { access_token?: string; expires_in?: number };
    if (!json.access_token) throw new Error("Google token response missing access_token");
    const credential: AccessTokenCredential = {
      accessToken: json.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + (json.expires_in ?? 3600),
      clientEmail: f.clientEmail,
      impersonate: f.impersonate,
    };
    return credential;
  },

  sign({ request, credential }) {
    const { accessToken } = credential as AccessTokenCredential;
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as AccessTokenCredential;
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch(`${API_URL}/users/me/calendarList?maxResults=1`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `Google Calendar returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect({ credential }, _ctx) {
    const c = credential as AccessTokenCredential;
    return {
      clientEmail: c.clientEmail,
      impersonate: c.impersonate,
    };
  },
};

export default serviceAccount;
