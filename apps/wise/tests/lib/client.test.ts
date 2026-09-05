import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  asJson,
  asOptionalJson,
  compact,
  compactBody,
  deriveUuid,
  formatWiseError,
  WiseClient,
} from "../../lib/client.ts";
import { authErrorBody, mockCtx, pathOf, queryOf, validationErrorBody } from "../_helpers.ts";

Deno.test("client: builds the calendar-versioned URL and drops empty query values", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await new WiseClient(ctx).json("/currencies", { query: { a: "x", b: undefined, c: "" } });

  assertEquals(calls[0].url, "https://api.wise.com/2026Q3/currencies?a=x");
  assertEquals(pathOf(calls[0].url), "/2026Q3/currencies");
  assertEquals(queryOf(calls[0].url), { a: "x" });
});

Deno.test("client: JSON body defaults to application/json", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1 } }]);
  await new WiseClient(ctx).json("/accounts", { method: "POST", body: { currency: "GBP" } });

  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { currency: "GBP" });
});

Deno.test("client: an explicit content type overrides the default (Quote Update's merge-patch)", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "q1" } }]);
  await new WiseClient(ctx).json("/profiles/1/quotes/q1", {
    method: "PATCH",
    contentType: "application/merge-patch+json",
    body: { targetAccount: 2 },
  });

  assertEquals(calls[0].headers["content-type"], "application/merge-patch+json");
});

Deno.test("client: a request with no body sends none", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "cancelled" } }]);
  await new WiseClient(ctx).json("/transfers/1/cancel", { method: "PUT" });

  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["content-type"], undefined);
});

Deno.test("client: throws formatWiseError's message on a non-2xx response", async () => {
  const { ctx } = mockCtx([{ status: 401, body: authErrorBody("invalid_token", "Invalid token") }]);
  await assertRejects(
    () => new WiseClient(ctx).json("/profiles"),
    Error,
    "invalid_token",
  );
});

Deno.test("client: a 204-shaped empty body parses to undefined, not a JSON error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: undefined }]);
  const result = await new WiseClient(ctx).json("/whatever");
  assertEquals(result, undefined);
});

Deno.test("compact: drops undefined/null/empty-string values and stringifies the rest", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false, f: "x" }), {
    a: "1",
    e: "false",
    f: "x",
  });
});

Deno.test("compactBody: drops unset keys WITHOUT stringifying survivors", () => {
  assertEquals(compactBody({ sourceAmount: 100, targetAmount: undefined, payOut: "BALANCE" }), {
    sourceAmount: 100,
    payOut: "BALANCE",
  });
});

Deno.test("formatWiseError: reports the OAuth-style shape verbatim", () => {
  const msg = formatWiseError(
    401,
    "GET",
    "/profiles",
    JSON.stringify(authErrorBody("invalid_token", "Invalid token")),
  );
  assert(msg.includes("invalid_token"));
  assert(msg.includes("Invalid token"));
});

Deno.test("formatWiseError: reports the validation-error shape with the failing field's path", () => {
  const msg = formatWiseError(
    400,
    "POST",
    "/accounts",
    JSON.stringify(
      validationErrorBody([{ code: "NOT_VALID", message: "Unknown bank code", path: "sortCode" }]),
    ),
  );
  assert(msg.includes("sortCode"));
  assert(msg.includes("Unknown bank code"));
});

Deno.test("formatWiseError: falls back to the raw body when neither shape matches", () => {
  const msg = formatWiseError(500, "GET", "/profiles", "upstream exploded");
  assert(msg.includes("upstream exploded"));
});

Deno.test("asOptionalJson/asJson: accepts a parsed value, a JSON string, and rejects malformed JSON", () => {
  assertEquals(asOptionalJson({ a: 1 }, "x"), { a: 1 });
  assertEquals(asOptionalJson('{"a":1}', "x"), { a: 1 });
  assertEquals(asOptionalJson(undefined, "x"), undefined);
  assertEquals(asOptionalJson("", "x"), undefined);
  let threw = false;
  try {
    asOptionalJson("{not json", "Account details");
  } catch (e) {
    threw = true;
    assert((e as Error).message.includes("Account details"));
  }
  assert(threw);
  let requiredThrew = false;
  try {
    asJson(undefined, "Account details");
  } catch {
    requiredThrew = true;
  }
  assert(requiredThrew);
});

Deno.test("deriveUuid: deterministic per seed, and shaped like a UUID", async () => {
  const a = await deriveUuid("inv_0001");
  const b = await deriveUuid("inv_0001");
  const c = await deriveUuid("inv_0002");

  assertEquals(a, b, "same seed must derive the same key, so a retry reuses it");
  assert(a !== c, "different seeds must not collide");
  assert(
    /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(a),
    `not RFC-4122 shaped: ${a}`,
  );
});
