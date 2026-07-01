import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-deal.ts";

Deno.test("create-deal: POSTs /crm/v3/objects/deals with required properties", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "d1" } }]);
  await action.execute!(
    { dealname: "Enterprise", dealstage: "appointmentscheduled", amount: 5000 },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/crm/v3/objects/deals");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.properties.dealname, "Enterprise");
  assertEquals(body.properties.dealstage, "appointmentscheduled");
  assertEquals(body.properties.amount, "5000");
});
