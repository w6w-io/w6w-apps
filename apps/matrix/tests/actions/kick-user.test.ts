import { assertEquals } from "@std/assert";
import kickUser from "../../actions/kick-user.ts";
import { HOMESERVER, mockMatrixCtx } from "../_helpers.ts";

Deno.test("kick-user: POSTs /rooms/{roomId}/kick with user_id", async () => {
  const { ctx, calls } = mockMatrixCtx([{ body: {} }]);
  const result = await kickUser.execute(
    { roomId: "!x:example.org", userId: "@bob:example.org", reason: "spam" },
    ctx,
  );
  assertEquals(calls[0].url, `${HOMESERVER}/_matrix/client/v3/rooms/!x%3Aexample.org/kick`);
  assertEquals(JSON.parse(calls[0].body!), { user_id: "@bob:example.org", reason: "spam" });
  assertEquals(result, { kicked: true });
});
