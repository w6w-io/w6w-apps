import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/entry-update.ts";

Deno.test("entry-update: PATCHes /forms/{formId}/entries/{entryId} with Entry.Action Update", async () => {
  const { ctx, calls } = mockCtx([{ body: { Id: "e1", Email: "new@example.com" } }]);
  const result = await action.execute({
    formId: "42",
    entryId: "e1",
    role: "Reviewer",
    data: { Email: "new@example.com" },
  }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/api/forms/42/entries/e1");
  assertEquals(JSON.parse(calls[0].body!), {
    Email: "new@example.com",
    Entry: { Action: "Update", Role: "Reviewer" },
  });
  assertEquals(result, { entry: { Id: "e1", Email: "new@example.com" } });
});

Deno.test("entry-update: defaults Role to Internal when not given", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ formId: "1", entryId: "2", data: {} }, ctx);
  assertEquals(JSON.parse(calls[0].body!).Entry, { Action: "Update", Role: "Internal" });
});

Deno.test("entry-update: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
