import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { buildLocation, extractDocumentId, GoogleDocsClient } from "../../lib/client.ts";

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const client = new GoogleDocsClient(ctx);
  const result = await client.request("/documents/x");
  assertEquals(result, undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 404, statusText: "Not Found", body: '{"error":"NOT_FOUND"}' },
  ]);
  const client = new GoogleDocsClient(ctx);
  const err = await assertRejects(
    () => client.request("/documents/missing"),
    Error,
    "Google Docs 404",
  );
  assertEquals(err.message.includes("/v1/documents/missing"), true);
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new GoogleDocsClient(ctx);
  await client.request("/documents/x", {
    query: { a: "kept", b: undefined, c: null, d: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});

Deno.test("client: routes /drive/... paths to www.googleapis.com", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const client = new GoogleDocsClient(ctx);
  await client.request("/drive/v3/files", { method: "POST", body: { name: "x" } });
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://www.googleapis.com");
  assertEquals(url.pathname, "/drive/v3/files");
  assertEquals(calls[0].method, "POST");
});

Deno.test("client: JSON body sets content-type and stringifies", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const client = new GoogleDocsClient(ctx);
  await client.request("/documents/x:batchUpdate", { method: "POST", body: { a: 1 } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"a":1}');
});

Deno.test("extractDocumentId: pulls ID from full docs.google.com URL", () => {
  assertEquals(
    extractDocumentId("https://docs.google.com/document/d/abc_123-XYZ/edit"),
    "abc_123-XYZ",
  );
});

Deno.test("extractDocumentId: passes through raw IDs unchanged", () => {
  assertEquals(extractDocumentId("just-an-id"), "just-an-id");
});

Deno.test("buildLocation: endOfSegment default with body -> empty segmentId", () => {
  assertEquals(buildLocation({}), { endOfSegmentLocation: { segmentId: "" } });
});

Deno.test("buildLocation: locationChoice=location includes index", () => {
  assertEquals(
    buildLocation({ locationChoice: "location", index: 5 }),
    { location: { segmentId: "", index: 5 } },
  );
});

Deno.test("buildLocation: header segment uses provided segmentId", () => {
  assertEquals(
    buildLocation({ insertSegment: "header", segmentId: "h-1" }),
    { endOfSegmentLocation: { segmentId: "h-1" } },
  );
});
