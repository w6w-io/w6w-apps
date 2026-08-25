import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/label-create.ts";

const shipTo = '{"name":"Jane Doe","address_line1":"525 S Winchester Blvd",' +
  '"city_locality":"San Jose","state_province":"CA","postal_code":"95128","country_code":"US"}';
const packages = '[{"weight":{"value":20,"unit":"ounce"}}]';
const label = {
  status: 200,
  body: {
    label_id: "se-1",
    shipment_id: "se-9",
    tracking_number: "1Z999",
    shipment_cost: { currency: "usd", amount: 17.58 },
    label_download: { pdf: "https://api.shipstation.com/v2/downloads/x/label.pdf" },
  },
};

Deno.test("label-create: from a rateId posts to /v2/labels/rates/:rate_id", async () => {
  const { ctx, calls } = mockCtx([label]);
  await action.execute!({ rateId: "se-rate-1" }, ctx);
  assertEquals(calls[0].url, "https://api.shipstation.com/v2/labels/rates/se-rate-1");
  assertEquals(calls[0].method, "POST");
});

Deno.test("label-create: from a shipmentId posts to /v2/labels/shipment/:shipment_id", async () => {
  const { ctx, calls } = mockCtx([label]);
  await action.execute!({ shipmentId: "se-9" }, ctx);
  assertEquals(calls[0].url, "https://api.shipstation.com/v2/labels/shipment/se-9");
});

Deno.test("label-create: rateId wins over shipmentId when both are given", async () => {
  const { ctx, calls } = mockCtx([label]);
  await action.execute!({ rateId: "se-rate-1", shipmentId: "se-9" }, ctx);
  assertEquals(calls[0].url, "https://api.shipstation.com/v2/labels/rates/se-rate-1");
});

Deno.test("label-create: inline details post to plain /v2/labels", async () => {
  const { ctx, calls } = mockCtx([label]);
  await action.execute!(
    { carrierId: "se-carrier", serviceCode: "ups_ground", shipTo, shipFrom: shipTo, packages },
    ctx,
  );
  assertEquals(calls[0].url, "https://api.shipstation.com/v2/labels");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.shipment.carrier_id, "se-carrier");
});

Deno.test("label-create: inline mode requires carrierId and serviceCode", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ shipTo, shipFrom: shipTo, packages }, ctx),
    Error,
    "carrierId",
  );
  assertEquals(calls.length, 0);
});

Deno.test("label-create: inline mode requires shipTo", async () => {
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

Deno.test("label-create: returns labelId, trackingNumber, shipmentCost, labelDownload", async () => {
  const { ctx } = mockCtx([label]);
  const result = await action.execute!({ rateId: "se-rate-1" }, ctx) as {
    labelId: string;
    trackingNumber: string;
    shipmentCost: { amount: number };
    labelDownload: { pdf: string };
  };
  assertEquals(result.labelId, "se-1");
  assertEquals(result.trackingNumber, "1Z999");
  assertEquals(result.shipmentCost.amount, 17.58);
  assert(result.labelDownload.pdf.endsWith(".pdf"));
});

Deno.test("label-create: default labelFormat/labelLayout are omitted from the body, not sent literally", async () => {
  const { ctx, calls } = mockCtx([label]);
  await action.execute!({ rateId: "se-rate-1", labelFormat: "pdf", labelLayout: "4x6" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.label_format, undefined);
  assertEquals(body.label_layout, undefined);
});

Deno.test("label-create: a non-default labelFormat IS sent", async () => {
  const { ctx, calls } = mockCtx([label]);
  await action.execute!({ rateId: "se-rate-1", labelFormat: "zpl" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.label_format, "zpl");
});

Deno.test("label-create: is not idempotent — it spends money", () => {
  assertEquals(action.idempotent, false);
});
