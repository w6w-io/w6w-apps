import { assertEquals } from "@std/assert";
import folderCreate from "../../actions/folder-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("folder-create: POSTs name and parent_id to /user/folder", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "folder-1" } }]);
  const out = await folderCreate.execute({ name: "Contracts", parentId: "root" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0]), "/user/folder");
  assertEquals(bodyOf(calls[0]), { name: "Contracts", parent_id: "root" });
  assertEquals(out.id, "folder-1");
});
