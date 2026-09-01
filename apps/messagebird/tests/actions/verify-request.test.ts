import { assert, assertEquals } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/verify-request.ts";

Deno.test("verify-request: POSTs a JSON body to /verify with a stripped msisdn", async () => {
  const body = {
    id: "4e213b01155d1e35a9d9571v00162985",
    recipient: 31612345678,
    status: "sent",
  };
  const { ctx, calls } = mockCtx([{ body }]);

  const result = await action.execute!({ recipient: "+31612345678", originator: "YourName" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/verify");
  const sent = JSON.parse(calls[0].body ?? "{}");
  assertEquals(sent.recipient, "31612345678");
  assertEquals(sent.originator, "YourName");
  assertEquals(result, body);
});

/** Email is the one delivery channel where the recipient is NOT a phone number. */
Deno.test("verify-request: an email recipient is sent verbatim, not msisdn-stripped", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { recipient: "client-email@example.com", type: "email", originator: "verify@company.com" },
    ctx,
  );
  const sent = JSON.parse(calls[0].body ?? "{}");
  assertEquals(sent.recipient, "client-email@example.com");
  assertEquals(sent.type, "email");
});

Deno.test("verify-request: passes template, timeout, tokenLength, maxAttempts, voice, language", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      recipient: "+1",
      type: "tts",
      template: "Code: %token",
      timeout: 120,
      tokenLength: 8,
      maxAttempts: 3,
      voice: "male",
      language: "en-us",
    },
    ctx,
  );
  const sent = JSON.parse(calls[0].body ?? "{}");
  assertEquals(sent.template, "Code: %token");
  assertEquals(sent.timeout, 120);
  assertEquals(sent.tokenLength, 8);
  assertEquals(sent.maxAttempts, 3);
  assertEquals(sent.voice, "male");
  assertEquals(sent.language, "en-us");
});

Deno.test("verify-request: idempotent is explicitly false — a retry must not re-send a code", () => {
  assertEquals(action.idempotent, false);
});

Deno.test("verify-request: unset optional fields are omitted from the payload", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ recipient: "+1" }, ctx);
  const sent = JSON.parse(calls[0].body ?? "{}");
  assert(!("template" in sent), JSON.stringify(sent));
  assert(!("voice" in sent), JSON.stringify(sent));
});
