import { assertEquals } from "@std/assert";
import { deskCreate, deskGet, deskList, deskMoveToTrash, deskUpdate } from "../../lib/desk.ts";
import { mockDeskCtx } from "../_helpers.ts";

Deno.test("deskList: wraps the data array and sends the orgId header", async () => {
  const { ctx, calls } = mockDeskCtx([{ body: { data: [{ id: "1" }] } }]);
  const out = await deskList(ctx, "/tickets", {}, { channel: "Email" });
  assertEquals(new URL(calls[0].url).searchParams.get("channel"), "Email");
  assertEquals(calls[0].headers.orgid, "2389290");
  assertEquals(out, { data: [{ id: "1" }] });
});

Deno.test("deskList: defaults to an empty array when data is absent", async () => {
  const { ctx } = mockDeskCtx([{ body: {} }]);
  const out = await deskList(ctx, "/tickets", {});
  assertEquals(out, { data: [] });
});

Deno.test("deskGet: builds the path from recordId and returns the bare record", async () => {
  const { ctx, calls } = mockDeskCtx([{ body: { id: "7" } }]);
  const out = await deskGet(ctx, "/contacts", { recordId: "7" });
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/contacts/7");
  assertEquals(out, { id: "7" });
});

Deno.test("deskCreate: POSTs the parsed fields", async () => {
  const { ctx, calls } = mockDeskCtx([{ body: { id: "1" } }]);
  await deskCreate(ctx, "/accounts", { fields: { accountName: "Acme" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { accountName: "Acme" });
});

Deno.test("deskUpdate: PATCHes the parsed fields at the record path", async () => {
  const { ctx, calls } = mockDeskCtx([{ body: { id: "1" } }]);
  await deskUpdate(ctx, "/accounts", { recordId: "1", fields: { website: "https://a.com" } });
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/accounts/1");
});

Deno.test("deskMoveToTrash: POSTs the ids array and reports deleted", async () => {
  const { ctx, calls } = mockDeskCtx([{ status: 204 }]);
  const out = await deskMoveToTrash(ctx, "/tickets", "ticketIds", { recordId: "1" });
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/tickets/moveToTrash");
  assertEquals(JSON.parse(calls[0].body!), { ticketIds: ["1"] });
  assertEquals(out, { deleted: true });
});
