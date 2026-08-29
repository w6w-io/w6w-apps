import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  asOptionalJson,
  compact,
  formatMissiveError,
  joinIds,
  MissiveClient,
  toIdList,
  unwrapSingle,
} from "../../lib/client.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("compact: drops undefined, null and empty string but keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: false, e: 0, f: "x" },
  );
});

Deno.test("toIdList: accepts a real array or a comma-separated string", () => {
  assertEquals(toIdList(["a", " b ", ""]), ["a", "b"]);
  assertEquals(toIdList("a, b ,c"), ["a", "b", "c"]);
  assertEquals(toIdList(undefined), []);
  assertEquals(toIdList(""), []);
});

Deno.test("joinIds: comma-joins and URL-encodes, throws on empty", () => {
  assertEquals(joinIds("id one,id two"), "id%20one,id%20two");
  assertThrows(() => joinIds(""), Error, "at least one id");
});

Deno.test("asOptionalJson: parses a JSON string, passes through a non-string, rejects invalid JSON", () => {
  assertEquals(asOptionalJson('{"a":1}', "x"), { a: 1 });
  assertEquals(asOptionalJson({ a: 1 }, "x"), { a: 1 });
  assertEquals(asOptionalJson(undefined, "x"), undefined);
  assertEquals(asOptionalJson("", "x"), undefined);
  assertThrows(() => asOptionalJson("{not json", "x"), Error, "not valid JSON");
});

Deno.test("unwrapSingle: array returns first element, object passes through", () => {
  assertEquals(unwrapSingle([{ id: 1 }, { id: 2 }]), { id: 1 });
  assertEquals(unwrapSingle({ id: 1 }), { id: 1 });
  assertEquals(unwrapSingle(undefined), undefined);
});

Deno.test("formatMissiveError: surfaces the vendor's own message verbatim", () => {
  const msg = formatMissiveError(
    401,
    "GET",
    "/v1/organizations",
    JSON.stringify({ error: { message: "Authentication token is invalid or has been revoked" } }),
  );
  assert(msg.includes("Authentication token is invalid or has been revoked"));
  assert(msg.includes("401"));
});

Deno.test("formatMissiveError: falls back to the raw body when it isn't JSON", () => {
  const msg = formatMissiveError(500, "POST", "/v1/drafts", "internal server error");
  assert(msg.includes("internal server error"));
});

Deno.test("formatMissiveError: includes the retry delay on a 429", () => {
  const msg = formatMissiveError(
    429,
    "GET",
    "/v1/contacts",
    JSON.stringify(errorBody("slow down")),
    "12",
  );
  assert(msg.includes("retry after 12s"));
});

Deno.test("MissiveClient: builds the full URL with the /v1 prefix and query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { contacts: [] } }]);
  await new MissiveClient(ctx).json("/contacts", { query: { limit: 10, offset: 0 } });
  assertEquals(calls[0].url, "https://public.missiveapp.com/v1/contacts?limit=10&offset=0");
  assertEquals(pathOf(calls[0].url), "/v1/contacts");
  assertEquals(queryOf(calls[0].url), { limit: "10", offset: "0" });
});

Deno.test("MissiveClient: sends a JSON content-type only when there's a body", async () => {
  const { ctx, calls } = mockCtx([{ body: { contacts: [] } }, { status: 204 }]);
  await new MissiveClient(ctx).json("/contacts", { method: "POST", body: { contacts: [{}] } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  await new MissiveClient(ctx).status("/drafts/x", { method: "DELETE" });
  assertEquals(calls[1].headers["content-type"], undefined);
});

Deno.test("MissiveClient: throws a formatted error on a non-ok response", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody("Authentication token is invalid or has been revoked") },
  ]);
  await assertRejectsMessage(
    () => new MissiveClient(ctx).json("/organizations"),
    "Authentication token is invalid or has been revoked",
  );
});

Deno.test("MissiveClient: status() returns the HTTP status for a body-less delete", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const status = await new MissiveClient(ctx).status("/drafts/abc", { method: "DELETE" });
  assertEquals(status, 204);
});

async function assertRejectsMessage(fn: () => Promise<unknown>, substr: string) {
  try {
    await fn();
    throw new Error("expected rejection");
  } catch (e) {
    assert((e as Error).message.includes(substr), (e as Error).message);
  }
}
