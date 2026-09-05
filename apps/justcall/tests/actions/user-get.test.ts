import { assertEquals } from "@std/assert";
import userGet from "../../actions/user-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-get: hits GET /v2.1/users/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 1, name: "John Doe" }) }]);
  const out = await userGet.execute({ id: 1 }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v2.1/users/1");
  assertEquals(out.name, "John Doe");
});
