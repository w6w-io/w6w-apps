import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * PDFMonkey API secret key. Mint/regenerate it from the Dashboard's API Key
 * page. Every request signs with `Authorization: Bearer <key>` — verified
 * against `docs/api/authentication` ("Pass your key in the Authorization
 * HTTP header, prefixed with Bearer").
 *
 * ## Why the credential probe is NOT the documented whoami
 *
 * The docs' own "make a test API call" example is `GET /current_user`, and
 * that is exactly the wrong choice here: its sample response includes an
 * `"auth_token"` field alongside the account's plan/email/etc. This matches
 * the Devise `authentication_token` pattern (PDFMonkey is a Rails app — its
 * admin console at api.pdfmonkey.io serves a Devise-style sign-in form with
 * a `csrf-token` meta tag), and `docs/api/authentication` gives no reason to
 * believe `auth_token` is a *different* secret from the one just presented
 * in the `Authorization` header. Since this cannot be ruled out from the
 * documented schema, `current_user` is never called anywhere in this app —
 * see `tests/index.test.ts` for the enforcing grep. The probe below instead
 * reuses the same `document_cards` list read this app already exposes as
 * `list-documents`: cheap, needs no scope beyond "read your own documents",
 * and its response body never contains a credential.
 */
const bearerToken: AuthDefinition = {
  key: "bearer-token",
  type: "bearer",
  displayName: "API Secret Key",
  description: "Paste the API secret key from the PDFMonkey Dashboard's API Key page.",
  fields: [
    {
      key: "apiKey",
      label: "API Secret Key",
      type: "secret",
      required: true,
      hint: "PDFMonkey Dashboard → API Key (sidebar).",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `Bearer ${apiKey}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey: string };
    const res = await ctx.fetch(`${API_URL}/document_cards?page[number]=1`, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (res.status === 401) {
      return { ok: false, message: "PDFMonkey rejected the API secret key (401 Unauthorized)." };
    }
    if (!res.ok) return { ok: false, message: `PDFMonkey returned ${res.status}` };
    return { ok: true };
  },
};

export default bearerToken;
