import { assertEquals } from "@std/assert";
import setAvatarUrl from "../../actions/set-avatar-url.ts";
import { HOMESERVER, mockMatrixCtx } from "../_helpers.ts";

Deno.test("set-avatar-url: PUTs /profile/{connection's own userId}/avatar_url", async () => {
  const { ctx, calls } = mockMatrixCtx([{ body: {} }]);
  const result = await setAvatarUrl.execute({ avatarUrl: "mxc://example.org/abc" }, ctx);
  assertEquals(
    calls[0].url,
    `${HOMESERVER}/_matrix/client/v3/profile/%40alice%3Aexample.org/avatar_url`,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { avatar_url: "mxc://example.org/abc" });
  assertEquals(result, { updated: true });
});
