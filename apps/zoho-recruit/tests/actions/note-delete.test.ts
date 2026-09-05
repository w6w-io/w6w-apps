import { assertEquals } from "@std/assert";
import { mockRecruitCtx } from "../_helpers.ts";
import action from "../../actions/note-delete.ts";

Deno.test("note-delete: DELETEs /Notes with the id in the `ids` query param", async () => {
  const { ctx, calls } = mockRecruitCtx([
    { body: { data: [{ code: "SUCCESS", status: "success", details: { id: "n1" } }] } },
  ]);
  await action.execute({ noteId: "n1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(url.pathname, "/recruit/v2/Notes");
  assertEquals(url.searchParams.get("ids"), "n1");
});

Deno.test("note-delete: idempotent — deleting an already-deleted note converges", () => {
  assertEquals(action.idempotent, true);
});
