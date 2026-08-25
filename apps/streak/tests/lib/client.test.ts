import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  asOptionalJson,
  compact,
  encodeId,
  formatStreakError,
  StreakClient,
  toJsonString,
} from "../../lib/client.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("compact: drops undefined, null and empty-string values", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }), {
    a: 1,
    e: false,
    f: 0,
  });
});

Deno.test("encodeId: escapes a slash so it cannot break out of a path segment", () => {
  assertEquals(encodeId("a/../b"), "a%2F..%2Fb");
});

Deno.test("asOptionalJson: passes through a non-string value unchanged", () => {
  assertEquals(asOptionalJson({ a: 1 }, "x"), { a: 1 });
});

Deno.test("asOptionalJson: parses a JSON string", () => {
  assertEquals(asOptionalJson('{"a":1}', "x"), { a: 1 });
});

Deno.test("asOptionalJson: undefined/null/empty all pass through as undefined", () => {
  assertEquals(asOptionalJson(undefined, "x"), undefined);
  assertEquals(asOptionalJson(null, "x"), undefined);
  assertEquals(asOptionalJson("", "x"), undefined);
});

Deno.test("asOptionalJson: an invalid JSON string throws, naming the field", () => {
  let message = "";
  try {
    asOptionalJson("{not json", "fields");
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "fields is not valid JSON");
});

Deno.test("toJsonString: re-encodes an object, and passes a string through unchanged", () => {
  assertEquals(toJsonString({ a: 1 }), '{"a":1}');
  assertEquals(toJsonString("already a string"), "already a string");
  assertEquals(toJsonString(undefined), undefined);
});

Deno.test("formatStreakError: surfaces the vendor's own free-text error verbatim", () => {
  const msg = formatStreakError(400, "POST", "/pipelines/x", JSON.stringify({ error: "bad key" }));
  assert(msg.includes("400"));
  assert(msg.includes("bad key"));
});

Deno.test("formatStreakError: an empty body still names the status and path", () => {
  const msg = formatStreakError(400, "DELETE", "/pipelines/x", "{}");
  assert(msg.includes("400"));
  assert(msg.includes("/pipelines/x"));
});

Deno.test("StreakClient.get: builds the URL and unwraps a plain JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "Hiring" } }]);
  const out = await new StreakClient(ctx).get<{ name: string }>("/pipelines/x");
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v1/pipelines/x");
  assertEquals(out.name, "Hiring");
});

Deno.test("StreakClient.get: query values are compacted before being sent", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await new StreakClient(ctx).get("/pipelines", { sortBy: undefined, limit: 5 });
  assertEquals(queryOf(calls[0].url), { limit: "5" });
});

Deno.test("StreakClient.sendJson: sends a JSON content-type and body", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "x" } }]);
  await new StreakClient(ctx).sendJson("POST", "/pipelines/x", { name: "x" });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { name: "x" });
});

Deno.test("StreakClient.putForm: sends a form-urlencoded body, not JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "x", key: "5001" } }]);
  await new StreakClient(ctx).putForm("/pipelines/x/stages", { name: "x" });
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(calls[0].body, "name=x");
});

Deno.test("StreakClient.putForm: drops unset fields rather than sending them empty", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new StreakClient(ctx).putForm("/pipelines", { name: "x", teamWide: undefined });
  assertEquals(calls[0].body, "name=x");
});

Deno.test("StreakClient.del: returns the {success} envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  const out = await new StreakClient(ctx).del("/pipelines/x");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { success: true });
});

Deno.test("StreakClient: a non-ok response throws with the vendor's error surfaced", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: "boom" } }]);
  const err = await assertRejects(() => new StreakClient(ctx).get("/pipelines/x"), Error);
  assert(err.message.includes("boom"), err.message);
});

Deno.test("StreakClient: a 204/empty body resolves to undefined rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 200, body: undefined }]);
  const out = await new StreakClient(ctx).get("/pipelines/x");
  assertEquals(out, undefined);
});
