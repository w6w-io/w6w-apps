import type { AuthDefinition } from "@w6w/types";
import { API_PATH, BASE_URL } from "../lib/client.ts";

/**
 * An Onfleet API key, sent as HTTP Basic with the key as the **username** and
 * an **empty password** — a trailing colon with nothing after it.
 *
 * Confirmed against `docs.onfleet.com/reference/authentication`: "the key
 * string is the username of the request, and the password is blank." There
 * is no OAuth flow and no bearer scheme — this is the only auth method
 * Onfleet's API supports.
 *
 * Administrators create and manage keys from the dashboard's API & Webhooks
 * settings, and may optionally scope one to only the tasks it creates itself
 * — see `docs.onfleet.com/reference/scope-api-key`. A scoped key still works
 * with every action here, but reads/writes outside tasks it created will be
 * rejected by Onfleet with a permissions error rather than by this app.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "basic",
  displayName: "API Key",
  description:
    "An Onfleet API key, sent as the Basic-auth username with an empty password. Create one " +
    "from the dashboard's API & Webhooks settings.",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Onfleet Dashboard → Settings → API & Webhooks.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    // The key is the username and the password is empty — hence the colon
    // with nothing after it, which is easy to omit entirely.
    request.headers["authorization"] = `Basic ${btoa(`${apiKey}:`)}`;
    return request;
  },

  /**
   * `GET /auth/test` — Onfleet's own documented way to check a key
   * ("Testing your API key"). It answers with a one-line message naming the
   * organization and the caller's IP, never the key itself, so this cannot
   * be used to recover the credential from the response.
   */
  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    let res: Response;
    try {
      res = await ctx.fetch(`${BASE_URL}${API_PATH}/auth/test`, {
        headers: {
          authorization: `Basic ${btoa(`${apiKey}:`)}`,
          accept: "application/json",
        },
      });
    } catch (err) {
      return { ok: false, message: `could not reach Onfleet: ${String(err)}` };
    }

    if (res.status === 401 || res.status === 403) {
      await res.body?.cancel();
      return { ok: false, message: "Onfleet rejected this API key" };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { ok: false, message: `Onfleet returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as { message?: string } | null;
    return { ok: true, message: body?.message ?? "connected" };
  },
};

export default apiKey;
