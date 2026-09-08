import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/form-field-set.ts";

Deno.test("form-field-set: is functionally idempotent (re-set never duplicates)", () => {
  assertEquals(action.idempotent, true);
});

Deno.test("form-field-set: POSTs the fields array verbatim", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      fields: [{
        id: "f1",
        workflowRunId: "run1",
        taskId: "t1",
        key: "note",
        data: "hi",
        fieldType: "ShortText",
      }],
    },
  }]);
  const out = await action.execute(
    { workflowRunId: "run1", fields: [{ id: "f1", value: "hi" }] },
    ctx,
  );
  assertEquals(
    calls[0].url,
    "https://public-api.process.st/api/v1.1/workflow-runs/run1/form-fields",
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { fields: [{ id: "f1", value: "hi" }] });
  assertEquals(out.fields?.length, 1);
});

Deno.test("form-field-set: supports the multi-value `values` shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { fields: [] } }]);
  await action.execute(
    { workflowRunId: "run1", fields: [{ id: "f2", values: ["a", "b"] }] },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), { fields: [{ id: "f2", values: ["a", "b"] }] });
});
