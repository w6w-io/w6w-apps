import { assert, assertEquals, assertRejects } from "@std/assert";
import { compact, formatPinterestError, PinterestClient, toCommaList } from "../../lib/client.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("compact: drops undefined/null/empty-string, keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "keep" }),
    { d: false, e: 0, f: "keep" },
  );
});

Deno.test("toCommaList: joins an array and normalizes a string input", () => {
  assertEquals(toCommaList(["a", "b"]), "a,b");
  assertEquals(toCommaList("a, b"), "a,b");
  assertEquals(toCommaList(undefined), undefined);
  assertEquals(toCommaList(""), undefined);
});

Deno.test("formatPinterestError: surfaces the vendor's code and message", () => {
  const msg = formatPinterestError(
    401,
    "GET",
    "/user_account",
    JSON.stringify(errorBody(2, "Authentication failed.")),
  );
  assert(msg.includes("401"));
  assert(msg.includes("code 2"));
  assert(msg.includes("Authentication failed."));
});

Deno.test("formatPinterestError: falls back to the raw body when it is not JSON", () => {
  const msg = formatPinterestError(500, "GET", "/pins", "<html>oops</html>");
  assert(msg.includes("500"));
  assert(msg.includes("<html>oops</html>"));
});

Deno.test("formatPinterestError: notes the no-headroom-header fact on 429", () => {
  const msg = formatPinterestError(
    429,
    "POST",
    "/pins",
    JSON.stringify(errorBody(8, "Too many requests")),
  );
  assert(msg.toLowerCase().includes("backoff"));
});

Deno.test("PinterestClient.json: hits the v5 base and parses the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  const out = await new PinterestClient(ctx).json<{ id: string }>("/pins/1");
  assertEquals(pathOf(calls[0].url), "/v5/pins/1");
  assertEquals(out.id, "1");
});

Deno.test("PinterestClient.json: returns undefined on a 204 with no body", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const out = await new PinterestClient(ctx).json("/pins/1");
  assertEquals(out, undefined);
});

Deno.test("PinterestClient: throws a formatted error on a non-2xx response", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(2, "Board not found.") }]);
  await assertRejects(
    () => new PinterestClient(ctx).json("/boards/999"),
    Error,
    "Board not found.",
  );
});

Deno.test("PinterestClient: sends content-type application/json only when a body is present", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }, { status: 204 }]);
  await new PinterestClient(ctx).json("/boards", { method: "POST", body: { name: "x" } });
  await new PinterestClient(ctx).status("/boards/1", { method: "DELETE" });

  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[1].headers["content-type"], undefined);
});

Deno.test("PinterestClient: drops empty/undefined query values but keeps everything else", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await new PinterestClient(ctx).json("/pins", {
    query: { pin_filter: undefined, domain: "", include_protected_pins: false, bookmark: "abc" },
  });
  const q = new URL(calls[0].url).searchParams;
  assert(!q.has("pin_filter"));
  assert(!q.has("domain"));
  assertEquals(q.get("include_protected_pins"), "false");
  assertEquals(q.get("bookmark"), "abc");
});
