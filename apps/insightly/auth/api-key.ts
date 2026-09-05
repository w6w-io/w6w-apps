import type { AuthDefinition } from "@w6w/types";
import { baseUrl, errorMessage } from "../lib/client.ts";

/**
 * API Key (`basic`).
 *
 * Verified against the API's own help text (`api.na1.insightly.com/v3.1/help`,
 * "Authentication" section): "Insightly uses HTTP Basic authentication to
 * determine which user is making calls to the API. Each user needs an API
 * key... The API key needs to be included as the Base64-encoded username,
 * leaving the password blank."
 *
 * Unlike Freshdesk's `apikey:X` scheme, Insightly's password half is
 * genuinely empty — the documented example encodes just
 * `ac9a2292-f25a-4483-9d54-000000000000:` (trailing colon, nothing after it).
 *
 * Every API key is tied to one Insightly user, so calls made with it inherit
 * that user's own permissions on records — there is no separate app-level
 * credential.
 *
 * ## The pod
 *
 * Insightly is multi-tenant across regional hosts (`api.na1.insightly.com`,
 * `api.eu1.insightly.com`, ...). The pod identifies the ACCOUNT, exactly like
 * Freshdesk's and Gorgias's subdomain, so it is collected here as a
 * Connection field rather than re-entered on every action — `lib/client.ts`
 * reads it off the Connection's redacted `display`, which `afterConnect`
 * populates below.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "basic",
  displayName: "API Key",
  description:
    "Find your API key and pod under User Settings in Insightly — the API URL shown there is " +
    "https://api.{pod}.insightly.com/v3.1/, and the pod is just that {pod} segment (e.g. na1).",
  connectionLabel: "{{name}} ({{pod}})",
  fields: [
    {
      key: "pod",
      label: "Pod",
      type: "string",
      required: true,
      placeholder: "na1",
      hint: "The subdomain segment from your API URL, e.g. na1 in api.na1.insightly.com.",
      validation: { pattern: "^[a-zA-Z0-9-]+$" },
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "User Settings → API Key.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    // Basic auth with the API key as the username and a BLANK password —
    // confirmed against the API's own documented example call.
    request.headers["authorization"] = `Basic ${btoa(`${apiKey}:`)}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { pod, apiKey } = credential as { pod?: string; apiKey?: string };
    if (!pod || !apiKey) return { ok: false, message: "credential missing pod or apiKey" };

    const res = await ctx.fetch(`${baseUrl(pod)}/Users/Me`, {
      headers: { accept: "application/json", authorization: `Basic ${btoa(`${apiKey}:`)}` },
    });
    const text = await res.text().catch(() => "");
    if (res.status === 401) {
      return {
        ok: false,
        message: `Insightly rejected the API key (401${
          errorMessage(text) ? `: ${errorMessage(text)}` : ""
        }). Check the key under User Settings, or that it wasn't reset.`,
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        message: `Insightly returned ${res.status} at pod "${pod}"${
          errorMessage(text) ? `: ${errorMessage(text)}` : ""
        }. Check the pod segment from your API URL.`,
      };
    }
    return { ok: true };
  },

  /** Records the pod and the credential's own user. Never the key. */
  async afterConnect({ credential }, ctx) {
    const { pod, apiKey } = credential as { pod?: string; apiKey?: string };
    if (!pod) return {};

    try {
      const res = await ctx.fetch(`${baseUrl(pod)}/Users/Me`, {
        headers: { accept: "application/json", authorization: `Basic ${btoa(`${apiKey}:`)}` },
      });
      if (!res.ok) return { pod };
      const user = await res.json().catch(() => null) as {
        FIRST_NAME?: string;
        LAST_NAME?: string;
        EMAIL_ADDRESS?: string;
      } | null;
      if (!user) return { pod };
      const name = [user.FIRST_NAME, user.LAST_NAME].filter(Boolean).join(" ").trim();
      return { pod, name: name || undefined, email: user.EMAIL_ADDRESS };
    } catch {
      return { pod };
    }
  },
  // No `revoke`: the v3.1 API exposes no endpoint to invalidate an API key.
  // Resetting it is a step the user takes in User Settings, same as rotating
  // a Freshdesk or Gorgias credential.
};

export default apiKey;
