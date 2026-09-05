import { assertEquals } from "@std/assert";
import { mockRecruitCtx } from "../_helpers.ts";
import action from "../../actions/job-opening-get.ts";

Deno.test("job-opening-get: GETs /Job_Openings/{id} and unwraps the single record", async () => {
  const { ctx, calls } = mockRecruitCtx([
    { body: { data: [{ id: "1", Job_Opening_Name: "Software Engineer" }] } },
  ]);
  const out = await action.execute({ recordId: "1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/recruit/v2/Job_Openings/1");
  assertEquals(out, { id: "1", Job_Opening_Name: "Software Engineer" });
});
