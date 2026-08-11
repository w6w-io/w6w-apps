import { assert, assertEquals } from "@std/assert";
import { mockCtx, sent } from "../_helpers.ts";
import action from "../../actions/user-list.ts";

const OK = { data: { users: [{ user_id: "u1" }] } };

Deno.test("user-list: takes no arguments", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({}, ctx);
  const { query, variables } = sent(calls[0]);
  assert(query.includes("query Users {"));
  assert(query.includes("users {"));
  assertEquals(variables, {});
});

Deno.test("user-list: user groups are opt-in", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }, { body: OK }]);
  await action.execute({}, ctx);
  assert(!sent(calls[0]).query.includes("user_groups"));
  await action.execute({ includeGroups: true }, ctx);
  assert(sent(calls[1]).query.includes("user_groups"));
});
