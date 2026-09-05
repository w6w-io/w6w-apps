import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-alias-new.ts";

Deno.test("user-alias-new: posts user_aliases to /users/alias/new", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }], { display: { instance: "iad-01" } });
  await action.execute!({
    userAliases: [{ external_id: "e1", alias_name: "n1", alias_label: "l1" }],
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/users/alias/new");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.user_aliases, [{ external_id: "e1", alias_name: "n1", alias_label: "l1" }]);
});
