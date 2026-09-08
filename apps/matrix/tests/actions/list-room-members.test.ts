import { assertEquals } from "@std/assert";
import listRoomMembers from "../../actions/list-room-members.ts";
import { HOMESERVER, mockMatrixCtx } from "../_helpers.ts";

Deno.test("list-room-members: GETs /rooms/{roomId}/joined_members and flattens the map", async () => {
  const { ctx, calls } = mockMatrixCtx([
    {
      body: {
        joined: {
          "@bar:example.org": { display_name: "Bar", avatar_url: "mxc://example.org/abc" },
          "@baz:example.org": {},
        },
      },
    },
  ]);
  const result = await listRoomMembers.execute({ roomId: "!x:example.org" }, ctx);
  assertEquals(
    calls[0].url,
    `${HOMESERVER}/_matrix/client/v3/rooms/!x%3Aexample.org/joined_members`,
  );
  assertEquals(result.members, [
    { userId: "@bar:example.org", displayName: "Bar", avatarUrl: "mxc://example.org/abc" },
    { userId: "@baz:example.org", displayName: undefined, avatarUrl: undefined },
  ]);
});
