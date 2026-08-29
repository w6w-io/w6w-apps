import { assertEquals } from "@std/assert";
import draftDelete from "../../actions/draft-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("draft-delete: DELETEs the draft and returns the 204 status", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await draftDelete.execute({ socialSetId: 4, draftId: 12 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/social-sets/4/drafts/12");
  assertEquals(out, { status: 204 });
});

Deno.test("draft-delete: is idempotent — a retry after 404 is safe", () => {
  assertEquals(draftDelete.idempotent, true);
});
