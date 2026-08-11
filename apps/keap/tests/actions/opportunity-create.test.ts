import { assertEquals } from "@std/assert";
import opportunityCreate from "../../actions/opportunity-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const CREATED = { id: "1", opportunity_title: "Deal" };

Deno.test("opportunity-create: POSTs the flat request shape", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: CREATED }]);
  await opportunityCreate.execute(
    { contactId: "9", title: "Deal", stageId: "2", userId: "7" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/opportunities");
  assertEquals(JSON.parse(calls[0].body!), {
    contact_id: "9",
    opportunity_title: "Deal",
    stage_id: "2",
    user_id: "7",
  });
});

/**
 * Three required properties, and `stage_id` is the non-obvious one: Keap has no
 * default pipeline stage, so an opportunity cannot be created unstaged.
 */
Deno.test("opportunity-create: contact, title and stage are all declared required", () => {
  const required = (opportunityCreate.params ?? []).filter((p) => p.required).map((p) => p.key);
  assertEquals(required.sort(), ["contactId", "stageId", "title"]);
});

Deno.test("opportunity-create: the revenue range and forecast flag are sent under Keap's names", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: CREATED }]);
  await opportunityCreate.execute(
    {
      contactId: "9",
      title: "Deal",
      stageId: "2",
      projectedRevenueLow: 5000,
      projectedRevenueHigh: 10000,
      includeInForecast: true,
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.projected_revenue_low, 5000);
  assertEquals(body.projected_revenue_high, 10000);
  assertEquals(body.include_in_forecast, true);
});

Deno.test("opportunity-create: notes map to opportunity_notes, not notes", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: CREATED }]);
  await opportunityCreate.execute(
    { contactId: "9", title: "Deal", stageId: "2", notes: "From the trade show" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.opportunity_notes, "From the trade show");
  assertEquals(body.notes, undefined);
});

Deno.test("opportunity-create: is declared non-idempotent — a retry doubles the pipeline", () => {
  assertEquals(opportunityCreate.idempotent, false);
});
