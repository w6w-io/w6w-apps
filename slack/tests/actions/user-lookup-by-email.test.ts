import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-lookup-by-email.ts";

Deno.test("user-lookup-by-email: GETs /users.lookupByEmail with email", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, user: { id: "U1" } } }]);
  const result = await action.execute!({ email: "cj@example.com" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/users.lookupByEmail");
  assertEquals(url.searchParams.get("email"), "cj@example.com");
  assertEquals(result, { id: "U1" });
});
