import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-security-scan-findings.ts";
import { mockConnectedCtx, mockCtx, pathOf, WORKSPACE_ID } from "../_helpers.ts";

const RUN = {
  run_id: "run1",
  app_id: "app1",
  workspace_id: WORKSPACE_ID,
  created_date: "2026-07-26T14:32:17Z",
  coverage: {
    rls: "completed",
    hardcoded_secrets: "completed",
    backend_functions: "completed",
    dependency_vulnerabilities: "completed",
    static_code: "completed",
  },
  rls_recommendations: [],
  hardcoded_secrets: [{ file_path: "src/x.ts" }],
  backend_functions: [],
  dependency_vulnerabilities: [],
  static_code_findings: [],
};

Deno.test("get-security-scan-findings: maps the run, defaulting missing arrays to empty", async () => {
  const { ctx, calls } = mockConnectedCtx([{ status: 200, body: RUN }]);
  const result = await action.execute!({ runId: "run1" }, ctx) as {
    runId: string;
    coverage: unknown;
    hardcodedSecrets: unknown[];
    rlsRecommendations: unknown[];
  };

  assertEquals(pathOf(calls[0].url), `/api/v1/audit-logs/${WORKSPACE_ID}/security-scan-runs/run1`);
  assertEquals(result.runId, "run1");
  assertEquals(result.coverage, RUN.coverage);
  assertEquals(result.hardcodedSecrets, RUN.hardcoded_secrets);
  assertEquals(result.rlsRecommendations, []);
});

Deno.test("get-security-scan-findings: tolerates a response with no finding arrays at all", async () => {
  const { ctx } = mockConnectedCtx([{
    status: 200,
    body: {
      run_id: "run1",
      app_id: "app1",
      created_date: "2026-07-26T14:32:17Z",
      coverage: { rls: "not_run" },
    },
  }]);
  const result = await action.execute!({ runId: "run1" }, ctx) as {
    staticCodeFindings: unknown[];
    dependencyVulnerabilities: unknown[];
  };
  assertEquals(result.staticCodeFindings, []);
  assertEquals(result.dependencyVulnerabilities, []);
});

Deno.test("get-security-scan-findings: requires runId without making a request", async () => {
  const { ctx, calls } = mockConnectedCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "runId is required");
  assertEquals(calls.length, 0);
});

Deno.test("get-security-scan-findings: fails without a connected workspace", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ runId: "run1" }, ctx),
    Error,
    "workspace id",
  );
});
