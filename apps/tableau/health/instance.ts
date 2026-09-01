/**
 * Is **this connection's** Tableau server reachable? — `GET /api/{version}/serverinfo`.
 *
 * Tableau has no single vendor host: Tableau Cloud is pod-hosted and Tableau
 * Server is wherever a customer put it. So the question that matters is not
 * "is Tableau up" but "is the server THIS connection points at up" — and that
 * has to be answerable independently of whether the stored session token has
 * gone stale, because an idled-out session and a dead server look identical
 * from the outside otherwise.
 *
 * `serverinfo` is Tableau's own answer to that: "can be called by all users
 * and does not require authentication" (the reference page's own words), and
 * it has answered since API 2.4 — old enough that every server this app can
 * point at supports it. So this check sends NO credential (`credential:
 * "context"`) and pins the request to `SERVER_INFO_API_VERSION` rather than
 * whatever `apiVersion` the connection negotiated, specifically so an expired
 * session or a version mismatch never makes a healthy server look down.
 *
 * Annotation:
 *   - `kind: "dependency"` — "is the thing this Connection points at
 *     reachable", not "is Tableau's platform up" (see `service.ts`) and not
 *     "is the credential live" (the derived `auth:personal-access-token` check).
 *   - `scope: "connection"` — every Connection points at a different server.
 *   - `credential: "context"` — the Connection supplies the URL only.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import {
  baseUrlFromConnection,
  SERVER_INFO_API_VERSION,
  tableauErrorMessage,
} from "../lib/client.ts";

/**
 * `serverInfo.productVersion` and `.restApiVersion` are XML elements with
 * mixed content (`productVersion` also carries a `build` attribute), which
 * JSON-converting XML APIs render inconsistently (`{"#text": "..."}`,
 * `{"_": "..."}`, or a bare string when there is no attribute to carry).
 * This reads whichever shape shows up rather than assuming one — the
 * reachability verdict below does not depend on it parsing.
 */
function readText(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const key of ["#text", "_", "text"]) {
      if (typeof obj[key] === "string") return obj[key] as string;
    }
  }
  return undefined;
}

const instance: HealthCheckDefinition = {
  key: "instance",
  title: "Tableau server reachable",
  description: "This connection's own server, via its unauthenticated GET /serverinfo. Sends " +
    "no credential — an idled-out session must not make the server look down.",
  kind: "dependency",
  covers: ["*"],
  scope: "connection",
  credential: "context",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let base: string;
    try {
      base = baseUrlFromConnection(ctx.connection);
    } catch (err) {
      return { state: "unknown", message: String((err as Error).message) };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${base}/api/${SERVER_INFO_API_VERSION}/serverinfo`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return { state: "down", message: `server unreachable: ${String(err)}` };
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        state: "down",
        message: res.status === 404
          ? `nothing at ${base}/api/${SERVER_INFO_API_VERSION}/serverinfo (404) — is the server ` +
            "URL right?"
          : tableauErrorMessage(res.status, res.statusText, text),
      };
    }

    const body = await res.json().catch(() => null) as {
      serverInfo?: { productVersion?: unknown; restApiVersion?: unknown };
    } | null;
    const info = body?.serverInfo;
    if (!info) return { state: "degraded", message: "serverinfo answered an unexpected shape" };

    const productVersion = readText(info.productVersion);
    const restApiVersion = readText(info.restApiVersion);
    const parts = [
      productVersion ? `Tableau ${productVersion}` : undefined,
      restApiVersion ? `REST API ${restApiVersion}` : undefined,
    ].filter(Boolean);
    return {
      state: "ok",
      message: parts.length > 0 ? parts.join(", ") : "reachable",
      ttlSeconds: 60,
    };
  },
};

export default instance;
