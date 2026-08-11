import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/rename-item.ts";

Deno.test("rename-item: PATCHes the item with only the new name", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "01ABC", name: "new.pdf" } }]);
  await action.execute({ itemId: "01ABC", name: "new.pdf" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/drive/items/01ABC");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { name: "new.pdf" });
});

Deno.test("rename-item: renames the item addressed by path", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ itemPath: "Reports/old.pdf", name: "new.pdf" }, ctx);
  assertEquals(
    decodeURIComponent(new URL(calls[0].url).pathname),
    "/v1.0/me/drive/root:/Reports/old.pdf",
  );
});

Deno.test("rename-item: sends a description only when one was supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await action.execute({ itemId: "i", name: "n", description: "why" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "n", description: "why" });
  await action.execute({ itemId: "i", name: "n" }, ctx);
  assertEquals("description" in JSON.parse(calls[1].body!), false);
});

Deno.test("rename-item: passes if-match through", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ itemId: "i", name: "n", ifMatch: '"e"' }, ctx);
  assertEquals(calls[0].headers["if-match"], '"e"');
});

Deno.test("rename-item: refuses to rename the whole drive root by default", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => action.execute({ name: "x" }, ctx) as Promise<unknown>,
    Error,
    "must be addressed",
  );
});

Deno.test("rename-item: is idempotent — it sets a property to a fixed value", () => {
  assertEquals(action.idempotent, true);
});
