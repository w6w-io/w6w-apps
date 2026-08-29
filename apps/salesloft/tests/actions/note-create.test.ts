import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/note-create.ts";

Deno.test("note-create: POSTs /notes with a JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  const result = await action.execute!(
    { content: "Called, left voicemail", associatedWithType: "person", associatedWithId: 8 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/notes");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.content, "Called, left voicemail");
  assertEquals(body.associated_with_type, "person");
  assertEquals(body.associated_with_id, 8);
  assertEquals(result, { data: { id: 1 } });
});
