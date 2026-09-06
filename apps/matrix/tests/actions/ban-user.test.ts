import { assertEquals } from "@std/assert";
import banUser from "../../actions/ban-user.ts";
import { HOMESERVER, mockMatrixCtx } from "../_helpers.ts";

Deno.test("ban-user: POSTs /rooms/{roomId}/ban with user_id", async () => {
  const { ctx, calls } = mockMatrixCtx([{ body: {} }]);
  const result = await banUser.execute(
    { roomId: "!x:example.org", userId: "@bob:example.org", reason: "abuse" },
    ctx,
  );
  assertEquals(calls[0].url, `${HOMESERVER}/_matrix/client/v3/rooms/!x%3Aexample.org/ban`);
  assertEquals(JSON.parse(calls[0].body!), { user_id: "@bob:example.org", reason: "abuse" });
  assertEquals(result, { banned: true });
});
