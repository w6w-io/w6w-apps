import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/form-field-list.ts";

Deno.test("form-field-list: GETs /workflow-runs/{id}/form-fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      fields: [{
        id: "f1",
        workflowRunId: "run1",
        taskId: "t1",
        key: "email",
        data: "a@b.com",
        fieldType: "Email",
      }],
    },
  }]);
  const out = await action.execute({ workflowRunId: "run1" }, ctx);
  assertEquals(
    calls[0].url,
    "https://public-api.process.st/api/v1.1/workflow-runs/run1/form-fields",
  );
  assertEquals(out.fields?.length, 1);
});

Deno.test("form-field-list: extracts nextCursor", async () => {
  const { ctx } = mockCtx([{
    body: {
      fields: [],
      links: [{
        name: "next",
        href: "https://public-api.process.st/api/v1.1/workflow-runs/run1/form-fields?_=f2",
        type: "Api",
      }],
    },
  }]);
  const out = await action.execute({ workflowRunId: "run1" }, ctx);
  assertEquals(out.nextCursor, "f2");
});
