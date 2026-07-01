import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const JWT_GRANT = "urn:ietf:params:oauth:grant-type:jwt-bearer";
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
];

/**
 * Service Account (`custom`) — the Google Workspace domain-wide delegation
 * path. Instead of an interactive OAuth flow, the workspace admin grants a
 * service account authority to impersonate users. Every request mints a fresh
 * OAuth2 access token by exchanging a signed JWT assertion at
 * https://oauth2.googleapis.com/token.
 *
 * Fields collected: `email` (service account address), `privateKey` (the PEM
 * from the downloaded JSON key), and optional `delegatedEmail` (the workspace
 * user to impersonate — required for Gmail since service accounts have no
 * mailbox of their own).
 *
 * The `sign` hook injects the currently cached bearer token. Minting that
 * token requires RS256 signing of a JWT assertion; the exchange is done in
 * `exchange` at connect time and the resulting `{ accessToken, expiresAt }`
 * pair is stored as the credential. A `refresh` hook re-signs when it lapses.
 *
 * TODO(rs256): the RS256 signature step below is a stub. In Deno we can pull
 * PKCS#8 keys straight into `crypto.subtle.importKey` and call `sign`, but the
 * exact PEM parsing / DER handling needs a small utility (or an npm shim like
 * `jose`). Landing that is left to a follow-up; the surface below is otherwise
 * complete so callers can wire it up as soon as the signer is in place.
 */
const serviceAccount: AuthDefinition = {
  key: "service-account",
  type: "custom",
  displayName: "Google Service Account",
  description:
    "Google Workspace domain-wide delegation. Requires a service account JSON key and, since Gmail has no service-account-owned mailbox, an impersonation target (delegatedEmail).",
  connectionLabel: "{{user.email}}",
  fields: [
    {
      key: "email",
      label: "Service Account Email",
      type: "string",
      required: true,
      placeholder: "name@project.iam.gserviceaccount.com",
      hint: "The `client_email` from the service account JSON key.",
    },
    {
      key: "privateKey",
      label: "Private Key",
      type: "secret",
      required: true,
      hint:
        "The `private_key` PEM from the service account JSON key (BEGIN/END PRIVATE KEY lines included).",
    },
    {
      key: "delegatedEmail",
      label: "Impersonate User (email)",
      type: "string",
      required: true,
      hint:
        "Workspace user whose Gmail we act on. Required — service accounts have no mailbox of their own.",
    },
  ],

  async exchange({ fields }, ctx) {
    const email = String((fields as Record<string, unknown>)?.email ?? "").trim();
    const privateKey = String((fields as Record<string, unknown>)?.privateKey ?? "").replace(
      /\\n/g,
      "\n",
    ).trim();
    const delegatedEmail = String((fields as Record<string, unknown>)?.delegatedEmail ?? "").trim();

    if (!email || !privateKey || !delegatedEmail) {
      throw new Error("service-account: email, privateKey, and delegatedEmail are all required");
    }

    const accessToken = await mintAccessToken(
      { email, privateKey, delegatedEmail },
      ctx.fetch,
    );
    return { email, privateKey, delegatedEmail, ...accessToken };
  },

  async refresh({ credential }, ctx) {
    const c = credential as {
      email: string;
      privateKey: string;
      delegatedEmail: string;
    };
    const accessToken = await mintAccessToken(c, ctx.fetch);
    return { ...c, ...accessToken };
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken?: string };
    if (accessToken) {
      request.headers["authorization"] = `Bearer ${accessToken}`;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) {
      return {
        ok: false,
        message: "credential missing accessToken — was `exchange` run?",
      };
    }
    const res = await ctx.fetch(`${API_URL}/users/me/profile`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, message: `Gmail returned ${res.status}` };
    return { ok: true };
  },

  async afterConnect({ credential }, _ctx) {
    const { delegatedEmail } = credential as { delegatedEmail?: string };
    return { user: { email: delegatedEmail } };
  },
};

export default serviceAccount;

/**
 * Mint a short-lived Google OAuth2 access token from a service account key
 * using the JWT bearer grant.
 *
 * TODO(rs256): `signRs256` below is a stub — replace with a WebCrypto import +
 * sign once PKCS#8 PEM handling is in the tree. Until then this function
 * throws and connections will fail loudly at exchange time.
 */
async function mintAccessToken(
  input: { email: string; privateKey: string; delegatedEmail: string },
  fetchImpl: typeof fetch,
): Promise<{ accessToken: string; expiresAt: number }> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: input.email,
    sub: input.delegatedEmail,
    scope: SCOPES.join(" "),
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };
  const encoder = new TextEncoder();
  const base64url = (bytes: Uint8Array) =>
    btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const encodedHeader = base64url(encoder.encode(JSON.stringify(header)));
  const encodedClaim = base64url(encoder.encode(JSON.stringify(claim)));
  const signingInput = `${encodedHeader}.${encodedClaim}`;

  const signature = await signRs256(signingInput, input.privateKey);
  const assertion = `${signingInput}.${signature}`;

  const res = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: JWT_GRANT, assertion }).toString(),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`service-account: token exchange failed ${res.status}: ${detail}`);
  }
  const json = await res.json() as { access_token: string; expires_in: number };
  return {
    accessToken: json.access_token,
    expiresAt: Math.floor(Date.now() / 1000) + Number(json.expires_in ?? 3600),
  };
}

/**
 * RS256 signature over `signingInput` using a PEM-encoded PKCS#8 private key.
 *
 * TODO(rs256): implement the WebCrypto path. Sketch:
 *   const pkcs8 = pemToArrayBuffer(pem);
 *   const key = await crypto.subtle.importKey(
 *     "pkcs8", pkcs8,
 *     { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
 *     false, ["sign"]);
 *   const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key,
 *     new TextEncoder().encode(signingInput));
 *   return base64url(new Uint8Array(sig));
 * The PEM → ArrayBuffer conversion needs to strip the BEGIN/END lines and
 * decode the base64 body; Deno's `@std/encoding` has `decodeBase64` for that.
 */
function signRs256(_signingInput: string, _privateKeyPem: string): Promise<string> {
  return Promise.reject(
    new Error(
      "service-account: RS256 signing is not implemented — plumb WebCrypto RSASSA-PKCS1-v1_5 here (see TODO(rs256) in auth/service-account.ts).",
    ),
  );
}
