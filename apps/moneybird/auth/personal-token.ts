import type { AuthDefinition } from "@w6w/types";
import { fetchAdministrations } from "../lib/client.ts";

/**
 * Moneybird personal API token — `Authorization: Bearer <token>`.
 *
 * Per `developer.moneybird.com/authentication`: registering an application at
 * `https://moneybird.com/user/applications/new` offers a choice between a
 * personal API token (a Bearer token, scoped by checkboxes at creation time)
 * and a full OAuth2 application (see `auth/oauth2.ts`). A personal token is
 * the simpler path for a single account integrating with its own books — it
 * "gives access to your entire company account" (the vendor's own words), so
 * it is not the right choice for a multi-tenant integrator, which is what
 * OAuth2 is for.
 *
 * ## Resolving the administration
 *
 * A token is not scoped to one administration; it can reach every
 * administration its owner can. `afterConnect` calls
 * `GET /administrations.json` right after the credential is entered and
 * records the FIRST accessible administration's id on the Connection's
 * `display`, for every action to default to — the same "one Connection, one
 * tenant" choice this pack's Xero (`tenantId`) and Jira (`cloudId`) auth
 * methods make, adapted to a path segment instead of a header. An action can
 * still target a different administration explicitly via its
 * `administrationId` param.
 */

export interface MoneybirdCredential {
  apiToken: string;
}

const personalToken: AuthDefinition = {
  key: "personal-token",
  type: "bearer",
  displayName: "Personal API Token",
  description:
    "Paste a personal API token from moneybird.com > user icon > Developer's zone. This gives " +
    "access to the entire Moneybird account it belongs to, scoped by whichever checkboxes were " +
    "ticked when it was created.",
  connectionLabel: "Moneybird ({{administrationName}})",
  fields: [
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "moneybird.com > user menu > Developer's zone > Personal access tokens.",
    },
  ],

  /** The only hook handed the raw credential. Runs network-less: stamp and return. */
  sign({ request, credential }) {
    const { apiToken } = credential as Partial<MoneybirdCredential>;
    request.headers["authorization"] = `Bearer ${apiToken ?? ""}`;
    return request;
  },

  /**
   * `GET /administrations.json` is the liveness probe: it requires a valid
   * token, needs no scope narrower than any personal token can have (the
   * endpoint lists whatever the token's owner can reach, full stop), and its
   * response body — administration names, ids, currencies — carries no
   * credential material of any kind, unlike a `/me`-style whoami that would
   * risk echoing account secrets.
   */
  async test({ credential }, ctx) {
    const { apiToken } = credential as Partial<MoneybirdCredential>;
    if (!apiToken) return { ok: false, message: "credential missing apiToken" };
    try {
      const admins = await fetchAdministrations(ctx, { authorization: `Bearer ${apiToken}` });
      if (admins.length === 0) {
        return {
          ok: false,
          message: "Moneybird accepted the token but it reaches no administration",
        };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
  },

  /** Resolve and remember the first accessible administration. See the module doc. */
  async afterConnect({ credential }, ctx) {
    const { apiToken } = credential as Partial<MoneybirdCredential>;
    if (!apiToken) return {};
    try {
      const admins = await fetchAdministrations(ctx, { authorization: `Bearer ${apiToken}` });
      const first = admins[0];
      if (!first) return {};
      return {
        administrationId: String(first.id),
        administrationName: first.name,
        administrations: admins.map((a) => ({ id: String(a.id), name: a.name })),
      };
    } catch {
      return {};
    }
  },
};

export default personalToken;
