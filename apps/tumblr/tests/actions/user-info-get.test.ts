import { assertEquals } from "@std/assert";
import userInfoGet from "../../actions/user-info-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-info-get: calls GET /v2/user/info", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ user: { name: "derekg" } }) }]);
  const out = await userInfoGet.execute({}, ctx) as { user: { name: string } };
  assertEquals(pathOf(calls[0].url), "/v2/user/info");
  assertEquals(out.user.name, "derekg");
});
