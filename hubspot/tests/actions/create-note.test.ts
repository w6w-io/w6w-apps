import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-note.ts";

Deno.test("create-note: POSTs /crm/v3/objects/notes with body + timestamp", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "n1" } }]);
  await action.execute!({ hs_note_body: "Follow up next week", hs_timestamp: "2026-01-01T00:00:00Z" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/crm/v3/objects/notes");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.properties.hs_note_body, "Follow up next week");
  assertEquals(body.properties.hs_timestamp, "2026-01-01T00:00:00Z");
});
