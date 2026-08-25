import { assertEquals } from "@std/assert";
import { mockDeskCtx } from "../_helpers.ts";
import action from "../../actions/ticket-list.ts";

Deno.test("ticket-list: GETs /tickets with orgId header and filters", async () => {
  const { ctx, calls } = mockDeskCtx([{ body: { data: [{ id: "1" }] } }]);
  const out = await action.execute({ departmentIds: "123", channel: "Email" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/tickets");
  assertEquals(calls[0].headers.orgid, "2389290");
  assertEquals(url.searchParams.get("departmentIds"), "123");
  assertEquals(url.searchParams.get("channel"), "Email");
  assertEquals(out.data, [{ id: "1" }]);
});

Deno.test("ticket-list: an explicit orgId overrides the connection default", async () => {
  const { ctx, calls } = mockDeskCtx([{ body: { data: [] } }]);
  await action.execute({ orgId: "999" }, ctx);
  assertEquals(calls[0].headers.orgid, "999");
});
