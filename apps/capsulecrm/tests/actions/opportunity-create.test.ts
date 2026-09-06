import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/opportunity-create.ts";

Deno.test("opportunity-create: POSTs /opportunities with party+milestone nested", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { opportunity: { id: 83948362 } } }]);
  const out = await action.execute(
    { name: "Consulting", partyId: 581, milestoneId: 14, valueAmount: 500, valueCurrency: "GBP" },
    ctx,
  );
  assertEquals(calls[0].url, "https://api.capsulecrm.com/api/v2/opportunities");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    opportunity: {
      name: "Consulting",
      party: { id: 581 },
      milestone: { id: 14 },
      value: { amount: 500, currency: "GBP" },
    },
  });
  assertEquals(out, { opportunity: { id: 83948362 } });
});

Deno.test("opportunity-create: name/partyId/milestoneId are marked required", () => {
  const required = action.params!.filter((p) => p.required).map((p) => p.key);
  assertEquals(required.includes("name"), true);
  assertEquals(required.includes("partyId"), true);
  assertEquals(required.includes("milestoneId"), true);
});
