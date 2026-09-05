import { assertEquals } from "@std/assert";
import usageTeamLog from "../../actions/usage-team-log.ts";
import { mockCtx, okBody, pathOf, queryOf } from "../_helpers.ts";

Deno.test("usage-team-log: maps has_more/next_cursor onto { items, nextCursor }", async () => {
  const { ctx, calls } = mockCtx([{
    body: okBody({
      data: [{ user_id: "u1", task_count: 5, credits: 100 }],
      has_more: false,
      next_cursor: undefined,
    }),
  }]);
  const out = await usageTeamLog.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/usage.teamLog");
  assertEquals(out.items[0].user_id, "u1");
  assertEquals(out.nextCursor, undefined);
});

Deno.test("usage-team-log: sends sortBy/isAsc as documented query keys", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody({ data: [] }) }]);
  await usageTeamLog.execute({ sortBy: "credits", isAsc: true }, ctx);
  assertEquals(queryOf(calls[0].url), { sort_by: "credits", is_asc: "true" });
});
