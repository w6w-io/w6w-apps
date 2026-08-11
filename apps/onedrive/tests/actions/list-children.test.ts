import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-children.ts";

Deno.test("list-children: no item addressed means the drive root", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/drive/root/children");
});

Deno.test("list-children: addresses a folder by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ itemId: "01ABC" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/drive/items/01ABC/children");
});

Deno.test("list-children: addresses a folder by path, with the structural colons", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ itemPath: "Reports/2026" }, ctx);
  assertEquals(
    decodeURIComponent(new URL(calls[0].url).pathname),
    "/v1.0/me/drive/root:/Reports/2026:/children",
  );
});

Deno.test("list-children: honours the drive id", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ driveId: "d9", itemId: "f1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/drives/d9/items/f1/children");
});

Deno.test("list-children: maps $select, $expand, $orderby and $top", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute(
    { select: ["id", "name"], expand: ["thumbnails"], orderby: "name asc", top: 10 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("$select"), "id,name");
  assertEquals(url.searchParams.get("$expand"), "thumbnails");
  assertEquals(url.searchParams.get("$orderby"), "name asc");
  assertEquals(url.searchParams.get("$top"), "10");
});

Deno.test("list-children: offers no $filter — this collection does not document one", () => {
  const keys = (action.params ?? []).map((p) => p.key);
  assertEquals(keys.includes("filter"), false);
});

Deno.test("list-children: returns folders and files in one collection", async () => {
  const { ctx } = mockCtx([{
    body: {
      value: [
        { id: "1", name: "Reports", folder: { childCount: 3 } },
        { id: "2", name: "a.txt", file: { mimeType: "text/plain" } },
      ],
    },
  }]);
  const out = await action.execute({}, ctx);
  assertEquals(out.value.length, 2);
  assertEquals(Boolean(out.value[0].folder), true);
  assertEquals(Boolean(out.value[1].file), true);
});

Deno.test("list-children: replays a nextLink verbatim", async () => {
  const link = "https://graph.microsoft.com/v1.0/me/drive/root/children?$skiptoken=abc";
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ nextLink: link, top: 999, itemId: "ignored" }, ctx);
  assertEquals(calls[0].url, link);
});

Deno.test("list-children: follows every page when `all` is set", async () => {
  const next = "https://graph.microsoft.com/v1.0/me/drive/root/children?$skiptoken=1";
  const { ctx, calls } = mockCtx([
    { body: { value: [{ id: "a" }], "@odata.nextLink": next } },
    { body: { value: [{ id: "b" }] } },
  ]);
  const out = await action.execute({ all: true }, ctx);
  assertEquals(calls.length, 2);
  assertEquals(out.pages, 2);
});

Deno.test("list-children: refuses both addressing forms at once", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => action.execute({ itemId: "a", itemPath: "b" }, ctx) as Promise<unknown>,
    Error,
    "not both",
  );
});
