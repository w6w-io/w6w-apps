import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/entry-create.ts";

Deno.test("entry-create: POSTs to /forms/{formId}/entries with Entry.Action fixed to Submit", async () => {
  const { ctx, calls } = mockCtx([{ body: { Id: "e1", Email: "jane@example.com" } }]);
  const result = await action.execute({
    formId: "42",
    role: "Internal",
    data: { Email: "jane@example.com" },
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/forms/42/entries");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    Email: "jane@example.com",
    Entry: { Action: "Submit", Role: "Internal" },
  });
  assertEquals(result, { entry: { Id: "e1", Email: "jane@example.com" } });
});

Deno.test("entry-create: defaults Role to Public when not given", async () => {
  const { ctx, calls } = mockCtx([{ body: { Id: "e2" } }]);
  await action.execute({ formId: "1", data: { Name: "x" } }, ctx);
  assertEquals(JSON.parse(calls[0].body!).Entry, { Action: "Submit", Role: "Public" });
});

Deno.test("entry-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
