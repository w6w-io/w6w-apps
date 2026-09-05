import { assertEquals } from "@std/assert";
import userLimitsGet from "../../actions/user-limits-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-limits-get: calls GET /v2/user/limits", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ user: { follows: { limit: 200, remaining: 199 } } }) },
  ]);
  const out = await userLimitsGet.execute({}, ctx) as { user: { follows: { limit: number } } };
  assertEquals(pathOf(calls[0].url), "/v2/user/limits");
  assertEquals(out.user.follows.limit, 200);
});
