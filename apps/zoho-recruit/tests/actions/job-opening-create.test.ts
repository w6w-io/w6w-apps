import { assertEquals } from "@std/assert";
import { mockRecruitCtx } from "../_helpers.ts";
import action from "../../actions/job-opening-create.ts";

Deno.test("job-opening-create: POSTs the fields wrapped in a data array", async () => {
  const { ctx, calls } = mockRecruitCtx([
    { body: { data: [{ code: "SUCCESS", status: "success", details: { id: "1" } }] } },
  ]);
  await action.execute(
    { fields: { Job_Opening_Name: "Software Engineer", Number_of_Positions: "1" } },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/recruit/v2/Job_Openings");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    data: [{ Job_Opening_Name: "Software Engineer", Number_of_Positions: "1" }],
  });
});

Deno.test("job-opening-create: not idempotent — every call creates a new record", () => {
  assertEquals(action.idempotent, false);
});
