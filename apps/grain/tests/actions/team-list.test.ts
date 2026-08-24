import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/team-list.ts";

Deno.test("team-list: POSTs /v2/teams with an empty body and no params", async () => {
  const { ctx, calls } = mockCtx([{ body: { teams: [{ id: "t1", name: "My Team" }] } }]);
  const result = await action.execute({}, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/_/public-api/v2/teams");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, "{}");
  assertEquals(result, { teams: [{ id: "t1", name: "My Team" }] });
  assertEquals(action.params, []);
});

Deno.test("team-list: defaults to an empty array when Grain omits teams", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const result = await action.execute({}, ctx);
  assertEquals(result, { teams: [] });
});
