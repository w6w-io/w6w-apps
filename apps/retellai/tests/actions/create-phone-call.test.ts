import { assertEquals } from "@std/assert";
import createPhoneCall from "../../actions/create-phone-call.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-phone-call: posts to /v2/create-phone-call with the expected body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: {
      call_id: "c1",
      agent_id: "a1",
      call_status: "registered",
      from_number: "+14157774444",
      to_number: "+12137774445",
      direction: "outbound",
    },
  }]);

  const out = await createPhoneCall.execute(
    { fromNumber: "+14157774444", toNumber: "+12137774445" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v2/create-phone-call");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { from_number: "+14157774444", to_number: "+12137774445" });
  assertEquals(out.call_status, "registered");
});

Deno.test("create-phone-call: optional fields are mapped to their wire names", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { call_id: "c1" } }]);

  await createPhoneCall.execute({
    fromNumber: "+14157774444",
    toNumber: "+12137774445",
    overrideAgentId: "agent_123",
    metadata: { orderId: "o1" },
    dynamicVariables: { customer_name: "John" },
    ignoreE164Validation: true,
  }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.override_agent_id, "agent_123");
  assertEquals(body.metadata, { orderId: "o1" });
  assertEquals(body.retell_llm_dynamic_variables, { customer_name: "John" });
  assertEquals(body.ignore_e164_validation, true);
});

Deno.test("create-phone-call: is not idempotent — each call places a new outbound dial", () => {
  assertEquals(createPhoneCall.idempotent, false);
});
