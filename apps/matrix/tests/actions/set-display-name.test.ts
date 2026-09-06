import { assertEquals } from "@std/assert";
import setDisplayName from "../../actions/set-display-name.ts";
import { HOMESERVER, mockMatrixCtx } from "../_helpers.ts";

Deno.test("set-display-name: PUTs /profile/{connection's own userId}/displayname", async () => {
  const { ctx, calls } = mockMatrixCtx([{ body: {} }]);
  const result = await setDisplayName.execute({ displayName: "Alice Wonderland" }, ctx);
  assertEquals(
    calls[0].url,
    `${HOMESERVER}/_matrix/client/v3/profile/%40alice%3Aexample.org/displayname`,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { displayname: "Alice Wonderland" });
  assertEquals(result, { updated: true });
});
