import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/shipment-create.ts";

const shipTo = '{"name":"Amanda Miller","address_line1":"525 S Winchester Blvd",' +
  '"city_locality":"San Jose","state_province":"CA","postal_code":"95128","country_code":"US"}';
const packages = '[{"weight":{"value":16,"unit":"ounce"}}]';
const created = {
  status: 200,
  body: { shipments: [{ shipment_id: "se-1", shipment_status: "pending" }] },
};

Deno.test("shipment-create: posts to /v2/shipments wrapped in a shipments array", async () => {
  const { ctx, calls } = mockCtx([created]);
  await action.execute!(
    {
      carrierId: "se-carrier",
      serviceCode: "usps_priority_mail",
      shipTo,
      shipFrom: shipTo,
      packages,
    },
    ctx,
  );
  assertEquals(calls[0].url, "https://api.shipstation.com/v2/shipments");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assert(Array.isArray(body.shipments) && body.shipments.length === 1, JSON.stringify(body));
  assertEquals(body.shipments[0].carrier_id, "se-carrier");
  assertEquals(body.shipments[0].ship_to.postal_code, "95128");
});

Deno.test("shipment-create: returns shipmentId and shipmentStatus from the first shipment", async () => {
  const { ctx } = mockCtx([created]);
  const result = await action.execute!(
    {
      carrierId: "se-carrier",
      serviceCode: "usps_priority_mail",
      shipTo,
      shipFrom: shipTo,
      packages,
    },
    ctx,
  ) as { shipmentId: string; shipmentStatus: string };
  assertEquals(result.shipmentId, "se-1");
  assertEquals(result.shipmentStatus, "pending");
});

Deno.test("shipment-create: requires shipTo", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await action.execute!(
        { carrierId: "c", serviceCode: "s", shipFrom: shipTo, packages },
        ctx,
      ),
    Error,
    "shipTo",
  );
  assertEquals(calls.length, 0);
});

Deno.test("shipment-create: requires either shipFrom or warehouseId", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await action.execute!(
        { carrierId: "c", serviceCode: "s", shipTo, packages },
        ctx,
      ),
    Error,
    "warehouseId",
  );
  assertEquals(calls.length, 0);
});

Deno.test("shipment-create: warehouseId substitutes for shipFrom", async () => {
  const { ctx, calls } = mockCtx([created]);
  await action.execute!(
    { carrierId: "c", serviceCode: "s", shipTo, warehouseId: "se-wh-1", packages },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.shipments[0].warehouse_id, "se-wh-1");
  assertEquals(body.shipments[0].ship_from, undefined);
});

Deno.test("shipment-create: requires a non-empty packages array", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await action.execute!(
        { carrierId: "c", serviceCode: "s", shipTo, shipFrom: shipTo, packages: "[]" },
        ctx,
      ),
    Error,
    "packages",
  );
  assertEquals(calls.length, 0);
});

Deno.test("shipment-create: confirmation of 'none' is omitted rather than sent literally", async () => {
  const { ctx, calls } = mockCtx([created]);
  await action.execute!(
    {
      carrierId: "c",
      serviceCode: "s",
      shipTo,
      shipFrom: shipTo,
      packages,
      confirmation: "none",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.shipments[0].confirmation, undefined);
});

Deno.test("shipment-create: logs the shipment id and status, not the addresses", async () => {
  const { ctx, logs } = mockCtx([created]);
  await action.execute!(
    { carrierId: "c", serviceCode: "s", shipTo, shipFrom: shipTo, packages },
    ctx,
  );
  assert(!JSON.stringify(logs).includes("Winchester"), JSON.stringify(logs));
  assertEquals(logs[0].data, { shipmentId: "se-1", status: "pending" });
});
