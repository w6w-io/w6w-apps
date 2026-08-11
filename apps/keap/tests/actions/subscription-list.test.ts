import { assert, assertEquals } from "@std/assert";
import subscriptionList from "../../actions/subscription-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const PAGE = { subscriptions: [{ id: "1", contact_id: "9" }], next_page_token: "n" };

Deno.test("subscription-list: reads the subscriptions collection", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  const out = await subscriptionList.execute({}, ctx) as { count: number };
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/subscriptions");
  assertEquals(out.count, 1);
});

Deno.test("subscription-list: builds the documented filter clauses", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await subscriptionList.execute({ contactId: "9", subscriptionPlanId: "3" }, ctx);
  assertEquals(queryOf(calls[0].url).filter, "contact_id==9;subscription_plan_id==3");
});

/**
 * Keap publishes no enum for the `status` clause anywhere in the v2 document,
 * so it is left as free text rather than guessed at — inventing a select here
 * would ship values the vendor never named.
 */
Deno.test("subscription-list: status is free text, and says why", () => {
  const param = subscriptionList.params?.find((p) => p.key === "status");
  assertEquals(param?.type, "string");
  assertEquals(param?.options, undefined);
  assert(/no enum/.test(param?.hint ?? ""));
});
