import { assertEquals } from "@std/assert";
import userCheckAccess from "../../actions/user-check-access.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-check-access: GETs /users/{id}/access/{resource_id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { has_access: true, access_level: "customer" } }]);
  const out = await userCheckAccess.execute(
    { userId: "user_1", resourceId: "prod_1" },
    ctx,
  ) as { has_access: boolean };

  assertEquals(pathOf(calls[0].url), "/users/user_1/access/prod_1");
  assertEquals(out.has_access, true);
});
