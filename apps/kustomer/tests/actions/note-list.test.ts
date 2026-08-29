import { assertEquals } from "@std/assert";
import { mockKustomerCtx } from "../_helpers.ts";
import action from "../../actions/note-list.ts";

Deno.test("note-list: GETs /conversations/{id}/notes with pagination", async () => {
  const { ctx, calls } = mockKustomerCtx([{ body: { data: [], meta: { page: 1 } } }]);
  const out = await action.execute({ conversationId: "c1", page: 1, pageSize: 10 }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.api.kustomerapp.com/v1/conversations/c1/notes?page=1&pageSize=10",
  );
  assertEquals(out, { data: [], meta: { page: 1 } });
});
