import { assertEquals } from "@std/assert";
import profileCreate from "../../actions/profile-create.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("profile-create posts profile_name under the account path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { profile_id: 2548713 } }]);
  const out = await profileCreate.execute({ accountId: 5411295, profileName: "Tracking" }, ctx);
  assertEquals(out, { profile_id: 2548713 });
  assertEquals(calls[0].url, `${API_ROOT}/accounts/5411295/profiles`);
  assertEquals(JSON.parse(calls[0].body!), { profile_name: "Tracking" });
});
