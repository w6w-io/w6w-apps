import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/move-item.ts";

Deno.test("move-item: PATCHes the item with a new parentReference", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "01ABC" } }]);
  await action.execute({ itemId: "01ABC", targetFolderId: "DEST" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/drive/items/01ABC");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { parentReference: { id: "DEST" } });
});

Deno.test("move-item: a cross-drive move carries the destination driveId too", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ itemId: "i", targetFolderId: "D", targetDriveId: "b!other" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    parentReference: { id: "D", driveId: "b!other" },
  });
});

Deno.test("move-item: renames on the way when a name is supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ itemId: "i", targetFolderId: "D", name: "moved.txt" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    parentReference: { id: "D" },
    name: "moved.txt",
  });
});

Deno.test("move-item: sends only what changed — no name key when none was given", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ itemId: "i", targetFolderId: "D" }, ctx);
  assertEquals("name" in JSON.parse(calls[0].body!), false);
});

Deno.test("move-item: passes if-match through as the concurrency guard", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ itemId: "i", targetFolderId: "D", ifMatch: '"etag1"' }, ctx);
  assertEquals(calls[0].headers["if-match"], '"etag1"');
});

Deno.test("move-item: the destination hint records that `root` is not accepted", () => {
  const hint = (action.params ?? []).find((p) => p.key === "targetFolderId")?.hint ?? "";
  assert(hint.includes("root"), hint);
});

Deno.test("move-item: is idempotent — it describes an end state", () => {
  assertEquals(action.idempotent, true);
});
