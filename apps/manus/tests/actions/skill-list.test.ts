import { assertEquals } from "@std/assert";
import skillList from "../../actions/skill-list.ts";
import { mockCtx, okBody, pathOf, queryOf } from "../_helpers.ts";

Deno.test("skill-list: gets /v2/skill.list, omitting project_id when not set", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody({ data: [] }) }]);
  await skillList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/skill.list");
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("skill-list: sends project_id when set", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody({ data: [] }) }]);
  await skillList.execute({ projectId: "proj-1" }, ctx);
  assertEquals(queryOf(calls[0].url), { project_id: "proj-1" });
});

Deno.test("skill-list: returns the array unwrapped", async () => {
  const { ctx } = mockCtx([{ body: okBody({ data: [{ id: "s1", name: "Search" }] }) }]);
  const out = await skillList.execute({}, ctx);
  assertEquals(out, [{ id: "s1", name: "Search" }]);
});
