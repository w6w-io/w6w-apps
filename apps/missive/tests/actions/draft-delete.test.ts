import { assertEquals } from "@std/assert";
import action from "../../actions/draft-delete.ts";
import { assertActionRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("draft-delete: deletes by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute({ id: "d1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/drafts/d1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { status: 204 });
});

Deno.test("draft-delete: requires id", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() => action.execute({ id: "" }, ctx));
});
