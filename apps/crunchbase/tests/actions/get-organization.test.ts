import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-organization.ts";

Deno.test("get-organization: GETs by permalink with no field_ids/card_ids when unset", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { properties: { name: "Tesla" } } }]);
  await action.execute!({ entityId: "tesla-motors" }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.crunchbase.com/v4/data/entities/organizations/tesla-motors",
  );
});

Deno.test("get-organization: field_ids and card_ids are comma-joined query params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!(
    {
      entityId: "tesla-motors",
      fieldIds: "categories, short_description",
      cardIds: "founders,raised_funding_rounds",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("field_ids"), "categories,short_description");
  assertEquals(url.searchParams.get("card_ids"), "founders,raised_funding_rounds");
});

Deno.test("get-organization: a UUID entityId is URL-encoded the same as a permalink", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ entityId: "05564cba-3c31-4a5c-8f7d-000000000000" }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.crunchbase.com/v4/data/entities/organizations/05564cba-3c31-4a5c-8f7d-000000000000",
  );
});

Deno.test("get-organization: entityId is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`entityId`");
  assertEquals(calls.length, 0);
});
