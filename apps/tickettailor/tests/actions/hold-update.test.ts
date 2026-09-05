import { assertEquals } from "@std/assert";
import holdUpdate from "../../actions/hold-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("hold-update: POSTs a note change without touching ticket_type_id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "ho_1" } }]);
  await holdUpdate.execute({ holdId: "ho_1", note: "Updated note" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/holds/ho_1");
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("note"), "Updated note");
  assertEquals(body.has("ticket_type_id[]"), false);
});

Deno.test("hold-update: sends the bracket-keyed quantity map when both fields are given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "ho_1" } }]);
  await holdUpdate.execute({ holdId: "ho_1", ticketTypeId: "tt_1", quantity: 0 }, ctx);
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("ticket_type_id[tt_1]"), "0");
});
