import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/usergroup-get-users.ts";

Deno.test("usergroup-get-users: filters usergroups.list?include_users=true down to the group's users", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        ok: true,
        usergroups: [
          { id: "S1", users: ["U1", "U2"] },
          { id: "S2", users: ["U9"] },
        ],
      },
    },
  ]);
  const result = await action.execute!({ userGroupId: "S1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/usergroups.list");
  assertEquals(url.searchParams.get("include_users"), "true");
  assertEquals(url.searchParams.get("usergroup"), "S1");
  assertEquals(result, ["U1", "U2"]);
});

Deno.test("usergroup-get-users: throws when the group id is not found", async () => {
  const { ctx } = mockCtx([{ body: { ok: true, usergroups: [] } }]);
  await assertRejects(
    async () => await action.execute!({ userGroupId: "Sxx" }, ctx),
    Error,
    "Sxx",
  );
});
