import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-design-autofill-job.ts";

Deno.test("get-design-autofill-job: GETs /rest/v1/autofills/{jobId} and unwraps job", async () => {
  const { ctx, calls } = mockCtx([{
    body: { job: { id: "j1", status: "success", result: { type: "create_design" } } },
  }]);
  const result = await action.execute({ jobId: "j1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/v1/autofills/j1");
  assertEquals(result, { id: "j1", status: "success", result: { type: "create_design" } });
});
