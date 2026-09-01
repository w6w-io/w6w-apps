import { assertEquals } from "@std/assert";
import sessionSaveProfile from "../../actions/session-save-profile.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("session-save-profile: PUTs to the session/profileName path", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await sessionSaveProfile.execute({ sessionId: "s1", profileName: "my profile" }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(
    pathOf(calls[0].url),
    "/api/v1/sessions/s1/save-profile-on-termination/my%20profile",
  );
  assertEquals(out, { success: true, sessionId: "s1", profileName: "my profile" });
});

Deno.test("session-save-profile: is declared idempotent — PUT to the same target twice is safe", () => {
  assertEquals(sessionSaveProfile.idempotent, true);
});
