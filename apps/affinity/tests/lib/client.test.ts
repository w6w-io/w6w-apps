import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  asFieldValue,
  asJson,
  compact,
  formatAffinityError,
  toIdList,
  toStringList,
} from "../../lib/client.ts";
import { mockCtx, pathOf } from "../_helpers.ts";
import { AffinityClient } from "../../lib/client.ts";

Deno.test("compact: drops undefined, null, and empty string but keeps false/0/[]", () => {
  const out = compact({ a: undefined, b: null, c: "", d: false, e: 0, f: [], g: "keep" });
  assertEquals(out, { d: false, e: 0, f: [], g: "keep" });
});

Deno.test("toIdList: parses a comma-separated string", () => {
  assertEquals(toIdList("1, 2,3"), [1, 2, 3]);
});

Deno.test("toIdList: passes through a number array", () => {
  assertEquals(toIdList([4, 5]), [4, 5]);
});

Deno.test("toIdList: undefined/empty input yields undefined", () => {
  assertEquals(toIdList(undefined), undefined);
  assertEquals(toIdList(""), undefined);
});

Deno.test("toStringList: returns [] (not undefined) for empty input", () => {
  assertEquals(toStringList(""), []);
  assertEquals(toStringList(undefined), []);
});

Deno.test("toStringList: trims and splits a comma-separated string", () => {
  assertEquals(toStringList("a@b.com, c@d.com"), ["a@b.com", "c@d.com"]);
});

Deno.test("asJson: parses a JSON string", () => {
  assertEquals(asJson<{ x: number }>('{"x":1}', "value"), { x: 1 });
});

Deno.test("asJson: passes through an already-parsed value", () => {
  assertEquals(asJson({ x: 1 }, "value"), { x: 1 });
});

Deno.test("asJson: throws for missing input", () => {
  assertThrows(() => asJson(undefined, "value"), Error, "value is required");
});

Deno.test("asJson: throws for unparseable JSON", () => {
  assertThrows(() => asJson("{not json", "value"), Error, "not valid JSON");
});

Deno.test("asFieldValue: a plain (non-JSON) string is kept as the literal string", () => {
  assertEquals(asFieldValue("Architecture", "value"), "Architecture");
});

Deno.test("asFieldValue: a JSON-object string is parsed", () => {
  assertEquals(asFieldValue('{"city":"SF"}', "value"), { city: "SF" });
});

Deno.test("asFieldValue: a numeric dropdown option id passes through unchanged", () => {
  assertEquals(asFieldValue(2863451, "value"), 2863451);
});

Deno.test("asFieldValue: throws only for missing input, never for a non-JSON string", () => {
  assertThrows(() => asFieldValue(undefined, "value"), Error, "value is required");
});

Deno.test("formatAffinityError: falls back to raw text for a non-JSON body", () => {
  const msg = formatAffinityError(401, "GET", "/auth/whoami", "Unauthorized API Key.");
  assertEquals(msg.includes("401"), true);
  assertEquals(msg.includes("Unauthorized API Key."), true);
});

Deno.test("formatAffinityError: reads a JSON {error} body when present", () => {
  const msg = formatAffinityError(422, "POST", "/persons", JSON.stringify({ error: "bad email" }));
  assertEquals(msg.includes("bad email"), true);
});

Deno.test("formatAffinityError: appends the rate-limit hint on 429", () => {
  const msg = formatAffinityError(429, "GET", "/persons", "Too Many Requests");
  assertEquals(msg.includes("quota health check"), true);
});

Deno.test("AffinityClient.json: builds the URL and parses the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, name: "Affinity" } }]);
  const out = await new AffinityClient(ctx).json<{ id: number; name: string }>("/organizations/1");
  assertEquals(pathOf(calls[0].url), "/organizations/1");
  assertEquals(out.name, "Affinity");
});

Deno.test("AffinityClient.json: drops unset query params", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await new AffinityClient(ctx).json("/persons", { query: { term: "doe", page_size: undefined } });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("term"), "doe");
  assertEquals(url.searchParams.has("page_size"), false);
});

Deno.test("AffinityClient.delete: sends DELETE and returns {success}", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  const out = await new AffinityClient(ctx).delete("/notes/1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out.success, true);
});

Deno.test("AffinityClient: a non-JSON error body surfaces via formatAffinityError, not a parse crash", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: "Unauthorized API Key.",
    headers: { "content-type": "text/html;charset=utf-8" },
  }]);
  const err = await assertRejects(() => new AffinityClient(ctx).json("/auth/whoami"), Error);
  assertEquals(err.message.includes("Unauthorized API Key."), true, err.message);
});
