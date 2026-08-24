import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-note.ts";

Deno.test("create-note: is a non-idempotent perform requiring content", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  const p = (action.params ?? []).find((p) => p.key === "content")!;
  assertEquals(p.required, true);
});

Deno.test("create-note: POSTs /notes with the mapped body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  const linkedTo = [{ id: 1, type: "Contact" }];
  await action.execute({
    content: "Spoke with Kevin Anderson on the phone...",
    linkedTo,
    visibleTo: "Everyone",
    tags: ["Clients"],
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/notes");
  assertEquals(JSON.parse(calls[0].body!), {
    content: "Spoke with Kevin Anderson on the phone...",
    linked_to: linkedTo,
    visible_to: "Everyone",
    tags: ["Clients"],
  });
});

Deno.test("create-note: omits fields the caller did not supply", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ content: "Just a note" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { content: "Just a note" });
});
