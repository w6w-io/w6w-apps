import { assertEquals } from "@std/assert";
import folderList from "../../actions/folder-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("folder-list: GETs /user/folder", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "root", name: "Root" } }]);
  const out = await folderList.execute({}, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/user/folder");
  assertEquals(out.name, "Root");
});
