import { assertEquals, assertThrows } from "@std/assert";
import {
  baseUrlFromConnection,
  BubbleClient,
  compact,
  formatTypeName,
  normalizeBaseUrl,
  parseJson,
  safeErrorMessage,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("normalizeBaseUrl: adds https to a bare host", () => {
  assertEquals(normalizeBaseUrl("myapp.bubbleapps.io"), "https://myapp.bubbleapps.io");
});

Deno.test("normalizeBaseUrl: keeps a version-test / branch path", () => {
  assertEquals(
    normalizeBaseUrl("https://myapp.bubbleapps.io/version-test/"),
    "https://myapp.bubbleapps.io/version-test",
  );
});

Deno.test("normalizeBaseUrl: strips a pasted /api/1.1/... suffix", () => {
  assertEquals(
    normalizeBaseUrl("https://myapp.bubbleapps.io/version-test/api/1.1/obj/thing"),
    "https://myapp.bubbleapps.io/version-test",
  );
});

Deno.test("normalizeBaseUrl: rejects an empty URL", () => {
  assertThrows(() => normalizeBaseUrl(""));
});

Deno.test("formatTypeName: lowercases and strips spaces, per Bubble's own example", () => {
  assertEquals(formatTypeName("Rental Unit"), "rentalunit");
  assertEquals(formatTypeName("Sports Team"), "sportsteam");
  assertEquals(formatTypeName("Cake Recipe"), "cakerecipe");
});

Deno.test("formatTypeName: rejects an empty type", () => {
  assertThrows(() => formatTypeName(""));
});

Deno.test("compact: drops undefined, null and empty-string values only", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: 0, f: false }), {
    a: 1,
    e: 0,
    f: false,
  });
});

Deno.test("parseJson: passes a live object through, parses a JSON string, rejects bad JSON", () => {
  assertEquals(parseJson({ a: 1 }, "x"), { a: 1 });
  assertEquals(parseJson('{"a":1}', "x"), { a: 1 });
  assertEquals(parseJson(undefined, "x"), undefined);
  assertThrows(() => parseJson("{not json", "x"));
});

Deno.test("safeErrorMessage: reads the nested {statusCode, body:{message}} shape", () => {
  assertEquals(
    safeErrorMessage({ statusCode: 404, body: { status: "NOT_FOUND", message: "no data API" } }),
    "NOT_FOUND: no data API",
  );
});

Deno.test("safeErrorMessage: never returns anything from an error_class body (the token-echo shape)", () => {
  assertEquals(
    safeErrorMessage({
      error_class: "Unauthorized",
      message: undefined,
      body: undefined,
    } as never),
    undefined,
  );
});

Deno.test("safeErrorMessage: handles null/undefined bodies", () => {
  assertEquals(safeErrorMessage(null), undefined);
  assertEquals(safeErrorMessage(undefined), undefined);
});

Deno.test("baseUrlFromConnection: throws a clear message with no connection", () => {
  assertThrows(() => baseUrlFromConnection(undefined), Error, "reconnect it");
});

Deno.test("BubbleClient.request: throws with Bubble's message on a non-2xx response", async () => {
  const { ctx } = mockCtx(
    [{
      status: 404,
      body: { statusCode: 404, body: { status: "NOT_FOUND", message: "no such type" } },
    }],
    { display: { baseUrl: "https://x.bubbleapps.io" } },
  );
  const client = new BubbleClient(ctx);
  try {
    await client.request("/obj/nope");
    throw new Error("expected a throw");
  } catch (err) {
    if (!(err instanceof Error) || !err.message.includes("no such type")) throw err;
  }
});

Deno.test("BubbleClient.request: a 204 resolves to undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }], { display: { baseUrl: "https://x.bubbleapps.io" } });
  const client = new BubbleClient(ctx);
  assertEquals(await client.request("/obj/thing/1"), undefined);
});
