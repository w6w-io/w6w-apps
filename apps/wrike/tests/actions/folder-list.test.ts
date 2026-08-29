import { assertEquals } from "@std/assert";
import folderList from "../../actions/folder-list.ts";
import { envelope, mockWrikeCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("folder-list: surfaces the response's own `kind` (folderTree vs folders)", async () => {
  const { ctx, calls } = mockWrikeCtx([
    { status: 200, body: envelope([{ id: "F1" }], "folders") },
  ]);
  const out = await folderList.execute({ project: true }, ctx) as {
    kind: string;
    items: unknown[];
  };
  assertEquals(pathOf(calls[0].url), "/api/v4/folders");
  assertEquals(queryOf(calls[0].url), { project: "true" });
  assertEquals(out.kind, "folders");
  assertEquals(out.items, [{ id: "F1" }]);
});

Deno.test("folder-list: no filters at all still runs — Folder Tree Mode per Wrike's own docs", async () => {
  const { ctx, calls } = mockWrikeCtx([
    { status: 200, body: envelope([{ id: "root" }], "folderTree") },
  ]);
  const out = await folderList.execute({}, ctx) as { kind: string };
  assertEquals(calls[0].method, "GET");
  assertEquals(out.kind, "folderTree");
});
