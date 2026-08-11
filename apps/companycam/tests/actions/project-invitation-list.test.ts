import { assertEquals } from "@std/assert";
import projectInvitationList from "../../actions/project-invitation-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-invitation-list: lists invitations with their invite URLs", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ id: "1", invite_url: "https://app.companycam.com/i/abc", status: "pending" }],
  }]);
  const page = await projectInvitationList.execute({ projectId: "1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/projects/1/invitations");
  // The invite URL is the deliverable, so it is returned — the action's docs
  // say plainly that it is a capability.
  assertEquals((page.items[0] as { invite_url: string }).invite_url.length > 0, true);
});
