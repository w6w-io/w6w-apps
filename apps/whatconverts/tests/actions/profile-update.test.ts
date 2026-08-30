import { assertEquals } from "@std/assert";
import profileUpdate from "../../actions/profile-update.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("profile-update posts the new name to the profile's own path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { profile_id: 2548713 } }]);
  const out = await profileUpdate.execute(
    { accountId: 5411295, profileId: 2548713, profileName: "New Name" },
    ctx,
  );
  assertEquals(out, { profile_id: 2548713 });
  assertEquals(calls[0].url, `${API_ROOT}/accounts/5411295/profiles/2548713`);
  assertEquals(JSON.parse(calls[0].body!), { profile_name: "New Name" });
});
