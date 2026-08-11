import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-folder.ts";

Deno.test("create-folder: POSTs to the parent's children collection", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "new" } }]);
  await action.execute({ itemId: "P1", name: "Quarterly" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/drive/items/P1/children");
  assertEquals(calls[0].method, "POST");
});

Deno.test("create-folder: no parent addressed means the drive root", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({ name: "Quarterly" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/drive/root/children");
});

Deno.test("create-folder: the empty `folder` facet is what declares the type", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({ name: "Quarterly" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "Quarterly", folder: {} });
});

Deno.test("create-folder: conflictBehavior rides in the body, per this endpoint's reference", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({ name: "Quarterly", conflictBehavior: "rename" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Quarterly",
    folder: {},
    "@microsoft.graph.conflictBehavior": "rename",
  });
  // And NOT as a query parameter — unlike copy-item, which documents it there.
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("create-folder: omits the annotation entirely when unset, leaving Graph's `fail`", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({ name: "Quarterly" }, ctx);
  assertEquals("@microsoft.graph.conflictBehavior" in JSON.parse(calls[0].body!), false);
});

Deno.test("create-folder: is not idempotent — `rename` mints a second folder", () => {
  assertEquals(action.idempotent, false);
});
