import { assertEquals } from "@std/assert";
import { mockKustomerCtx } from "../_helpers.ts";
import action from "../../actions/conversation-create.ts";

Deno.test("conversation-create: POSTs /conversations with customer as the only required field", async () => {
  const { ctx, calls } = mockKustomerCtx([{ body: { data: { id: "1" } } }]);
  const out = await action.execute({ customer: "cust-1" }, ctx);
  assertEquals(calls[0].url, "https://acme.api.kustomerapp.com/v1/conversations");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { customer: "cust-1" });
  assertEquals(out, { id: "1" });
});

Deno.test("conversation-create: splits assignedUsers/assignedTeams on commas", async () => {
  const { ctx, calls } = mockKustomerCtx([{ body: { data: {} } }]);
  await action.execute(
    { customer: "cust-1", assignedUsers: "u1, u2", assignedTeams: "t1" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).assignedUsers, ["u1", "u2"]);
  assertEquals(JSON.parse(calls[0].body!).assignedTeams, ["t1"]);
});
