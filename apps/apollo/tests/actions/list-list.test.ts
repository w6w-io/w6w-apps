import { assertEquals } from "@std/assert";
import listList from "../../actions/list-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-list: GETs /labels, which answers a BARE ARRAY (no envelope)", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "l1", modality: "contacts" }] }]);
  const out = await listList.execute({}, ctx) as { lists: unknown[] };
  assertEquals(pathOf(calls[0].url), "/api/v1/labels");
  assertEquals(out.lists.length, 1);
});

Deno.test("list-list: a non-array response (a future envelope change) degrades to an empty list", async () => {
  const { ctx } = mockCtx([{ body: { lists: [] } }]);
  const out = await listList.execute({}, ctx) as { lists: unknown[] };
  assertEquals(out.lists, []);
});
