import { assert, assertEquals } from "@std/assert";
import { mockCtx, sent } from "../_helpers.ts";
import action from "../../actions/channel-list.ts";

Deno.test("channel-list: sends the documented no-argument query", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { channels: [{ id: "c1" }] } } }]);
  await action.execute({}, ctx);
  const { query, variables } = sent(calls[0]);
  assert(query.includes("channels {"));
  assert(query.includes("members { user_id email name }"));
  assertEquals(variables, {});
});

Deno.test("channel-list: declares no params", () => {
  assertEquals(action.params, []);
});
