import { assertEquals } from "@std/assert";
import respondentDelete from "../../actions/respondent-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("respondent-delete: DELETEs /respondents/{respondentId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await respondentDelete.execute({ respondentId: "r1" }, ctx) as { status: number };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/respondents/r1");
  assertEquals(out.status, 204);
});
