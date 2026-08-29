import { assertEquals } from "@std/assert";
import { mockKustomerCtx } from "../_helpers.ts";
import action from "../../actions/note-create.ts";

Deno.test("note-create: POSTs /conversations/{id}/notes with the note body", async () => {
  const { ctx, calls } = mockKustomerCtx([{ body: { data: { id: "n1" } } }]);
  const out = await action.execute({ conversationId: "c1", body: "Called back, no answer." }, ctx);
  assertEquals(calls[0].url, "https://acme.api.kustomerapp.com/v1/conversations/c1/notes");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { body: "Called back, no answer." });
  assertEquals(out, { id: "n1" });
});
