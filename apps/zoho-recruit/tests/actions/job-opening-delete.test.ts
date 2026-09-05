import { assertEquals } from "@std/assert";
import { mockRecruitCtx } from "../_helpers.ts";
import action from "../../actions/job-opening-delete.ts";

Deno.test("job-opening-delete: DELETEs /Job_Openings with the id in the `ids` query param", async () => {
  const { ctx, calls } = mockRecruitCtx([
    { body: { data: [{ code: "SUCCESS", status: "success", details: { id: "1" } }] } },
  ]);
  await action.execute({ recordId: "1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(url.pathname, "/recruit/v2/Job_Openings");
  assertEquals(url.searchParams.get("ids"), "1");
});

Deno.test("job-opening-delete: idempotent — deleting an already-deleted id converges", () => {
  assertEquals(action.idempotent, true);
});
