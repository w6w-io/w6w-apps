import { assertEquals } from "@std/assert";
import { mockInsightlyCtx } from "../_helpers.ts";
import action from "../../actions/lead-get-many.ts";

Deno.test("lead-get-many: plain list with no filter", async () => {
  const { ctx, calls } = mockInsightlyCtx([{ body: [{ LEAD_ID: 1 }] }]);
  const out = await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3.1/Leads");
  assertEquals(out, { leads: [{ LEAD_ID: 1 }] });
});

Deno.test("lead-get-many: switches to /Search when a filter field is set", async () => {
  const { ctx, calls } = mockInsightlyCtx([{ body: [] }]);
  await action.execute({ fieldName: "LEAD_RATING", fieldValue: "5" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3.1/Leads/Search");
  assertEquals(url.searchParams.get("field_name"), "LEAD_RATING");
  assertEquals(url.searchParams.get("field_value"), "5");
});
