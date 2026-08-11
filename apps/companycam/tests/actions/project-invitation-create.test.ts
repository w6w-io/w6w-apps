import { assertEquals } from "@std/assert";
import projectInvitationCreate from "../../actions/project-invitation-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-invitation-create: POSTs with no body and returns the invite URL", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { id: "3", invite_url: "https://app.companycam.com/i/abc", status: "pending" },
  }]);
  const invitation = await projectInvitationCreate.execute({ projectId: "1" }, ctx) as {
    invite_url: string;
  };
  assertEquals(pathOf(calls[0].url), "/v2/projects/1/invitations");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, null, "this endpoint takes no body, not even an empty object");
  assertEquals(invitation.invite_url, "https://app.companycam.com/i/abc");
  assertEquals(projectInvitationCreate.idempotent, false);
});

Deno.test("project-invitation-create: takes no recipient — CompanyCam sends nothing", () => {
  const keys = projectInvitationCreate.params!.map((p) => p.key);
  assertEquals(keys, ["projectId", "actAs"]);
});
