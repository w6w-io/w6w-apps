import type { AuthDefinition } from "@w6w/types";
import { normalizeHomeserverUrl } from "../lib/client.ts";
import { checkWhoami, fetchWhoami } from "./whoami.ts";

/**
 * A long-lived access token, pasted from a Matrix client's own settings
 * (Element: Settings → Help & About → Advanced → "Access Token"), sent as
 * `Authorization: Bearer <token>` — the scheme the spec's "Client
 * Authentication" section names for every access token, whichever way it was
 * minted.
 *
 * ## Why this exists alongside `password`
 *
 * A token created this way belongs to a device that already exists (usually
 * the account holder's own client session), so it survives independently of
 * this Connection and needs no `exchange` step — paste it and go. The
 * trade-off, stated plainly in the field hint: signing out that *client*
 * session (or an admin revoking the device) invalidates it, which is a
 * property of the source client, not of anything this app does.
 *
 * `password` is the other option, for automation that should own its own
 * device rather than borrow someone's logged-in session.
 */
export interface MatrixTokenCredential {
  homeserverUrl: string;
  accessToken: string;
}

const accessToken: AuthDefinition = {
  key: "access-token",
  type: "bearer",
  displayName: "Access Token",
  description:
    "Paste a homeserver URL and an access token copied from a Matrix client (in Element: " +
    "Settings → Help & About → Advanced → Access Token). Signing that client out, or an admin " +
    "revoking the device, invalidates this token too.",
  connectionLabel: "{{userId}} @ {{homeserverUrl}}",
  fields: [
    {
      key: "homeserverUrl",
      label: "Homeserver URL",
      type: "string",
      required: true,
      placeholder: "https://matrix.org",
      hint: "The Matrix homeserver this account lives on. A URL without a scheme is assumed to " +
        "be https.",
    },
    {
      key: "accessToken",
      label: "Access Token",
      type: "secret",
      required: true,
      hint: "Copied from a signed-in client, not your account password. It is tied to that " +
        "client's device and stops working if that device is logged out.",
    },
  ],

  /** The only hook handed the raw credential. Runs network-less. */
  sign({ request, credential }) {
    const { accessToken } = credential as Partial<MatrixTokenCredential>;
    request.headers["authorization"] = `Bearer ${accessToken ?? ""}`;
    return request;
  },

  /**
   * `GET /_matrix/client/v3/account/whoami` is the spec's own identity-check
   * endpoint, and it was chosen by reading its response body, not its name —
   * the rule this pack learned from Follow Up Boss's `/me` echoing the
   * caller's own API key and Mailjet's `/apikey` echoing key and secret.
   * Matrix's whoami returns only `user_id`, `device_id` and `is_guest` — never
   * the token that was sent. See `lib/client.ts#checkWhoami` for how a 401 is
   * turned into a message.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<MatrixTokenCredential>;
    if (!cred?.accessToken) return { ok: false, message: "credential missing accessToken" };
    if (!cred?.homeserverUrl) return { ok: false, message: "credential missing homeserverUrl" };

    let base: string;
    try {
      base = normalizeHomeserverUrl(cred.homeserverUrl);
    } catch (err) {
      return { ok: false, message: String((err as Error).message) };
    }

    return await checkWhoami(ctx, base, cred.accessToken);
  },

  /** Records the homeserver and the account's own Matrix ID. Never the token. */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<MatrixTokenCredential>;
    if (!cred?.accessToken || !cred?.homeserverUrl) return {};

    let base: string;
    try {
      base = normalizeHomeserverUrl(cred.homeserverUrl);
    } catch {
      return {};
    }

    const who = await fetchWhoami(ctx, base, cred.accessToken);
    if (!who) return { homeserverUrl: base };
    return { homeserverUrl: base, userId: who.user_id, deviceId: who.device_id };
  },
};

export default accessToken;
