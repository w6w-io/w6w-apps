import { assertEquals } from "@std/assert";
import profileDelete from "../../actions/profile-delete.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("profile-delete sends DELETE to the nested path and returns the deleted id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { profile_id: 2548713 } }]);
  const out = await profileDelete.execute({ accountId: 5411295, profileId: 2548713 }, ctx);
  assertEquals(out, { profile_id: 2548713 });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, `${API_ROOT}/accounts/5411295/profiles/2548713`);
});

Deno.test("profile-delete is declared not idempotent", () => {
  assertEquals(profileDelete.idempotent, false);
});
