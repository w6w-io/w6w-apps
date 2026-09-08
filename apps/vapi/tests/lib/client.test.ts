import { assertEquals, assertThrows } from "@std/assert";
import {
  asOptionalJson,
  compact,
  formatVapiError,
  stripSecrets,
  truncate,
} from "../../lib/client.ts";

Deno.test("formatVapiError: joins array-shaped validation messages", () => {
  const raw = JSON.stringify({
    message: ["name must be shorter than or equal to 40 characters", "assistantId must be a UUID"],
    error: "Bad Request",
    statusCode: 400,
  });
  const msg = formatVapiError(400, "POST", "/call", raw);
  assertEquals(
    msg,
    "Vapi 400 Bad Request for POST /call: name must be shorter than or equal to 40 characters; " +
      "assistantId must be a UUID",
  );
});

Deno.test("formatVapiError: string message, no array join needed", () => {
  const raw = JSON.stringify({
    message: "Missing Authorization Header.",
    error: "Unauthorized",
    statusCode: 401,
  });
  const msg = formatVapiError(401, "GET", "/assistant", raw);
  assertEquals(msg, "Vapi 401 Unauthorized for GET /assistant: Missing Authorization Header.");
});

Deno.test("formatVapiError: unparseable body falls back to the raw text", () => {
  const msg = formatVapiError(500, "GET", "/call", "<html>gateway timeout</html>");
  assertEquals(msg, "Vapi 500 for GET /call: <html>gateway timeout</html>");
});

Deno.test("truncate: leaves short text alone, caps long text with a byte count", () => {
  assertEquals(truncate("short"), "short");
  const long = "x".repeat(900);
  const out = truncate(long, 800);
  assertEquals(out.startsWith("x".repeat(800)), true);
  assertEquals(out.endsWith("(900 bytes truncated)"), true);
});

Deno.test("stripSecrets: drops apiKey/secret/token/password wherever nested", () => {
  const input = {
    id: "asst_1",
    name: "Support",
    credentials: [
      { provider: "anthropic", apiKey: "sk-live-abc", name: "prod" },
      { provider: "openai", secret: "shh" },
    ],
    server: { url: "https://example.com", headers: { authorization: "Bearer xyz", token: "t" } },
  };
  const out = stripSecrets(input) as typeof input;
  assertEquals(out.name, "Support");
  assertEquals((out.credentials[0] as Record<string, unknown>).apiKey, undefined);
  assertEquals((out.credentials[0] as Record<string, unknown>).provider, "anthropic");
  assertEquals((out.credentials[1] as Record<string, unknown>).secret, undefined);
  assertEquals((out.server.headers as Record<string, unknown>).token, undefined);
  // "authorization" itself is not in the secret-key pattern (it's a header
  // name, not a credential field name) and survives — the point is the named
  // credential fields, not a blanket header scrub.
  assertEquals((out.server.headers as Record<string, unknown>).authorization, "Bearer xyz");
});

Deno.test("stripSecrets: passes arrays and primitives through unchanged", () => {
  assertEquals(stripSecrets([1, 2, 3]), [1, 2, 3]);
  assertEquals(stripSecrets("hello"), "hello");
  assertEquals(stripSecrets(null), null);
  assertEquals(stripSecrets(undefined), undefined);
});

Deno.test("stripSecrets: does not mutate the input", () => {
  const input = { apiKey: "secret", name: "ok" };
  const out = stripSecrets(input);
  assertEquals(input.apiKey, "secret");
  assertEquals((out as Record<string, unknown>).apiKey, undefined);
});

Deno.test("asOptionalJson: passes through a parsed object, parses a JSON string, rejects garbage", () => {
  assertEquals(asOptionalJson({ a: 1 }, "x"), { a: 1 });
  assertEquals(asOptionalJson('{"a":1}', "x"), { a: 1 });
  assertEquals(asOptionalJson(undefined, "x"), undefined);
  assertEquals(asOptionalJson("", "x"), undefined);
  assertThrows(
    () => asOptionalJson("{not json", "assistantOverrides"),
    Error,
    "assistantOverrides",
  );
});

Deno.test("compact: drops undefined, null and empty-string values, keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});
