import { assertEquals } from "@std/assert";
import { mockKustomerCtx } from "../_helpers.ts";
import action from "../../actions/user-get.ts";

Deno.test("user-get: GETs /users/{id} and unwraps data", async () => {
  const { ctx, calls } = mockKustomerCtx([{ body: { data: { id: "u1" } } }]);
  const out = await action.execute({ id: "u1" }, ctx);
  assertEquals(calls[0].url, "https://acme.api.kustomerapp.com/v1/users/u1");
  assertEquals(out, { id: "u1" });
});
