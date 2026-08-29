import { assertEquals } from "@std/assert";
import folderGet from "../../actions/folder-get.ts";
import { envelope, mockWrikeCtx, pathOf } from "../_helpers.ts";

Deno.test("folder-get: joins ids into the path", async () => {
  const { ctx, calls } = mockWrikeCtx([{ status: 200, body: envelope([{ id: "F1" }]) }]);
  const out = await folderGet.execute({ folderIds: ["F1", "F2"] }, ctx) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/api/v4/folders/F1,F2");
  assertEquals(out.items, [{ id: "F1" }]);
});
