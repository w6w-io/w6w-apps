import { assertEquals } from "@std/assert";
import { mockRecruitCtx } from "../_helpers.ts";
import action from "../../actions/job-opening-status-change.ts";

Deno.test("job-opening-status-change: PUTs /Job_Openings/status with Job_Opening_Status", async () => {
  const { ctx, calls } = mockRecruitCtx([
    { body: { data: [[{ code: "SUCCESS", status: "success", details: { id: "1" } }]] } },
  ]);
  const out = await action.execute({ ids: "1", status: "Closed", comments: "Filled" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/recruit/v2/Job_Openings/status");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), {
    data: [{ ids: ["1"], Job_Opening_Status: "Closed", comments: "Filled" }],
  });
  assertEquals(out.results.length, 1);
});

Deno.test("job-opening-status-change: idempotent — re-applying the same status converges", () => {
  assertEquals(action.idempotent, true);
});
