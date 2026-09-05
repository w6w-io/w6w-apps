import { assertEquals, assertRejects } from "@std/assert";
import conversionEventReport from "../../actions/conversion-event-report.ts";
import { mockCtx } from "../_helpers.ts";

const oneEvent = [{
  conversionHappenedAt: 1590739275000,
  conversionValue: { currencyCode: "USD", amount: "50.0" },
  user: { userIds: [{ idType: "SHA256_EMAIL", idValue: "abc" }] },
  eventId: "abc12345",
}];

Deno.test("conversion-event-report: a single event is sent as a plain create, no batch header", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: undefined }]);
  const result = await conversionEventReport.execute(
    { conversionId: "123", events: oneEvent },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["x-restli-method"], undefined);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.conversion, "urn:lla:llaPartnerConversion:123");
  assertEquals(body.conversionHappenedAt, 1590739275000);
  assertEquals(body.eventId, "abc12345");
  assertEquals(result, { ok: true, batch: false, count: 1 });
});

Deno.test("conversion-event-report: two or more events use BATCH_CREATE with an elements wrapper", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: undefined }]);
  const events = [
    { conversionHappenedAt: 1, user: { userIds: [{ idType: "SHA256_EMAIL", idValue: "a" }] } },
    { conversionHappenedAt: 2, user: { userIds: [{ idType: "SHA256_EMAIL", idValue: "b" }] } },
  ];
  const result = await conversionEventReport.execute({ conversionId: "123", events }, ctx);

  assertEquals(calls[0].headers["x-restli-method"], "BATCH_CREATE");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.elements.length, 2);
  assertEquals(body.elements[0].conversion, "urn:lla:llaPartnerConversion:123");
  assertEquals(body.elements[1].conversion, "urn:lla:llaPartnerConversion:123");
  assertEquals(result, { ok: true, batch: true, count: 2 });
});

Deno.test("conversion-event-report: a per-event conversion field overrides the action-level default", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: undefined }]);
  await conversionEventReport.execute(
    {
      conversionId: "123",
      events: [{
        conversion: "999",
        conversionHappenedAt: 1,
        user: { userIds: [] },
      }],
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.conversion, "urn:lla:llaPartnerConversion:999");
});

Deno.test("conversion-event-report: accepts events as a JSON string, matching the json Param contract", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: undefined }]);
  await conversionEventReport.execute(
    { conversionId: "123", events: JSON.stringify(oneEvent) },
    ctx,
  );
  assertEquals(calls.length, 1);
});

Deno.test("conversion-event-report: rejects an empty array without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await conversionEventReport.execute({ conversionId: "123", events: [] }, ctx),
    Error,
    "non-empty",
  );
  assertEquals(calls.length, 0);
});

Deno.test("conversion-event-report: rejects an event with no conversion and no default, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await conversionEventReport.execute(
        { events: [{ conversionHappenedAt: 1, user: { userIds: [] } }] },
        ctx,
      ),
    Error,
    "Conversion Rule ID",
  );
  assertEquals(calls.length, 0);
});

Deno.test("conversion-event-report: is not idempotent", () => {
  assertEquals(conversionEventReport.idempotent, false);
});
