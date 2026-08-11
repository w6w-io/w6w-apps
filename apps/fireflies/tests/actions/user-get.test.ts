import { assert, assertEquals } from "@std/assert";
import { mockCtx, sent } from "../_helpers.ts";
import action from "../../actions/user-get.ts";

const OK = { data: { user: { user_id: "u1", name: "Ada" } } };

Deno.test("user-get: with no id, it is a whoami — the argument stays nullable", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({}, ctx);
  const { query, variables } = sent(calls[0]);
  // `String!` here would make the whoami form a client-side validation error.
  assert(query.includes("query User($userId: String)"));
  assert(query.includes("user(id: $userId)"));
  assertEquals(variables, {});
  assertEquals(action.params!.find((p) => p.key === "userId")!.required, undefined);
});

Deno.test("user-get: passes an id when given", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ userId: "u2" }, ctx);
  assertEquals(sent(calls[0]).variables, { userId: "u2" });
});

Deno.test("user-get: user groups are opt-in", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }, { body: OK }]);
  await action.execute({}, ctx);
  assert(!sent(calls[0]).query.includes("user_groups"));
  await action.execute({ includeGroups: true }, ctx);
  assert(sent(calls[1]).query.includes("user_groups"));
});
