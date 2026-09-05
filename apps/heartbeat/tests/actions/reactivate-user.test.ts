import { assertEquals } from "@std/assert";
import reactivateUser from "../../actions/reactivate-user.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("reactivate-user: POST /users/reactivate with the email in the body", async () => {
  const { ctx, calls } = mockCtx([{ body: undefined }]);
  await reactivateUser.execute({ email: "a@b.com" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v0/users/reactivate");
  assertEquals(JSON.parse(calls[0].body!), { email: "a@b.com" });
});

Deno.test("reactivate-user: is idempotent — a state transition, safe to redo", () => {
  assertEquals(reactivateUser.idempotent, true);
});
