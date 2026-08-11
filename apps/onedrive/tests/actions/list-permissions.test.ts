import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-permissions.ts";

Deno.test("list-permissions: reads the item's permissions collection", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ itemId: "01ABC" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/drive/items/01ABC/permissions");
});

Deno.test("list-permissions: the path form keeps the closing colon before /permissions", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ itemPath: "Reports/Q3.pdf" }, ctx);
  assertEquals(
    decodeURIComponent(new URL(calls[0].url).pathname),
    "/v1.0/me/drive/root:/Reports/Q3.pdf:/permissions",
  );
});

Deno.test("list-permissions: maps $select, the one documented query option", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ itemId: "i", select: ["id", "roles"] }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("$select"), "id,roles");
});

Deno.test("list-permissions: surfaces inheritedFrom, which decides if it can be deleted", async () => {
  const { ctx } = mockCtx([{
    body: {
      value: [
        { id: "own", roles: ["write"] },
        { id: "inherited", roles: ["read"], inheritedFrom: { id: "parent1" } },
      ],
    },
  }]);
  const out = await action.execute({ itemId: "i" }, ctx);
  assertEquals(out.value.filter((p) => p.inheritedFrom).map((p) => p.id), ["inherited"]);
});

Deno.test("list-permissions: follows every page when `all` is set", async () => {
  const next = "https://graph.microsoft.com/v1.0/me/drive/items/i/permissions?$skiptoken=1";
  const { ctx, calls } = mockCtx([
    { body: { value: [{ id: "a" }], "@odata.nextLink": next } },
    { body: { value: [{ id: "b" }] } },
  ]);
  const out = await action.execute({ itemId: "i", all: true }, ctx);
  assertEquals(calls.length, 2);
  assertEquals(out.value.length, 2);
});

Deno.test("list-permissions: requires an item", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => action.execute({}, ctx) as Promise<unknown>,
    Error,
    "must be addressed",
  );
});
