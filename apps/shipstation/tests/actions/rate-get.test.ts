import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/rate-get.ts";

const shipTo = '{"name":"The President","address_line1":"1600 Pennsylvania Avenue NW",' +
  '"city_locality":"Washington","state_province":"DC","postal_code":"20500","country_code":"US"}';
const packages = '[{"weight":{"value":6,"unit":"ounce"}}]';

const quoted = (rates: unknown[], invalid: unknown[] = []) => ({
  status: 200,
  body: {
    rate_response: { rates, invalid_rates: invalid, status: "completed" },
    shipment_id: "se-9",
  },
});

Deno.test("rate-get: posts rate_options.carrier_ids and the shipment object", async () => {
  const { ctx, calls } = mockCtx([quoted([])]);
  await action.execute!(
    { carrierIds: "se-1, se-2", shipTo, shipFrom: shipTo, packages },
    ctx,
  );
  assertEquals(calls[0].url, "https://api.shipstation.com/v2/rates");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.rate_options.carrier_ids, ["se-1", "se-2"]);
  assertEquals(body.shipment.ship_to.city_locality, "Washington");
});

/** Rates come back under `rate_response.rates`, not top-level — the documented shape. */
Deno.test("rate-get: reads rates from rate_response, sorted cheapest first", async () => {
  const { ctx } = mockCtx([quoted([
    { rate_id: "r1", shipping_amount: { amount: 10.05 } },
    { rate_id: "r2", shipping_amount: { amount: 9.99 } },
  ])]);
  const result = await action.execute!(
    { carrierIds: "se-1", shipTo, shipFrom: shipTo, packages },
    ctx,
  ) as { rates: Array<{ rate_id: string }>; cheapestRate: { rate_id: string } };
  assertEquals(result.rates.map((r) => r.rate_id), ["r2", "r1"]);
  assertEquals(result.cheapestRate.rate_id, "r2");
});

Deno.test("rate-get: surfaces the shipment_id created as a side effect", async () => {
  const { ctx } = mockCtx([quoted([])]);
  const result = await action.execute!(
    { carrierIds: "se-1", shipTo, shipFrom: shipTo, packages },
    ctx,
  ) as { shipmentId: string };
  assertEquals(result.shipmentId, "se-9");
});

Deno.test("rate-get: surfaces invalid_rates", async () => {
  const { ctx } = mockCtx([quoted([], [{ carrier_id: "se-2", error_message: "no service" }])]);
  const result = await action.execute!(
    { carrierIds: "se-1,se-2", shipTo, shipFrom: shipTo, packages },
    ctx,
  ) as { invalidRates: unknown[] };
  assertEquals(result.invalidRates.length, 1);
});

Deno.test("rate-get: requires carrierIds", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ shipTo, shipFrom: shipTo, packages }, ctx),
    Error,
    "carrierIds",
  );
  assertEquals(calls.length, 0);
});

Deno.test("rate-get: requires shipFrom or warehouseId", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ carrierIds: "se-1", shipTo, packages }, ctx),
    Error,
    "warehouseId",
  );
  assertEquals(calls.length, 0);
});

Deno.test("rate-get: idempotent is false (it creates a shipment as a side effect)", () => {
  assert(action.idempotent === false, String(action.idempotent));
});
