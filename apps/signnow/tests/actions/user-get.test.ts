import { assertEquals } from "@std/assert";
import userGet from "../../actions/user-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-get: GETs /user", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: "user-1", primary_email: "a@b.com" },
  }]);
  const out = await userGet.execute({}, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/user");
  assertEquals(out.primary_email, "a@b.com");
});
