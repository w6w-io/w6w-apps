import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * SignRequest API Token — `Authorization: Token YOUR_TOKEN_HERE`.
 *
 * Verified against `https://signrequest.com/api/v1/schema/swagger.json` (Swagger 2.0,
 * `securityDefinitions.Token = {in: header, type: apiKey, name: Authorization}`) and live probes
 * against `signrequest.com` on 2026-09-05.
 *
 * **The scheme name is literally `Token`, not `Bearer`.** A token is minted on the team's own "API"
 * settings page inside the SignRequest UI. The API also documents `POST /api-tokens/`, which mints a
 * *new* token from an account's `email`+`password` — a second, different credential shape this app
 * deliberately never collects (an Action cannot be handed the raw credential to make that call, and
 * asking for a live password as a connect-time field would be a second, parallel credential store).
 *
 * ## The probe: `GET /teams/`, not `GET /api-tokens/`
 *
 * `GET /api-tokens/` looked like an obvious whoami candidate, but its schema (`AuthToken`) carries a
 * `key` field — meaning a list of existing tokens can echo **token values** back in the response
 * body. That is exactly the Mailjet-`/apikey`/Follow-Up-Boss-`/me` shape this pack refuses to use as
 * a credential probe, so this app never calls it at all (see `README.md`).
 *
 * `GET /teams/` is used instead: it needs no scope beyond "this token can list its own team(s)",
 * and its response (`name`, `subdomain`, `logo`, `phone`, `primary_color`, …) carries no credential
 * material of any kind.
 */

interface TeamSummary {
  name?: string;
  subdomain?: string;
}

interface TeamsList {
  results?: TeamSummary[];
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Token",
  description: "An API token from SignRequest's team API settings page.",
  connectionLabel: "SignRequest ({{teamName}})",
  apiKey: { in: "header", name: "Authorization", prefix: "Token " },
  fields: [
    {
      key: "apiKey",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "SignRequest > Settings > API (team API settings page).",
    },
  ],

  /** The only hook handed the raw credential. Network-less: it stamps the header and returns. */
  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `Token ${apiKey}`;
    return request;
  },

  /** See the module doc for why `GET /teams/` and not `GET /api-tokens/`. */
  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey: string };
    if (!apiKey) return { ok: false, message: "credential has no apiKey" };
    const res = await ctx.fetch(`${API_BASE}/teams/`, {
      headers: { authorization: `Token ${apiKey}`, accept: "application/json" },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { detail?: string };
      return {
        ok: false,
        message: body.detail
          ? `SignRequest rejected the token: ${body.detail}`
          : `SignRequest /teams/ returned ${res.status}`,
      };
    }
    await res.body?.cancel();
    return { ok: true };
  },

  /** Records the first team's name for the connection label. Never the token itself. */
  async afterConnect({ credential }, ctx) {
    const { apiKey } = credential as { apiKey: string };
    const res = await ctx.fetch(`${API_BASE}/teams/`, {
      headers: { authorization: `Token ${apiKey}`, accept: "application/json" },
    });
    if (!res.ok) {
      await res.body?.cancel();
      return {};
    }
    const body = await res.json().catch(() => ({})) as TeamsList;
    const team = body.results?.[0];
    if (!team?.name) return {};
    return { teamName: team.name, teamSubdomain: team.subdomain };
  },
};

export default apiKey;
