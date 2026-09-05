import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/shipment-create.ts";

const rated = (rates: unknown[], status = "SUCCESS") => ({
  status: 200,
  body: { object_id: "shp_1", status, rates },
});
const addr = '{"street1":"179 N Harbor Dr","city":"Redondo Beach","state":"CA","zip":"90277"}';
const parcel =
  '{"length":"10","width":"8","height":"4","distance_unit":"in","weight":"16","mass_unit":"oz"}';

Deno.test("shipment-create: sends both addresses, one parcel, and async:false by default", async () => {
  const { ctx, calls } = mockCtx([rated([])]);
  await action.execute!({ addressTo: addr, addressFrom: "adr_home", parcel }, ctx);
  assertEquals(calls[0].url, "https://api.goshippo.com/shipments");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.address_to.zip, "90277");
  // An address given as a bare id is not JSON-parsed and is not wrapped in {id: ...}.
  assertEquals(body.address_from, "adr_home");
  assertEquals(body.parcels, [JSON.parse(parcel)]);
  assertEquals(body.async, false);
});

/**
 * `amount` is a string, so comparing lexically puts "9.99" above "10.05" —
 * which buys the wrong label and is never noticed.
 */
Deno.test("shipment-create: sorts rates numerically and surfaces the cheapest", async () => {
  const { ctx } = mockCtx([rated([
    { object_id: "r1", amount: "10.05", provider: "UPS" },
    { object_id: "r2", amount: "9.99", provider: "USPS" },
    { object_id: "r3", amount: "100.00", provider: "FedEx" },
  ])]);
  const result = await action.execute!({ addressTo: addr, addressFrom: addr, parcel }, ctx) as {
    rates: Array<{ object_id: string }>;
    cheapestRate: { object_id: string };
    rateCount: number;
  };
  assertEquals(result.rates.map((r) => r.object_id), ["r2", "r1", "r3"]);
  assertEquals(result.cheapestRate.object_id, "r2");
  assertEquals(result.rateCount, 3);
});

/** No rates is a real outcome — no carrier account can serve the route. */
Deno.test("shipment-create: an empty rate list on a settled shipment is warned about", async () => {
  const { ctx, logs } = mockCtx([rated([], "SUCCESS")]);
  await action.execute!({ addressTo: addr, addressFrom: addr, parcel }, ctx);
  assert(logs.some((l) => l.level === "warn" && /no rates/.test(l.message)), JSON.stringify(logs));
});

/** An async shipment legitimately has no rates yet — that is not a warning. */
Deno.test("shipment-create: an empty rate list while QUEUED is not warned about", async () => {
  const { ctx, logs } = mockCtx([rated([], "QUEUED")]);
  await action.execute!({ addressTo: addr, addressFrom: addr, parcel, async: true }, ctx);
  assert(!logs.some((l) => l.level === "warn"), JSON.stringify(logs));
});

Deno.test("shipment-create: carrier accounts become a plain id list", async () => {
  const { ctx, calls } = mockCtx([rated([])]);
  await action.execute!({
    addressTo: addr,
    addressFrom: addr,
    parcel,
    carrierAccounts: "ca_1, ca_2",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).carrier_accounts, ["ca_1", "ca_2"]);
});

Deno.test("shipment-create: all three of to address, from address and parcel are required", async () => {
  for (const missing of ["addressTo", "addressFrom", "parcel"]) {
    const input: Record<string, unknown> = { addressTo: addr, addressFrom: addr, parcel };
    input[missing] = "";
    const { ctx, calls } = mockCtx([]);
    await assertRejects(async () => await action.execute!(input, ctx), Error, missing);
    assertEquals(calls.length, 0);
  }
});

Deno.test("shipment-create: logs the shipment id, status and rate count, not the addresses", async () => {
  const { ctx, logs } = mockCtx([rated([{ object_id: "r1", amount: "9.99" }])]);
  await action.execute!({ addressTo: addr, addressFrom: addr, parcel }, ctx);
  assert(!JSON.stringify(logs).includes("Redondo"), JSON.stringify(logs));
  assertEquals(logs[0].data, { shipmentId: "shp_1", status: "SUCCESS", rateCount: 1 });
});
