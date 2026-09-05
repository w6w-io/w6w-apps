import type { AuthDefinition } from "@w6w/types";
import { API_PATH, jiraDcErrorMessage, normalizeBaseUrl } from "../lib/client.ts";

/**
 * Username + password (`Basic`) — the vendor's own "Authentication" page
 * (`developer.atlassian.com/server/jira/platform/rest-apis/`, fetched
 * 2026-09-05) lists this under "Other", not "Recommended", with the note:
 * "This method is only recommended for tools like scripts or bots. It is
 * easier to implement but much less secure." Kept as a second method because
 * many Data Center admins disable PAT creation for their org while leaving
 * ordinary login credentials usable.
 *
 * Unlike Jira Cloud (whose Basic method pairs an email with an API token),
 * Data Center's Basic auth takes the actual account **username** and
 * **password** — there is no separate API-token concept for Basic here; a PAT
 * is used as a Bearer credential instead (see `personal-access-token.ts`), not
 * as a Basic password. Nothing in the vendor's docs describes trading a PAT
 * for the password slot, so this app does not offer that combination.
 */
const basic: AuthDefinition = {
  key: "basic",
  type: "basic",
  displayName: "Username & Password",
  description: "Your Jira account's own login username and password, plus your instance's URL. " +
    "Less secure than a Personal Access Token — prefer that method when your instance allows it.",
  connectionLabel: "{{user.displayName}} ({{baseUrl}})",
  fields: [
    {
      key: "baseUrl",
      label: "Jira instance URL",
      type: "string",
      required: true,
      placeholder: "https://jira.acme.internal",
      hint: "Your organisation's own Jira Data Center or Server address. A URL without a scheme " +
        "is assumed to be https.",
    },
    { key: "username", label: "Username", type: "string", required: true, row: "creds" },
    { key: "password", label: "Password", type: "secret", required: true, row: "creds" },
  ],

  sign({ request, credential }) {
    const { username, password } = credential as { username: string; password: string };
    request.headers["authorization"] = `Basic ${btoa(`${username}:${password}`)}`;
    return request;
  },

  /** `GET /rest/api/2/myself` — see `personal-access-token.ts` for why this probe is safe. */
  async test({ credential }, ctx) {
    const { baseUrl, username, password } = credential as {
      baseUrl?: string;
      username?: string;
      password?: string;
    };
    if (!baseUrl || !username || !password) {
      return { ok: false, message: "credential missing baseUrl, username or password" };
    }

    let base: string;
    try {
      base = normalizeBaseUrl(baseUrl);
    } catch (err) {
      return { ok: false, message: String((err as Error).message) };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${base}${API_PATH}/myself`, {
        headers: {
          authorization: `Basic ${btoa(`${username}:${password}`)}`,
          accept: "application/json",
        },
      });
    } catch (err) {
      return { ok: false, message: `Jira instance unreachable: ${String(err)}` };
    }

    if (res.status === 401) {
      return { ok: false, message: "Jira rejected the username/password (401)" };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, message: jiraDcErrorMessage(res.status, res.statusText, text) };
    }
    const body = await res.json().catch(() => null) as { name?: string } | null;
    if (!body?.name) {
      return { ok: false, message: "/myself answered without a `name` field — unexpected shape" };
    }
    return { ok: true };
  },

  /** Records the instance URL and the account. Never the password. */
  async afterConnect({ credential }, ctx) {
    const { baseUrl, username, password } = credential as {
      baseUrl?: string;
      username?: string;
      password?: string;
    };
    if (!baseUrl) return {};
    const normalized = normalizeBaseUrl(baseUrl);
    if (!username || !password) return { baseUrl: normalized };
    const res = await ctx.fetch(`${normalized}${API_PATH}/myself`, {
      headers: {
        authorization: `Basic ${btoa(`${username}:${password}`)}`,
        accept: "application/json",
      },
    });
    if (!res.ok) return { baseUrl: normalized };
    const me = await res.json().catch(() => ({})) as {
      name?: string;
      key?: string;
      displayName?: string;
      emailAddress?: string;
    };
    return {
      baseUrl: normalized,
      user: { name: me.name, key: me.key, displayName: me.displayName, email: me.emailAddress },
    };
  },
};

export default basic;
