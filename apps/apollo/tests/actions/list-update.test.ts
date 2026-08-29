import { assertEquals } from "@std/assert";
import listUpdate from "../../actions/list-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-update: PATCHes /labels/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { label: { id: "l1", name: "Renamed" } } }]);
  const out = await listUpdate.execute({ id: "l1", name: "Renamed" }, ctx) as {
    list: { name: string };
  };
  assertEquals(pathOf(calls[0].url), "/api/v1/labels/l1");
  assertEquals(out.list.name, "Renamed");
});

Deno.test("list-update: idempotent", () => {
  assertEquals(listUpdate.idempotent, true);
});
