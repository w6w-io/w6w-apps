import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/workflow-run-list.ts";

Deno.test("workflow-run-list: GETs /workflow-runs/list and reads the `data` envelope", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ id: "run1", status: "Active", workflowId: "w1" }] },
  }]);
  const out = await action.execute({ workflowId: "w1", status: "Active" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1.1/workflow-runs/list");
  assertEquals(url.searchParams.get("workflowId"), "w1");
  assertEquals(url.searchParams.get("status"), "Active");
  assertEquals(out.workflowRuns, [{ id: "run1", status: "Active", workflowId: "w1" }]);
});

Deno.test("workflow-run-list: extracts nextCursor from the 'next' link", async () => {
  const { ctx } = mockCtx([{
    body: {
      data: [],
      links: [{
        name: "next",
        href: "https://public-api.process.st/api/v1.1/workflow-runs/list?_=tok2",
        type: "Api",
      }],
    },
  }]);
  const out = await action.execute({}, ctx);
  assertEquals(out.nextCursor, "tok2");
});
