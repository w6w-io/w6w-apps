import { assertEquals } from "@std/assert";
import userGet from "../../actions/user-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-get: fetches /v2/me and returns the body unchanged", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, name: "Ada", email: "ada@example.com" } }]);
  const out = await userGet.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/me");
  assertEquals(out, { id: 1, name: "Ada", email: "ada@example.com" });
});

Deno.test("user-get: takes no parameters", () => {
  assertEquals(userGet.params?.length, 0);
});
