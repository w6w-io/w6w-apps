import { assertEquals } from "@std/assert";
import action from "../../actions/conversation-list.ts";
import { assertActionRejects, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("conversation-list: a plain mailbox flag is sent as ?flag=true", async () => {
  const { ctx, calls } = mockCtx([{ body: { conversations: [{ id: "c1" }] } }]);
  const out = await action.execute({ mailbox: "inbox", limit: 25 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/conversations");
  assertEquals(queryOf(calls[0].url), { inbox: "true", limit: "25" });
  assertEquals(out, [{ id: "c1" }]);
});

Deno.test("conversation-list: shared_label mailbox passes the label id as the value", async () => {
  const { ctx, calls } = mockCtx([{ body: { conversations: [] } }]);
  await action.execute({ mailbox: "shared_label", mailboxId: "label-1" }, ctx);
  assertEquals(queryOf(calls[0].url).shared_label, "label-1");
});

Deno.test("conversation-list: requires mailbox", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() => action.execute({ mailbox: "" }, ctx));
});

Deno.test("conversation-list: requires mailboxId for team/label mailboxes", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() => action.execute({ mailbox: "team_inbox" }, ctx));
});

Deno.test("conversation-list: email/domain/contactOrganization are mutually exclusive", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() =>
    action.execute({ mailbox: "inbox", email: "a@b.com", domain: "b.com" }, ctx)
  );
});
