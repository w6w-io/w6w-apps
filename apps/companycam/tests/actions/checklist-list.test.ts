import { assertEquals } from "@std/assert";
import checklistList from "../../actions/checklist-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("checklist-list: sends the completed filter only when set", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }, { body: [] }]);
  await checklistList.execute({ completed: false, perPage: 50 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/checklists");
  assertEquals(queryOf(calls[0].url), { completed: "false", per_page: "50" });

  await checklistList.execute({}, ctx);
  assertEquals(queryOf(calls[1].url), {});
});
