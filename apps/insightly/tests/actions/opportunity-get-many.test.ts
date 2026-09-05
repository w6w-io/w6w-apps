import { assertEquals } from "@std/assert";
import { mockInsightlyCtx } from "../_helpers.ts";
import action from "../../actions/opportunity-get-many.ts";

Deno.test("opportunity-get-many: plain list with no filter", async () => {
  const { ctx, calls } = mockInsightlyCtx([{ body: [{ OPPORTUNITY_ID: 1 }] }]);
  const out = await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3.1/Opportunities");
  assertEquals(out, { opportunities: [{ OPPORTUNITY_ID: 1 }] });
});

Deno.test("opportunity-get-many: switches to /Search when a filter field is set", async () => {
  const { ctx, calls } = mockInsightlyCtx([{ body: [] }]);
  await action.execute({ fieldName: "PROBABILITY", fieldValue: "100", top: 10 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3.1/Opportunities/Search");
  assertEquals(url.searchParams.get("field_name"), "PROBABILITY");
  assertEquals(url.searchParams.get("top"), "10");
});
