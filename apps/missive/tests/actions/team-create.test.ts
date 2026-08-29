import { assertEquals } from "@std/assert";
import action from "../../actions/team-create.ts";
import { assertActionRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("team-create: posts name/organization/active members", async () => {
  const { ctx, calls } = mockCtx([{ body: { teams: [{ id: "t1", name: "Support" }] } }]);
  const out = await action.execute(
    { name: "Support", organization: "org-1", activeMembers: "u1,u2", teamInboxEnabled: true },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/teams");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.teams[0].active_members, ["u1", "u2"]);
  assertEquals(body.teams[0].team_inbox_enabled, true);
  assertEquals(out, { id: "t1", name: "Support" });
});

Deno.test("team-create: requires name and organization", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() => action.execute({ name: "", organization: "org-1" }, ctx));
  await assertActionRejects(() => action.execute({ name: "Support", organization: "" }, ctx));
});
