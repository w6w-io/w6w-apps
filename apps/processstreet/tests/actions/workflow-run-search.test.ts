import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/workflow-run-search.ts";

Deno.test("workflow-run-search: is a `search` action, distinct from workflow-run-list", () => {
  assertEquals(action.type, "search");
});

Deno.test("workflow-run-search: GETs /workflow-runs and reads the `workflowRuns` envelope", async () => {
  const { ctx, calls } = mockCtx([{
    body: { workflowRuns: [{ id: "run1", status: "Active", workflowId: "w1" }] },
  }]);
  const out = await action.execute({ workflowId: "w1", name: "Audit" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1.1/workflow-runs");
  assertEquals(url.searchParams.get("name"), "Audit");
  // The plain search endpoint has no `_` cursor param at all.
  assertEquals(url.searchParams.has("_"), false);
  assertEquals(out.workflowRuns, [{ id: "run1", status: "Active", workflowId: "w1" }]);
});
