import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/workflow-get.ts";

Deno.test("workflow-get: GETs /workflows/{id} and unwraps the `data` envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "w1", name: "Onboarding" } } }]);
  const out = await action.execute({ workflowId: "w1" }, ctx);
  assertEquals(calls[0].url, "https://public-api.process.st/api/v1.1/workflows/w1");
  assertEquals(out.workflow, { id: "w1", name: "Onboarding" });
});

Deno.test("workflow-get: encodes the workflow id in the path", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "a/b", name: "x" } } }]);
  await action.execute({ workflowId: "a/b" }, ctx);
  assertEquals(calls[0].url, "https://public-api.process.st/api/v1.1/workflows/a%2Fb");
});
