import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/note-list.ts";

Deno.test("note-list: GETs /notes with query filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({ associatedWithType: "account", associatedWithId: 3 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/notes");
  assertEquals(url.searchParams.get("associated_with_type"), "account");
  assertEquals(url.searchParams.get("associated_with_id"), "3");
});
