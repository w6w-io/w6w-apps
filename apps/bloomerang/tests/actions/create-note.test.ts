import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-note.ts";

Deno.test("create-note: is a non-idempotent perform", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});

Deno.test("create-note: POSTs /note with AccountId and Note", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { Id: 1 } }]);
  await action.execute({ accountId: 5, note: "Called to say thanks" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v2/note");
  assertEquals(JSON.parse(calls[0].body!), { AccountId: 5, Note: "Called to say thanks" });
});

Deno.test("create-note: includes Date only when supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ accountId: 5, note: "hi", date: "2026-06-01" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.Date, "2026-06-01");
});
