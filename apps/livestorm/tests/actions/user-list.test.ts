import { assertEquals } from "@std/assert";
import userList from "../../actions/user-list.ts";
import { list, mockCtx, pathOf, queryOf, resource } from "../_helpers.ts";

Deno.test("user-list: GETs /users with filters", async () => {
  const { ctx, calls } = mockCtx([{ body: list([resource("users", "u1")]) }]);
  await userList.execute({ role: "host", pendingInvite: false }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/users");
  assertEquals(queryOf(calls[0].url), {
    "filter[role]": "host",
    "filter[pending_invite]": "false",
  });
});
