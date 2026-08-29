import { assertEquals } from "@std/assert";
import profileGet from "../../actions/profile-get.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("profile-get fetches the nested account/profile path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { profile_id: 2548713 } }]);
  const out = await profileGet.execute({ accountId: 5411295, profileId: 2548713 }, ctx);
  assertEquals(out, { profile_id: 2548713 });
  assertEquals(calls[0].url, `${API_ROOT}/accounts/5411295/profiles/2548713`);
});
