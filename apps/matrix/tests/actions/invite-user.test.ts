import { assertEquals } from "@std/assert";
import inviteUser from "../../actions/invite-user.ts";
import { HOMESERVER, mockMatrixCtx } from "../_helpers.ts";

Deno.test("invite-user: POSTs /rooms/{roomId}/invite with user_id", async () => {
  const { ctx, calls } = mockMatrixCtx([{ body: {} }]);
  const result = await inviteUser.execute(
    { roomId: "!x:example.org", userId: "@bob:example.org", reason: "join us" },
    ctx,
  );
  assertEquals(calls[0].url, `${HOMESERVER}/_matrix/client/v3/rooms/!x%3Aexample.org/invite`);
  assertEquals(JSON.parse(calls[0].body!), { user_id: "@bob:example.org", reason: "join us" });
  assertEquals(result, { invited: true });
});

Deno.test("invite-user: is idempotent — an already-invited user is also a 200", () => {
  assertEquals(inviteUser.idempotent, true);
});
