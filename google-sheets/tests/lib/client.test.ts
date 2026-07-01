import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { columnLetterToIndex, GoogleSheetsClient } from "../../lib/client.ts";

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const client = new GoogleSheetsClient(ctx);
  const result = await client.request("/spreadsheets/x");
  assertEquals(result, undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 404, statusText: "Not Found", body: '{"error":"NOT_FOUND"}' },
  ]);
  const client = new GoogleSheetsClient(ctx);
  const err = await assertRejects(
    () => client.request("/spreadsheets/missing"),
    Error,
    "Google Sheets 404",
  );
  assertEquals(err.message.includes("/v4/spreadsheets/missing"), true);
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new GoogleSheetsClient(ctx);
  await client.request("/x", {
    query: { a: "kept", b: undefined, c: null, d: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});

Deno.test("client: routes /drive/... paths to www.googleapis.com", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const client = new GoogleSheetsClient(ctx);
  await client.request("/drive/v3/files/abc", { method: "DELETE" });
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://www.googleapis.com");
  assertEquals(url.pathname, "/drive/v3/files/abc");
  assertEquals(calls[0].method, "DELETE");
});

Deno.test("client: JSON body sets content-type and stringifies", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const client = new GoogleSheetsClient(ctx);
  await client.request("/spreadsheets", { method: "POST", body: { a: 1 } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"a":1}');
});

Deno.test("columnLetterToIndex: A=0, Z=25, AA=26, AZ=51", () => {
  assertEquals(columnLetterToIndex("A"), 0);
  assertEquals(columnLetterToIndex("Z"), 25);
  assertEquals(columnLetterToIndex("AA"), 26);
  assertEquals(columnLetterToIndex("AZ"), 51);
});

Deno.test("columnLetterToIndex: rejects non-letter input", () => {
  assertThrows(() => columnLetterToIndex("A1"), Error, "Invalid column letter");
});
