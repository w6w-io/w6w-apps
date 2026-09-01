import { assertEquals } from "@std/assert";
import userGetSelf from "../../actions/user-get-self.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-get-self: calls GET /v1/users/get-self and returns the body verbatim", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "usr-1", name: "Ada", email: "ada@example.com" },
  }]);
  const out = await userGetSelf.execute({}, ctx) as { email: string };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/users/get-self");
  assertEquals(out.email, "ada@example.com");
});
