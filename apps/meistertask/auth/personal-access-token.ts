import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Personal Access Token (`bearer`) — the "single account, own automations"
 * path described at https://developers.mindmeister.com/docs/personal-access-token.
 *
 * MeisterTask shares MindMeister's backend for account and OAuth management
 * (stated explicitly on the vendor's authentication page), so a token is
 * minted at https://www.mindmeister.com/api rather than anywhere under
 * meistertask.com — the token itself is presented to the MeisterTask API
 * exactly like an OAuth access token, over the same
 * `Authorization: Bearer` header.
 *
 * A personal access token never expires "by time"; it lasts until revoked
 * from that same page. For the "public integrator, many end users" path see
 * `./oauth2.ts`.
 */
export interface MeisterTaskCredential {
  token: string;
}

const personalAccessToken: AuthDefinition = {
  key: "personal-access-token",
  type: "bearer",
  displayName: "Personal Access Token",
  description: "Paste a personal access token created at mindmeister.com/api (MeisterTask shares " +
    "MindMeister's account backend). Select the userinfo.profile, userinfo.email and " +
    "meistertask scopes when creating it.",
  connectionLabel: "{{firstname}} {{lastname}} ({{email}})",
  fields: [
    {
      key: "token",
      label: "Personal Access Token",
      type: "secret",
      required: true,
      hint: "Created at mindmeister.com/api > Personal Access Tokens. Needs the " +
        "userinfo.profile, userinfo.email and meistertask scopes.",
    },
  ],

  /** The only hook handed the raw credential. Runs network-less. */
  sign({ request, credential }) {
    const { token } = credential as Partial<MeisterTaskCredential>;
    request.headers["authorization"] = `Bearer ${token ?? ""}`;
    return request;
  },

  /**
   * `GET /persons/me` — requires a credential, and its response is the
   * caller's own profile (name, email, avatar, timestamps): no token, no
   * secret, nothing that would turn a health probe into a credential leak.
   */
  async test({ credential }, ctx) {
    const { token } = credential as Partial<MeisterTaskCredential>;
    if (!token) return { ok: false, message: "credential missing token" };

    const res = await ctx.fetch(`${API_BASE}/persons/me`, {
      headers: { accept: "application/json", authorization: `Bearer ${token}` },
    });
    if (res.ok) return { ok: true };

    if (res.status === 401) {
      return {
        ok: false,
        message: "MeisterTask rejected the token (401). Check it was copied exactly and has " +
          "not been revoked at mindmeister.com/api.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: "MeisterTask refused the /persons/me read (403) — the token may be missing " +
          "the userinfo.profile or userinfo.email scope.",
      };
    }
    return { ok: false, message: `MeisterTask returned HTTP ${res.status} for /persons/me` };
  },

  /** Publish the account's name and email for the connection label. Failure here is silent. */
  async afterConnect({ credential }, ctx) {
    const { token } = credential as Partial<MeisterTaskCredential>;
    try {
      const res = await ctx.fetch(`${API_BASE}/persons/me`, {
        headers: { accept: "application/json", authorization: `Bearer ${token ?? ""}` },
      });
      if (!res.ok) return {};
      const body = await res.json() as {
        id?: number;
        firstname?: string;
        lastname?: string;
        email?: string;
      };
      if (!body?.email && !body?.firstname) return {};
      return {
        id: body.id,
        firstname: body.firstname,
        lastname: body.lastname,
        email: body.email,
      };
    } catch {
      return {};
    }
  },
};

export default personalAccessToken;
