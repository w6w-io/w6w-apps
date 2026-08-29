import { assertEquals, assertRejects } from "@std/assert";
import {
  compact,
  DialpadClient,
  encodeId,
  formatDialpadError,
  stripSignatureSecret,
  stripSignatureSecretFromPage,
  truncate,
} from "../../lib/client.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("compact: drops undefined, null and empty-string values but keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});

Deno.test("truncate: leaves short text alone", () => {
  assertEquals(truncate("hi"), "hi");
});

Deno.test("truncate: caps long text and says how much was cut", () => {
  const out = truncate("a".repeat(700), 10);
  assertEquals(out.startsWith("a".repeat(10)), true);
  assertEquals(out.includes("700 bytes truncated"), true);
});

Deno.test("encodeId: escapes a slash so it can't smuggle a path segment", () => {
  assertEquals(encodeId("a/b"), "a%2Fb");
});

Deno.test("encodeId: passes 'me' through untouched", () => {
  assertEquals(encodeId("me"), "me");
});

interface SignedFixture {
  id: string;
  signature: { algo: string; secret?: string; type: string };
}

Deno.test("stripSignatureSecret: removes secret, keeps algo and type", () => {
  const out = stripSignatureSecret<SignedFixture>({
    id: "1",
    signature: { algo: "HS256", secret: "test_secret", type: "jwt" },
  });
  assertEquals(out, { id: "1", signature: { algo: "HS256", type: "jwt" } });
});

Deno.test("stripSignatureSecret: a no-op on an entity with no signature", () => {
  assertEquals(stripSignatureSecret({ id: "1" }), { id: "1" });
});

Deno.test("stripSignatureSecret: passes non-objects through unchanged", () => {
  assertEquals(stripSignatureSecret(null), null);
  assertEquals(stripSignatureSecret(undefined), undefined);
  assertEquals(stripSignatureSecret("x" as unknown), "x");
});

Deno.test("stripSignatureSecretFromPage: strips every item, keeps the cursor", () => {
  const out = stripSignatureSecretFromPage<{ id: string; signature: { secret?: string; algo: string } }>({
    cursor: "next",
    items: [
      { id: "1", signature: { secret: "s1", algo: "HS256" } },
      { id: "2", signature: { secret: "s2", algo: "HS256" } },
    ],
  });
  assertEquals(out.cursor, "next");
  assertEquals(out.items, [
    { id: "1", signature: { algo: "HS256" } },
    { id: "2", signature: { algo: "HS256" } },
  ]);
});

Deno.test("formatDialpadError: reads Dialpad's Google-API-shaped error body", () => {
  const raw = JSON.stringify(errorBody(401, "A valid API key must be provided."));
  const msg = formatDialpadError(401, "GET", "/api/v2/offices", raw);
  assertEquals(msg.includes("Dialpad 401"), true);
  assertEquals(msg.includes("A valid API key must be provided."), true);
  assertEquals(msg.includes("reason: required"), true);
});

Deno.test("formatDialpadError: falls back to the raw body when it is not JSON", () => {
  const msg = formatDialpadError(500, "GET", "/api/v2/offices", "<html>oops</html>");
  assertEquals(msg.includes("Dialpad 500"), true);
  assertEquals(msg.includes("<html>oops</html>"), true);
});

Deno.test("DialpadClient.json: builds the URL under the API prefix and parses the body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1", name: "Acme" } }]);
  const out = await new DialpadClient(ctx).json<{ id: string; name: string }>("/offices/1");
  assertEquals(pathOf(calls[0].url), "/api/v2/offices/1");
  assertEquals(out, { id: "1", name: "Acme" });
});

Deno.test("DialpadClient.json: sends a JSON body with content-type when one is given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1" } }]);
  await new DialpadClient(ctx).json("/rooms", { method: "POST", body: { name: "Blackcomb" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { name: "Blackcomb" });
});

Deno.test("DialpadClient.json: drops undefined/null/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { cursor: null, items: [] } }]);
  await new DialpadClient(ctx).json("/offices", {
    query: { active_only: undefined, cursor: "", office_id: 5 },
  });
  const q = new URL(calls[0].url).search;
  assertEquals(q, "?office_id=5");
});

Deno.test("DialpadClient.json: a 401 throws with Dialpad's own message", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody(401, "A valid API key must be provided.") },
  ]);
  await assertRejects(
    () => new DialpadClient(ctx).json("/offices"),
    Error,
    "A valid API key must be provided.",
  );
});

Deno.test("DialpadClient.status: returns the status without requiring a JSON body", async () => {
  const { ctx } = mockCtx([{ status: 200, body: undefined }]);
  const status = await new DialpadClient(ctx).status("/callrouters/1", { method: "DELETE" });
  assertEquals(status, 200);
});
