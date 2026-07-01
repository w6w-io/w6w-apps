import type { AuthDefinition } from "@w6w/types";
import { API_URL, TOKEN_URL } from "../lib/client.ts";

/**
 * Service Account — the "server-to-server" path. The user pastes the service
 * account email + PEM-encoded private key downloaded from Google Cloud
 * Console. On every request we mint a short-lived JWT bearer, exchange it at
 * `oauth2.googleapis.com/token` for an access_token (grant type
 * `urn:ietf:params:oauth:grant-type:jwt-bearer`), and use that.
 *
 * See the sibling `apps/google-sheets` app once it lands for the shared JWT
 * signing pattern; the wire format is identical (only the `scope` claim
 * differs — Drive uses `https://www.googleapis.com/auth/drive`).
 *
 * NOTE: RS256 signing needs SubtleCrypto.importKey on the PEM. That is
 * available in Deno but non-trivial to get right in one shot, so the actual
 * signing is stubbed with a clear TODO. Everything upstream of the signing
 * step (the JWT header + claim set, the token exchange, the sign hook) is in
 * place so the sibling google-sheets implementation can drop in the working
 * signer verbatim.
 */

interface ServiceAccountCredential {
  clientEmail: string;
  privateKey: string;
  /** Optional subject to impersonate via Domain-Wide Delegation. */
  delegatedEmail?: string;
  /** Cached bearer token minted from the JWT exchange. */
  accessToken?: string;
  /** Expiry (epoch seconds) of `accessToken`. */
  expiresAt?: number;
}

const SCOPE = "https://www.googleapis.com/auth/drive";

function base64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlJson(obj: unknown): string {
  return base64url(new TextEncoder().encode(JSON.stringify(obj)));
}

/**
 * Build the JWT assertion header + claim set. The signature is left to
 * `signRs256`, which is stubbed. When wiring the real signer, hash SHA-256 of
 * the concatenated `${headerB64}.${payloadB64}` and RS256-sign with the
 * imported PKCS#8 private key.
 */
export function buildAssertion(
  credential: ServiceAccountCredential,
  now: number = Math.floor(Date.now() / 1000),
): { header: string; payload: string; signingInput: string } {
  const header = base64urlJson({ alg: "RS256", typ: "JWT" });
  const payload = base64urlJson({
    iss: credential.clientEmail,
    sub: credential.delegatedEmail || credential.clientEmail,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  });
  return { header, payload, signingInput: `${header}.${payload}` };
}

/**
 * TODO(service-account): Implement RS256 signing.
 *
 *   const pem = credential.privateKey.replace(/\\n/g, "\n");
 *   const der = pemToDer(pem);   // strip PEM armor + base64-decode
 *   const key = await crypto.subtle.importKey(
 *     "pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
 *   const sig = await crypto.subtle.sign(
 *     "RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(signingInput));
 *   return base64url(new Uint8Array(sig));
 *
 * See the sibling google-sheets app for the shared implementation.
 */
async function signRs256(
  _credential: ServiceAccountCredential,
  _signingInput: string,
): Promise<string> {
  throw new Error(
    "service-account: RS256 signing not implemented — port from apps/google-sheets/auth/service-account.ts",
  );
}

/** Exchange a JWT bearer for an access_token. Exported for testing. */
export async function exchangeJwtForToken(
  ctx: { fetch: typeof fetch },
  assertion: string,
): Promise<{ access_token: string; expires_in?: number }> {
  const res = await ctx.fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
  });
  if (!res.ok) throw new Error(`Google token endpoint returned ${res.status}`);
  return await res.json() as { access_token: string; expires_in?: number };
}

const serviceAccount: AuthDefinition = {
  key: "service-account",
  type: "custom",
  displayName: "Service Account",
  description:
    "Server-to-server auth using a Google Cloud service account. Paste the email + private key from the downloaded JSON credentials file.",
  connectionLabel: "{{user.email}}",
  fields: [
    {
      key: "clientEmail",
      label: "Service Account Email",
      type: "string",
      required: true,
      hint: "e.g. name-808@project.iam.gserviceaccount.com",
    },
    {
      key: "privateKey",
      label: "Private Key",
      type: "secret",
      required: true,
      hint: "The `private_key` field from the downloaded JSON, including the BEGIN/END lines.",
    },
    {
      key: "delegatedEmail",
      label: "Impersonated User (optional)",
      type: "string",
      hint:
        "For Google Workspace Domain-Wide Delegation. Leave blank for standard service-account access.",
    },
  ],

  async sign({ request, credential }, ctx) {
    const cred = credential as ServiceAccountCredential;
    const now = Math.floor(Date.now() / 1000);
    if (!cred.accessToken || !cred.expiresAt || cred.expiresAt - 60 <= now) {
      const { signingInput } = buildAssertion(cred, now);
      const signature = await signRs256(cred, signingInput);
      const assertion = `${signingInput}.${signature}`;
      const token = await exchangeJwtForToken(ctx, assertion);
      cred.accessToken = token.access_token;
      cred.expiresAt = now + (token.expires_in ?? 3600);
    }
    request.headers["authorization"] = `Bearer ${cred.accessToken}`;
    return request;
  },

  async test({ credential }, _ctx) {
    const cred = credential as ServiceAccountCredential;
    if (!cred.clientEmail || !cred.privateKey) {
      return { ok: false, message: "credential missing clientEmail or privateKey" };
    }
    // A real health-check would mint a token and hit /drive/v3/about; we can't
    // do that until signRs256 is wired, so surface the pending state clearly.
    return {
      ok: false,
      message:
        "service-account signing not yet implemented — port the RS256 signer from apps/google-sheets",
    };
  },

  async afterConnect(_input, _ctx) {
    return {};
  },
};

export default serviceAccount;
