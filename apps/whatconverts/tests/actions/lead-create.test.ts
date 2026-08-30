import { assertEquals } from "@std/assert";
import leadCreate from "../../actions/lead-create.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("lead-create posts required fields with send_notification defaulted to false", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { lead_id: 1 } }]);
  const out = await leadCreate.execute({ leadType: "phone_call" }, ctx);
  assertEquals(out, { lead_id: 1 });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_ROOT}/leads`);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { send_notification: "false", lead_type: "phone_call" });
});

Deno.test("lead-create includes profile_id and honors an explicit send_notification", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { lead_id: 2 } }]);
  await leadCreate.execute({
    profileId: 42167,
    sendNotification: true,
    leadType: "web_form",
    formName: "Contact Us",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.profile_id, 42167);
  assertEquals(body.send_notification, "true");
  assertEquals(body.form_name, "Contact Us");
});

Deno.test("lead-create serializes additional_fields/custom_fields JSON params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { lead_id: 3 } }]);
  await leadCreate.execute({
    leadType: "email",
    additionalFields: { "Company Name": "Acme" },
    customFields: '{"Contact Person":"Jeremy"}',
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.additional_fields, { "Company Name": "Acme" });
  assertEquals(body.custom_fields, { "Contact Person": "Jeremy" });
});

Deno.test("lead-create passes type-specific fields through untouched", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { lead_id: 4 } }]);
  await leadCreate.execute({
    leadType: "transaction",
    transactionId: "txn-1",
    transactionTax: 5.5,
    transactionShipping: 10,
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.transaction_id, "txn-1");
  assertEquals(body.transaction_tax, 5.5);
  assertEquals(body.transaction_shipping, 10);
});
