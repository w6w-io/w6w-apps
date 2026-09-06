import { assertEquals } from "@std/assert";
import { buildOpportunityBody } from "../../lib/opportunity.ts";

Deno.test("buildOpportunityBody: party and milestone nest as {id}", () => {
  assertEquals(
    buildOpportunityBody({ name: "Consulting", partyId: 581, milestoneId: 14 }),
    { name: "Consulting", party: { id: 581 }, milestone: { id: 14 } },
  );
});

Deno.test("buildOpportunityBody: value nests amount+currency, dropping an unset currency", () => {
  assertEquals(
    buildOpportunityBody({ valueAmount: 500, valueCurrency: "GBP" }),
    { value: { amount: 500, currency: "GBP" } },
  );
  assertEquals(buildOpportunityBody({ valueAmount: 500 }), { value: { amount: 500 } });
});

Deno.test("buildOpportunityBody: no value key at all when no amount is given", () => {
  assertEquals(buildOpportunityBody({ valueCurrency: "GBP" }), {});
});

Deno.test("buildOpportunityBody: owner/team nest as {id}, both optional", () => {
  assertEquals(buildOpportunityBody({ ownerId: 6 }), { owner: { id: 6 } });
  assertEquals(buildOpportunityBody({ teamId: 3 }), { team: { id: 3 } });
});

Deno.test("buildOpportunityBody: durationBasis/duration/probability pass through as-is", () => {
  assertEquals(
    buildOpportunityBody({ durationBasis: "WEEK", duration: 2, probability: 50 }),
    { durationBasis: "WEEK", duration: 2, probability: 50 },
  );
});

Deno.test("buildOpportunityBody: unset fields are omitted entirely (PUT-safe)", () => {
  assertEquals(buildOpportunityBody({}), {});
});
