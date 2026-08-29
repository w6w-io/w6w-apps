import { assertEquals } from "@std/assert";
import userAccountGet from "../../actions/user-account-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-account-get: calls GET /user_account", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1", username: "acme" } }]);
  const out = await userAccountGet.execute({}, ctx) as { username: string };

  assertEquals(pathOf(calls[0].url), "/v5/user_account");
  assertEquals(out.username, "acme");
});
