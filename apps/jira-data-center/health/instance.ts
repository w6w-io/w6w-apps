/**
 * Is **this connection's** Jira instance reachable? — `GET /rest/api/2/serverInfo`.
 *
 * Jira Data Center / Server has no single vendor host: every customer runs it
 * on their own domain. So the question worth asking is not "is Jira up" but
 * "is the instance THIS connection points at up" — answerable independently
 * of whether the stored credential has expired or been revoked, because an
 * expired token and a dead instance look identical from the outside
 * otherwise.
 *
 * This check sends no credential (`credential: "context"`) and classifies the
 * response by its BODY, not just its status: some instances answer
 * `serverInfo` anonymously (Atlassian's own upgrade-compatibility tooling
 * relies on this historically); others require a session even for this
 * endpoint. Either way, an unsigned request that comes back with Jira's own
 * schema-correct error envelope (`{"errorMessages": [...]}`) has still proved
 * the instance is up and serving Jira — that is a reachability PASS, not an
 * outage, and treating a 401 here as "down" would misreport a perfectly
 * healthy, access-controlled instance.
 *
 * Annotation:
 *   - `kind: "dependency"` — "is the thing this Connection points at
 *     reachable", not "is Jira's platform up" (there is no such platform for
 *     self-hosted software — see `service.ts`) and not "is the credential
 *     live" (the derived `auth:*` checks already cover that).
 *   - `scope: "connection"` — every Connection points at a different instance.
 *   - `credential: "context"` — the Connection supplies the URL only.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_PATH, baseUrlFromConnection, jiraDcErrorMessage } from "../lib/client.ts";

interface ServerInfoBody {
  version?: string;
  buildNumber?: number;
  deploymentType?: string;
  serverTitle?: string;
}

interface JiraErrorBody {
  errorMessages?: string[];
}

const instance: HealthCheckDefinition = {
  key: "instance",
  title: "Jira instance reachable",
  description: "This connection's own instance, via its GET /serverInfo. Sends no credential — " +
    "an instance that requires auth even for this endpoint still counts as reachable.",
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
      res = await ctx.fetch(`${base}${API_PATH}/serverInfo`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return { state: "down", message: `instance unreachable: ${String(err)}` };
    }

    const text = await res.text().catch(() => "");

    if (res.ok) {
      const body = JSON.parse(text || "{}") as ServerInfoBody;
      const parts = [
        body.serverTitle,
        body.version ? `Jira ${body.version}` : undefined,
        body.deploymentType,
      ].filter(Boolean);
      return {
        state: "ok",
        message: parts.length > 0 ? parts.join(", ") : "reachable",
        ttlSeconds: 60,
      };
    }

    if (res.status === 401 || res.status === 403) {
      // A schema-correct Jira error body proves this IS a Jira instance
      // answering, not a dead host or an unrelated service on the same port.
      let body: JiraErrorBody | null = null;
      try {
        body = text ? (JSON.parse(text) as JiraErrorBody) : null;
      } catch {
        body = null;
      }
      if (body && Array.isArray(body.errorMessages)) {
        return {
          state: "ok",
          message: "instance reachable — serverInfo requires authentication on this instance",
          ttlSeconds: 60,
        };
      }
      return {
        state: "unknown",
        message: `instance answered ${res.status} with an unrecognised body`,
      };
    }

    return {
      state: "down",
      message: res.status === 404
        ? `nothing at ${base}${API_PATH}/serverInfo (404) — is the instance URL right?`
        : jiraDcErrorMessage(res.status, res.statusText, text),
    };
  },
};

export default instance;
