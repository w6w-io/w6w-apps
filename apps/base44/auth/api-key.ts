import type { AuthDefinition } from "@w6w/types";
import { AUDIT_LOGS_ROOT, formatBase44Error, MONITORING_ROOT } from "../lib/client.ts";

/**
 * A Base44 API key — a **personal** key (Account settings → API Key) or a
 * **workspace** key (Workspace settings → Secrets → Create API Key), sent as
 * a literal `api_key` header. Verified against
 * `developers/references/monitoring-api/get-started/authentication.md` and
 * `developers/references/audit-logs-api/get-started/authentication.md`.
 *
 * Both APIs are workspace-scoped, so every call needs the workspace's own id
 * as a path segment (`/api/v1/monitoring/{workspace_id}/...`,
 * `/api/v1/audit-logs/{workspace_id}/...`). Base44 documents no endpoint that
 * lists the workspaces a key can reach, so — unlike dbt Cloud's account id —
 * this cannot be discovered at connect time; the docs themselves tell a user
 * to copy it out of the Account settings URL
 * (`https://app.base44.com/workspace/<workspace_id>/settings/account`), so it
 * is collected here rather than guessed.
 *
 * ## The key trap this app has to account for
 *
 * The Monitoring API accepts either key type. The Audit Logs API accepts
 * **only** a workspace key, and only one carrying the `audit_logs:read`
 * scope — a personal key, or a workspace key without that scope, is
 * rejected outright. So a single valid credential can legitimately fail HALF
 * of this app's actions while the other half works fine; that is a scope
 * mismatch, not a dead key. `test` below tries both surfaces before
 * concluding the credential itself is bad, exactly so a workspace key scoped
 * ONLY to `audit_logs:read` (which cannot reach the Monitoring API at all)
 * still connects successfully.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "A Base44 personal API key (Account settings) or workspace API key (Workspace settings → " +
    "Secrets), plus the workspace's id. The Audit Logs API requires a workspace key scoped to " +
    "`audit_logs:read`; a personal key only reaches the Monitoring API.",
  connectionLabel: "Base44 ({{workspaceId}})",
  apiKey: { in: "header", name: "api_key" },
  fields: [
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "string",
      required: true,
      hint: "Workspace name (bottom left) → Settings → Account. It's the id in the URL: " +
        "app.base44.com/workspace/<workspace_id>/settings/account.",
      validation: { pattern: "^[a-zA-Z0-9_-]+$" },
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Personal: profile icon → Settings → Account → API Key. Workspace: workspace name → " +
        "Settings → Secrets → Create API Key.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["api_key"] = apiKey;
    return request;
  },

  /**
   * Tries the Monitoring API first, then the Audit Logs API, and reports
   * success if either answers — see the module doc for why a valid,
   * narrowly-scoped key must not be reported as dead just because it can only
   * reach one of the two surfaces.
   */
  async test({ credential }, ctx) {
    const { workspaceId, apiKey } = credential as { workspaceId?: string; apiKey?: string };
    if (!workspaceId) return { ok: false, message: "credential missing workspaceId" };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const headers = { accept: "application/json", api_key: apiKey };

    let monitoringDetail: string;
    try {
      const res = await ctx.fetch(
        `${MONITORING_ROOT}/analytics/${encodeURIComponent(workspaceId)}`,
        {
          headers,
        },
      );
      if (res.ok) {
        await res.body?.cancel();
        return { ok: true, message: "connected — verified via the Monitoring API" };
      }
      const text = await res.text().catch(() => "");
      monitoringDetail = formatBase44Error(res.status, "GET", "/analytics/{workspace_id}", text);
    } catch (err) {
      return { ok: false, message: `could not reach ${MONITORING_ROOT}: ${String(err)}` };
    }

    let auditDetail: string;
    try {
      const res = await ctx.fetch(`${AUDIT_LOGS_ROOT}/${encodeURIComponent(workspaceId)}/list`, {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ limit: 1 }),
      });
      if (res.ok) {
        await res.body?.cancel();
        return {
          ok: true,
          message: "connected — verified via the Audit Logs API (this key does not reach the " +
            'Monitoring API; reconnect with a key scoped to "Read monitoring data" if you need ' +
            "monitoring actions)",
        };
      }
      const text = await res.text().catch(() => "");
      auditDetail = formatBase44Error(res.status, "POST", "/{workspace_id}/list", text);
    } catch (err) {
      return {
        ok: false,
        message: `Monitoring API: ${monitoringDetail}. Audit Logs API unreachable: ${String(err)}`,
      };
    }

    return {
      ok: false,
      message: `Monitoring API: ${monitoringDetail}. Audit Logs API: ${auditDetail}`,
    };
  },

  afterConnect({ credential }) {
    const { workspaceId } = credential as { workspaceId?: string };
    return { workspaceId };
  },
};

export default apiKey;
