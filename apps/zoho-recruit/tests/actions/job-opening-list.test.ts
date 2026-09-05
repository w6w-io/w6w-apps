import { assertEquals } from "@std/assert";
import { mockRecruitCtx } from "../_helpers.ts";
import action from "../../actions/job-opening-list.ts";

Deno.test("job-opening-list: GETs /Job_Openings — the underscored module API name", async () => {
  const { ctx, calls } = mockRecruitCtx([{ body: { data: [{ id: "1" }], info: { count: 1 } } }]);
  const out = await action.execute({ page: 1, per_page: 50 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/recruit/v2/Job_Openings");
  assertEquals(out, { data: [{ id: "1" }], info: { count: 1 } });
});
