import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-item.ts";

Deno.test("get-item: addresses an item by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "01ABC" } }]);
  await action.execute({ itemId: "01ABC" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/drive/items/01ABC");
  assertEquals(calls[0].method, "GET");
});

Deno.test("get-item: the bare path form carries no trailing colon", async () => {
  // `GET /me/drive/root:/{item-path}` — a dangling `:` is rejected by Graph.
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ itemPath: "Reports/Q3.pdf" }, ctx);
  assertEquals(
    decodeURIComponent(new URL(calls[0].url).pathname),
    "/v1.0/me/drive/root:/Reports/Q3.pdf",
  );
});

Deno.test("get-item: percent-encodes each path segment but keeps the separators", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ itemPath: "My Reports/Q3 plan.pdf" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/drive/root:/My%20Reports/Q3%20plan.pdf",
  );
});

Deno.test("get-item: with nothing addressed, returns the drive root itself", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "root!1" } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/drive/root");
});

Deno.test("get-item: maps $select and $expand", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ itemId: "x", select: ["id", "name"], expand: ["children"] }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("$select"), "id,name");
  assertEquals(url.searchParams.get("$expand"), "children");
});
