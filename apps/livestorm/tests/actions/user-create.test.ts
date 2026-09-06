import { assertEquals } from "@std/assert";
import userCreate from "../../actions/user-create.ts";
import { mockCtx, pathOf, single } from "../_helpers.ts";

Deno.test("user-create: POSTs a users body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: single("users", "u1", { email: "a@b.com" }),
  }]);
  const result = await userCreate.execute({ email: "a@b.com", role: "moderator" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/users");
  assertEquals(JSON.parse(calls[0].body!), {
    data: { type: "users", attributes: { email: "a@b.com", role: "moderator" } },
  });
  assertEquals(result, { id: "u1", type: "users", attributes: { email: "a@b.com" } });
});
