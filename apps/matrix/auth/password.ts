import type { AuthDefinition, HookContext } from "@w6w/types";
import { matrixErrorMessage, normalizeHomeserverUrl } from "../lib/client.ts";
import { checkWhoami, fetchWhoami } from "./whoami.ts";

/**
 * `POST /_matrix/client/v3/login` with `type: "m.login.password"` — the
 * "legacy" (non-OAuth2) authentication API's password grant, which every
 * homeserver implementing the Client-Server spec supports.
 *
 * ## Why password login, not OAuth2
 *
 * [Changed in v1.15] the spec added a second, OAuth2-based authentication API
 * alongside the original one, but as of this writing it names no fixed
 * `authorizationUrl`/`tokenUrl` a client can assume — an implementing
 * homeserver publishes its own OAuth issuer via `.well-known` discovery, and
 * "the two APIs are mutually incompatible" per the spec, so a client must
 * commit to one. This app implements the legacy password grant: it needs no
 * separate discovery step, has existed since the first version of the spec,
 * and is the one every currently-deployed homeserver (Synapse, Dendrite,
 * Conduit) is guaranteed to answer.
 *
 * ## A device the workflow owns, not a borrowed session
 *
 * Login always creates or reuses a **device** — the spec: "If the client does
 * not supply a device_id, the server must auto-generate one." This app always
 * supplies `initial_device_display_name` (default "w6w") so the device shows
 * up recognisably in the account's own device list, next to whatever phone or
 * desktop client the account holder uses day to day. That is the main
 * advantage over `access-token`: this is a device this app owns end to end,
 * rather than one borrowed from a client the account holder is signed into.
 *
 * ## Refresh tokens are opt-in, and not every homeserver honours the ask
 *
 * The request sets `refresh_token: true` ("If true, the client supports
 * refresh tokens", added in v1.3). A homeserver that supports them replies
 * with both `access_token` and `refresh_token`, plus `expires_in_ms`; one that
 * doesn't just omits `refresh_token` and the access token is treated as
 * non-expiring, per the spec: "If not given, the client can assume that the
 * access token will not expire." `refresh` below is therefore best-effort —
 * it throws a clear "reconnect" error rather than guessing when there is no
 * refresh token to spend.
 */
export interface MatrixPasswordCredential {
  homeserverUrl: string;
  userId?: string;
  deviceId?: string;
  accessToken: string;
  refreshToken?: string;
  /** ISO 8601. Absent when the homeserver did not report an expiry. */
  expiresAt?: string;
}

interface LoginResponse {
  access_token?: string;
  device_id?: string;
  user_id?: string;
  refresh_token?: string;
  expires_in_ms?: number;
}

/** 60s haircut absorbs clock skew between this host and the homeserver. */
function expiresAtFrom(expiresInMs: number | undefined): string | undefined {
  if (!expiresInMs || expiresInMs <= 0) return undefined;
  const ms = Math.max(expiresInMs - 60_000, 0);
  return new Date(Date.now() + ms).toISOString();
}

async function login(
  ctx: HookContext,
  base: string,
  userIdentifier: string,
  password: string,
  deviceDisplayName: string,
): Promise<LoginResponse> {
  const res = await ctx.fetch(`${base}/_matrix/client/v3/login`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      type: "m.login.password",
      identifier: { type: "m.id.user", user: userIdentifier },
      password,
      initial_device_display_name: deviceDisplayName,
      refresh_token: true,
    }),
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`Matrix login failed (${res.status}): ${matrixErrorMessage(text)}`);
  }
  try {
    return text ? JSON.parse(text) as LoginResponse : {};
  } catch {
    throw new Error("Matrix login returned a non-JSON response");
  }
}

const password: AuthDefinition = {
  key: "password",
  type: "custom",
  displayName: "Username & Password",
  description:
    "Log in with a Matrix account's username and password. This mints its own device (default " +
    'name "w6w") rather than borrowing an existing client session, and refreshes itself ' +
    "automatically when the homeserver issues a refresh token.",
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
      key: "userId",
      label: "Username or Matrix ID",
      type: "string",
      required: true,
      row: "creds",
      placeholder: "alice or @alice:matrix.org",
      hint: 'The account\'s local part ("alice") or fully-qualified Matrix ID.',
    },
    {
      key: "userPassword",
      label: "Password",
      type: "secret",
      required: true,
      row: "creds",
    },
    {
      key: "deviceDisplayName",
      label: "Device Name",
      type: "string",
      default: "w6w",
      advanced: true,
      hint: "Shown in the account's own device list (Settings → Sessions), so it's recognisable " +
        "alongside phone/desktop clients.",
    },
  ],

  /** Turns the pasted username and password into a live access token. */
  async exchange({ fields }, ctx) {
    const f = (fields ?? {}) as Record<string, unknown>;
    const userId = String(f.userId ?? "").trim();
    const userPassword = String(f.userPassword ?? "");
    if (!userId || !userPassword) {
      throw new Error("Username/Matrix ID and Password are both required.");
    }
    const base = normalizeHomeserverUrl(String(f.homeserverUrl ?? ""));
    const deviceDisplayName = String(f.deviceDisplayName ?? "w6w").trim() || "w6w";

    const body = await login(ctx, base, userId, userPassword, deviceDisplayName);
    if (!body.access_token) throw new Error("Matrix login response carried no access_token");

    const cred: MatrixPasswordCredential = {
      homeserverUrl: base,
      userId: body.user_id,
      deviceId: body.device_id,
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      expiresAt: expiresAtFrom(body.expires_in_ms),
    };
    return cred;
  },

  /**
   * `POST /_matrix/client/v3/refresh` — spends the stored refresh token for a
   * new access token (and, per the spec, possibly a new refresh token: "The
   * old refresh token remains valid until the new access token or refresh
   * token is used, at which point the old refresh token is revoked.").
   *
   * If this credential never received a refresh token (the homeserver didn't
   * grant one, or doesn't support them), there is nothing to spend — the spec
   * offers no fallback path for that case, so this throws rather than
   * silently re-running `exchange` with a password it does not have stored.
   */
  async refresh({ credential }, ctx) {
    const cred = credential as Partial<MatrixPasswordCredential>;
    if (!cred?.homeserverUrl || !cred?.refreshToken) {
      throw new Error(
        "no refresh token on file for this connection — reconnect with username and password",
      );
    }
    const res = await ctx.fetch(`${cred.homeserverUrl}/_matrix/client/v3/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ refresh_token: cred.refreshToken }),
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(`Matrix token refresh failed (${res.status}): ${matrixErrorMessage(text)}`);
    }
    const body = text ? JSON.parse(text) as LoginResponse : {};
    if (!body.access_token) throw new Error("Matrix refresh response carried no access_token");

    const next: MatrixPasswordCredential = {
      ...(cred as MatrixPasswordCredential),
      accessToken: body.access_token,
      // "If not given, the old refresh token can be re-used."
      refreshToken: body.refresh_token ?? cred.refreshToken,
      expiresAt: expiresAtFrom(body.expires_in_ms),
    };
    return next;
  },

  /** The only hook handed the raw credential. Runs network-less. */
  sign({ request, credential }) {
    const { accessToken } = credential as Partial<MatrixPasswordCredential>;
    request.headers["authorization"] = `Bearer ${accessToken ?? ""}`;
    return request;
  },

  /** See `access-token.ts` — same probe, same body-based diagnosis, shared in `lib/client.ts`. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<MatrixPasswordCredential>;
    if (!cred?.accessToken) return { ok: false, message: "credential missing accessToken" };
    if (!cred?.homeserverUrl) return { ok: false, message: "credential missing homeserverUrl" };
    return await checkWhoami(ctx, cred.homeserverUrl, cred.accessToken);
  },

  /** Records the homeserver and the account's own Matrix ID. Never the token. */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<MatrixPasswordCredential>;
    if (!cred?.accessToken || !cred?.homeserverUrl) return {};
    const who = await fetchWhoami(ctx, cred.homeserverUrl, cred.accessToken);
    return {
      homeserverUrl: cred.homeserverUrl,
      userId: who?.user_id ?? cred.userId,
      deviceId: who?.device_id ?? cred.deviceId,
    };
  },

  /**
   * `POST /_matrix/client/v3/logout` invalidates this Connection's own access
   * token and deletes the device it minted in `exchange` — cleaning up the
   * device this method created rather than leaving it in the account's device
   * list forever. Best-effort: a homeserver that is unreachable at disconnect
   * time must not block the disconnect itself.
   */
  async revoke({ credential }, ctx) {
    const cred = credential as Partial<MatrixPasswordCredential>;
    if (!cred?.homeserverUrl || !cred?.accessToken) return;
    try {
      await ctx.fetch(`${cred.homeserverUrl}/_matrix/client/v3/logout`, {
        method: "POST",
        headers: { authorization: `Bearer ${cred.accessToken}` },
      });
    } catch {
      // Best-effort — an unreachable homeserver must not block disconnecting.
    }
  },
};

export default password;
