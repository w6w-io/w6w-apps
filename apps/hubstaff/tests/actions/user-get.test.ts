import { assertEquals } from "@std/assert";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/user-get.ts";

Deno.test("user-get: GETs /v2/users/{user_id}", async () => {
  const body = envelope("user", { id: 7, email: "a@example.com" });
  const { ctx, calls } = mockCtx([{ status: 200, body }]);
  const result = await action.execute!({ user_id: 7 }, ctx) as typeof body;

  assertEquals(pathOf(calls[0].url), "/v2/users/7");
  assertEquals(result.user.email, "a@example.com");
});

Deno.test("user-get: user_id is required", () => {
  assertEquals(action.params!.find((p) => p.key === "user_id")?.required, true);
});
