import { assertEquals } from "@std/assert";
import userGet from "../../actions/user-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-get: fetches the user by ID", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: 9, name: "A", email: "a@b.com", role: "student", courses: [], tags: [] } },
  ]);
  const out = await userGet.execute({ userId: 9 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/users/9");
  assertEquals((out as { id: number }).id, 9);
});
