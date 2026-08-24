import type { ActionDefinition } from "@w6w/types";
import { auditLogsClient, workspaceIdFromConnection } from "../lib/client.ts";

/**
 * `GET /api/v1/audit-logs/{workspace_id}/security-scan-runs/{run_id}` — the
 * sanitized findings and per-section coverage for one security scan run.
 *
 * `runId` comes from an `app.security.check_run` audit event's `run_id`
 * metadata key (see `list-audit-logs`) — there is no endpoint that lists scan
 * runs directly. Secret VALUES are never returned by this endpoint per the
 * vendor's own schema description ("secret values are never returned");
 * hardcoded-secret findings report only where a secret was found, not what
 * it is.
 *
 * A section's `coverage` entry MUST read `"completed"` before its findings
 * array means "clean" — `"failed"`/`"not_run"`/`"unknown"` mean the section
 * simply didn't run, and an empty array there is not evidence of anything.
 * This app surfaces `coverage` and each findings array as-is rather than
 * collapsing them into one verdict, so that distinction isn't lost.
 */
const action: ActionDefinition = {
  key: "get-security-scan-findings",
  type: "read",
  resource: "security-scan",
  title: "Get Security Scan Findings",
  description: "Findings and per-section coverage for one security scan run. Get `runId` from an " +
    '`app.security.check_run` audit event. An empty findings array only means "clean" for a ' +
    "section whose coverage is `completed`.",
  params: [
    {
      key: "runId",
      label: "Run ID",
      type: "string",
      required: true,
      hint: "From the `run_id` metadata key of an `app.security.check_run` audit event.",
    },
  ],
  output: [
    { key: "runId", type: "string", label: "Run ID" },
    { key: "appId", type: "string", label: "App ID" },
    { key: "createdDate", type: "string", label: "Scan run at" },
    {
      key: "coverage",
      type: "object",
      label: "Per-section coverage (completed/failed/not_run/unknown)",
    },
    { key: "rlsRecommendations", type: "array", label: "Row-level security recommendations" },
    { key: "hardcodedSecrets", type: "array", label: "Hardcoded-secret findings" },
    { key: "backendFunctions", type: "array", label: "Backend-function authorization issues" },
    { key: "dependencyVulnerabilities", type: "array", label: "Dependency vulnerabilities" },
    { key: "staticCodeFindings", type: "array", label: "Static code analysis findings" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const runId = String(p.runId ?? "").trim();
    if (!runId) throw new Error("runId is required");

    const workspaceId = workspaceIdFromConnection(ctx.connection);
    const client = auditLogsClient(ctx);

    const run = await client.request<{
      run_id: string;
      app_id: string;
      created_date: string;
      coverage: unknown;
      rls_recommendations?: unknown[];
      hardcoded_secrets?: unknown[];
      backend_functions?: unknown[];
      dependency_vulnerabilities?: unknown[];
      static_code_findings?: unknown[];
    }>(`/${encodeURIComponent(workspaceId)}/security-scan-runs/${encodeURIComponent(runId)}`);

    return {
      runId: run.run_id,
      appId: run.app_id,
      createdDate: run.created_date,
      coverage: run.coverage,
      rlsRecommendations: run.rls_recommendations ?? [],
      hardcodedSecrets: run.hardcoded_secrets ?? [],
      backendFunctions: run.backend_functions ?? [],
      dependencyVulnerabilities: run.dependency_vulnerabilities ?? [],
      staticCodeFindings: run.static_code_findings ?? [],
    };
  },
};

export default action;
