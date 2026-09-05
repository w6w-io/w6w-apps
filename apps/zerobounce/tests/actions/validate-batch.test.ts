import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/validate-batch.ts";

Deno.test("validate-batch: POSTs /v2/validatebatch with an email_batch array built from emails/ipAddresses", async () => {
  const body = {
    email_batch: [{ address: "a@example.com", status: "valid" }],
    errors: [],
  };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!(
    { emails: ["a@example.com", "b@example.com"], ipAddresses: ["1.1.1.1"] },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.zerobounce.net");
  assertEquals(url.pathname, "/v2/validatebatch");
  assertEquals(calls[0].method, "POST");
  // `JSON.stringify` drops keys whose value is `undefined`, so the second
  // entry's `ip_address` is absent (not present-with-value-undefined) once
  // the request body is serialized and parsed back.
  const payload = JSON.parse(calls[0].body!);
  assertEquals(payload.email_batch, [
    { email_address: "a@example.com", ip_address: "1.1.1.1" },
    { email_address: "b@example.com" },
  ]);
  assertEquals(result, body);
});

Deno.test("validate-batch: returns the vendor's envelope verbatim, including partial errors", async () => {
  const body = {
    email_batch: [{ address: "a@example.com", status: "valid" }],
    errors: [{ error: "some failure", email_address: "b@example.com" }],
  };
  const { ctx } = mockCtx([{ body }]);
  const result = await action.execute!({ emails: ["a@example.com", "b@example.com"] }, ctx);
  assertEquals(result, body);
});

Deno.test("validate-batch: is a non-idempotent perform action scoped to the email resource", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.resource, "email");
  assertEquals(action.idempotent, false);
  assertEquals(action.params?.find((p) => p.key === "emails")?.required, true);
});
