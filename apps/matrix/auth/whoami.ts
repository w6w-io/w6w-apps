import type { HookContext } from "@w6w/types";
import { CLIENT_PATH, matrixErrorMessage, parseMatrixError } from "../lib/client.ts";

/**
 * `GET /_matrix/client/v3/account/whoami`, called unsigned (this module never
 * touches `sign`) with an explicit `Authorization` header, so both Auth
 * methods in this app — which mint the bearer token differently — can share
 * one probe implementation.
 *
 * Lives under `auth/` rather than `lib/`: it builds an `Authorization` header
 * by hand, and this pack's own audit (`_tools/audit.ts`, `credentials/leak`)
 * requires every file that touches one to live here, even a probe this
 * deliberately unsigned.
 */

/** Body shape of `GET /_matrix/client/v3/account/whoami` — never carries the token. */
export interface WhoamiBody {
  user_id?: string;
  device_id?: string;
  is_guest?: boolean;
}

/**
 * Shared by `auth/access-token.ts` and `auth/password.ts`'s `test` hooks. A
 * bad or expired token is only ever diagnosed from the body's own `errcode`
 * (`M_UNKNOWN_TOKEN` / `M_MISSING_TOKEN`), per the spec's "Standard error
 * response" guidance to prefer `errcode` over the raw status.
 */
export async function checkWhoami(
  ctx: HookContext,
  base: string,
  accessToken: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await ctx.fetch(`${base}${CLIENT_PATH}/account/whoami`, {
    headers: { accept: "application/json", authorization: `Bearer ${accessToken}` },
  });
  const text = await res.text().catch(() => "");

  if (res.status === 401) {
    const body = parseMatrixError(text);
    const knownDead = body?.errcode === "M_UNKNOWN_TOKEN" || body?.errcode === "M_MISSING_TOKEN";
    return {
      ok: false,
      message: knownDead
        ? `Matrix rejected the token (${body!.errcode}) — it may have expired, been revoked, or ` +
          "the client/device it belongs to was signed out."
        : `Matrix returned 401${body ? `: ${matrixErrorMessage(text)}` : ""}`,
    };
  }
  if (res.status === 403 || res.status === 404 || !res.ok) {
    return {
      ok: false,
      message: res.status === 404
        ? `no Matrix Client-Server API at ${base}${CLIENT_PATH} (404) — check the homeserver URL`
        : `Matrix returned ${res.status}: ${matrixErrorMessage(text)}`,
    };
  }

  const body = (() => {
    try {
      return JSON.parse(text) as WhoamiBody;
    } catch {
      return null;
    }
  })();
  if (!body?.user_id) {
    return { ok: false, message: "whoami answered but named no user_id — is this Matrix?" };
  }
  return { ok: true };
}

/** Fetch `whoami`'s body directly, for `afterConnect`. `null` on any failure. */
export async function fetchWhoami(
  ctx: HookContext,
  base: string,
  accessToken: string,
): Promise<WhoamiBody | null> {
  try {
    const res = await ctx.fetch(`${base}${CLIENT_PATH}/account/whoami`, {
      headers: { accept: "application/json", authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    return await res.json().catch(() => null) as WhoamiBody | null;
  } catch {
    return null;
  }
}
