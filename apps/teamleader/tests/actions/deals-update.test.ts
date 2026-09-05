import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/deals-update.ts";

Deno.test("deals-update: POSTs deals.update with id and returns {id} on 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute({ id: "d1", title: "Renamed deal" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/deals.update");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.id, "d1");
  assertEquals(body.title, "Renamed deal");
  assertEquals("lead" in body, false);
  assertEquals(out, { id: "d1" });
});

Deno.test("deals-update: nests customer under lead only when both type and id are given", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute({ id: "d1", customerType: "contact", customerId: "p-1" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.lead, { customer: { type: "contact", id: "p-1" } });
});
