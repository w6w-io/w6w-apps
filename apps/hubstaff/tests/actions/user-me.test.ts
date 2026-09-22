import { assertEquals } from "@std/assert";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/user-me.ts";

Deno.test("user-me: GETs /v2/users/me with no params and no query", async () => {
  const body = envelope("user", { id: 651956, name: "Alex Yarotsky" });
  const { ctx, calls } = mockCtx([{ status: 200, body }]);
  const result = await action.execute!({}, ctx) as typeof body;

  assertEquals(pathOf(calls[0].url), "/v2/users/me");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(result.user.id, 651956);
  assertEquals(action.params, []);
});
