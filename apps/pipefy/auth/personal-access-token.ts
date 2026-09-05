import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * Pipefy Personal Access Token — generated at app.pipefy.com/tokens, never
 * expires, and carries the full access of whichever user generated it.
 *
 * Included even though Pipefy's own docs mark it deprecated ("Personal
 * Access Tokens are not intended to be used in production environments and
 * process integrations... Service Accounts... must be used in real-life
 * scenarios") because it is still a genuinely documented, currently working
 * method — not removed, just discouraged — and it's the only zero-setup
 * path for a single operator who doesn't want to create an organization
 * Service Account. `description` carries the same warning so the choice is
 * informed rather than silent.
 */
const personalAccessToken: AuthDefinition = {
  key: "personal-access-token",
  type: "bearer",
  displayName: "Personal Access Token",
  description:
    "A token generated at app.pipefy.com/tokens, tied to your user and never expiring. " +
    "Pipefy's docs mark this deprecated in favor of a Service Account (the " +
    '"Service Account" auth method above) for production integrations — use it only ' +
    "for a personal or single-operator setup.",
  fields: [
    {
      key: "token",
      label: "Personal Access Token",
      type: "secret",
      required: true,
      hint: "Generated at app.pipefy.com/tokens.",
    },
  ],

  sign({ request, credential }) {
    const { token } = credential as { token: string };
    request.headers["authorization"] = `Bearer ${token}`;
    return request;
  },

  /**
   * `{ me { id } }` needs no scope beyond "is logged in" — checked on both
   * of Pipefy's documented failure channels: the OAuth2-flavored
   * `invalid_token` envelope (top-level `error`/`error_description`, no
   * `data`) and the REST-flavored `errors[{ title, detail }]` envelope, both
   * confirmed on the wire against an unsigned/garbage token.
   */
  async test({ credential }, ctx) {
    const { token } = credential as { token?: string };
    if (!token) return { ok: false, message: "credential missing token" };

    const res = await ctx.fetch(API_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ query: "{ me { id } }" }),
    });

    const body = await res.json().catch(() => ({})) as {
      data?: { me?: { id?: string } | null };
      errors?: Array<{ message?: string; title?: string; detail?: string }>;
      error?: string;
      error_description?: string;
    };
    if (body.error) {
      return { ok: false, message: body.error_description ?? body.error };
    }
    if (body.errors?.length) {
      const e = body.errors[0];
      return { ok: false, message: e.message ?? e.title ?? "Pipefy rejected the credential" };
    }
    if (!res.ok) return { ok: false, message: `Pipefy returned ${res.status}` };
    if (!body.data?.me?.id) return { ok: false, message: "Pipefy returned no user" };
    return { ok: true };
  },
};

export default personalAccessToken;
