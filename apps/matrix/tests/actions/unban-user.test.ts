import { assertEquals } from "@std/assert";
import unbanUser from "../../actions/unban-user.ts";
import { HOMESERVER, mockMatrixCtx } from "../_helpers.ts";

Deno.test("unban-user: POSTs /rooms/{roomId}/unban with user_id", async () => {
  const { ctx, calls } = mockMatrixCtx([{ body: {} }]);
  const result = await unbanUser.execute(
    { roomId: "!x:example.org", userId: "@bob:example.org" },
    ctx,
  );
  assertEquals(calls[0].url, `${HOMESERVER}/_matrix/client/v3/rooms/!x%3Aexample.org/unban`);
  assertEquals(JSON.parse(calls[0].body!), { user_id: "@bob:example.org" });
  assertEquals(result, { unbanned: true });
});
