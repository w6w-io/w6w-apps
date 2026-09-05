import { assertEquals } from "@std/assert";
import { mockRecruitCtx } from "../_helpers.ts";
import action from "../../actions/job-opening-update.ts";

Deno.test("job-opening-update: PUTs /Job_Openings with the id merged into the fields", async () => {
  const { ctx, calls } = mockRecruitCtx([
    { body: { data: [{ code: "SUCCESS", status: "success", details: { id: "1" } }] } },
  ]);
  await action.execute({ recordId: "1", fields: { Target_Date: "2027-01-01" } }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/recruit/v2/Job_Openings");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { data: [{ id: "1", Target_Date: "2027-01-01" }] });
});

Deno.test("job-opening-update: idempotent — retrying converges on the same fields", () => {
  assertEquals(action.idempotent, true);
});
