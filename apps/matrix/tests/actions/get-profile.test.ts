import { assertEquals } from "@std/assert";
import getProfile from "../../actions/get-profile.ts";
import { HOMESERVER, mockMatrixCtx } from "../_helpers.ts";

Deno.test("get-profile: GETs /profile/{userId}", async () => {
  const { ctx, calls } = mockMatrixCtx([
    { body: { displayname: "Alice", avatar_url: "mxc://example.org/abc" } },
  ]);
  const result = await getProfile.execute({ userId: "@alice:example.org" }, ctx);
  assertEquals(calls[0].url, `${HOMESERVER}/_matrix/client/v3/profile/%40alice%3Aexample.org`);
  assertEquals(result, { displayName: "Alice", avatarUrl: "mxc://example.org/abc" });
});
