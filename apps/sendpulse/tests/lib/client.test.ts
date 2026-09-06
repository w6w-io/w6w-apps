import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { compact, errorMessage, SendPulseClient, toBase64, unset } from "../../lib/client.ts";

Deno.test("compact: drops undefined, null and empty-string values only", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }), {
    a: 1,
    e: false,
    f: 0,
  });
});

Deno.test("unset: blank string becomes undefined, everything else passes through", () => {
  assertEquals(unset(""), undefined);
  assertEquals(unset("x"), "x");
  assertEquals(unset(undefined), undefined);
});

Deno.test("toBase64: encodes UTF-8 bytes a bare btoa would throw on", () => {
  const input = "café — naïve";
  const encoded = toBase64(input);
  const decoded = new TextDecoder().decode(
    Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0)),
  );
  assertEquals(decoded, input);
});

Deno.test("errorMessage: reads the flat {message, error_code} shape", () => {
  assertEquals(
    errorMessage(JSON.stringify({ message: "Unauthorized!", error_code: 401 })),
    "Unauthorized!",
  );
});

Deno.test("errorMessage: reads CRM's nested {data: {message}} shape", () => {
  assertEquals(
    errorMessage(JSON.stringify({ data: { code: 213, message: "Book not found" } })),
    "Book not found",
  );
});

Deno.test("errorMessage: reads the OAuth {error, error_description} shape", () => {
  assertEquals(
    errorMessage(JSON.stringify({ error: "invalid_client", error_description: "bad creds" })),
    "bad creds",
  );
});

Deno.test("errorMessage: returns undefined for empty or unparsable text", () => {
  assertEquals(errorMessage(""), undefined);
  assertEquals(errorMessage("not json"), undefined);
});

Deno.test("SendPulseClient.crm: targets https://api.sendpulse.com/crm/v1", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await new SendPulseClient(ctx).crm("/users");
  assertEquals(calls[0].url, "https://api.sendpulse.com/crm/v1/users");
});

Deno.test("SendPulseClient.bulkEmail: targets the host root", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await new SendPulseClient(ctx).bulkEmail("/senders");
  assertEquals(calls[0].url, "https://api.sendpulse.com/senders");
});

Deno.test("SendPulseClient: never sets an Authorization header itself", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new SendPulseClient(ctx).bulkEmail("/balance");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("SendPulseClient: query params drop undefined/null/empty values", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await new SendPulseClient(ctx).bulkEmail("/campaigns", {
    query: { limit: 10, offset: undefined, order: "" },
  });
  assertEquals(calls[0].url, "https://api.sendpulse.com/campaigns?limit=10");
});

Deno.test("SendPulseClient: a non-ok response throws with the vendor's own message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { message: "Argument bookName missing", error_code: 422 },
  }]);
  await assertRejects(
    () => new SendPulseClient(ctx).bulkEmail("/addressbooks", { method: "POST", body: {} }),
    Error,
    "Argument bookName missing",
  );
});

Deno.test("SendPulseClient: a response with no body resolves to undefined rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 200, body: undefined }]);
  const result = await new SendPulseClient(ctx).bulkEmail("/senders");
  assertEquals(result, undefined);
});
