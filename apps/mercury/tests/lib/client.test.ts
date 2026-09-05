import { assertEquals, assertRejects } from "@std/assert";
import { formatMercuryError, MercuryClient, truncate } from "../../lib/client.ts";
import { mercuryErrorBody, mockCtx } from "../_helpers.ts";

Deno.test("formatMercuryError: surfaces errorCode and message from Mercury's own envelope", () => {
  const raw = JSON.stringify(mercuryErrorBody("noTokenInDB", "No matching token found"));
  const msg = formatMercuryError(401, "GET", "/accounts", raw);
  assertEquals(msg, "Mercury 401 for GET /accounts: noTokenInDB: No matching token found");
});

Deno.test("formatMercuryError: falls back to the raw body when it is not the documented envelope", () => {
  const msg = formatMercuryError(500, "GET", "/accounts", "internal server error");
  assertEquals(msg, "Mercury 500 for GET /accounts: internal server error");
});

Deno.test("truncate: leaves short text alone, truncates long text with a byte count", () => {
  assertEquals(truncate("short"), "short");
  const long = "x".repeat(900);
  const out = truncate(long);
  assertEquals(out.length < long.length, true);
  assertEquals(out.includes("900 bytes truncated"), true);
});

Deno.test("MercuryClient.json: GETs the documented base URL and parses the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { accounts: [{ id: "a1" }], page: {} } }]);
  const body = await new MercuryClient(ctx).json<{ accounts: unknown[] }>("/accounts");
  assertEquals(calls[0].url, "https://api.mercury.com/api/v1/accounts");
  assertEquals(calls[0].method, "GET");
  assertEquals(body.accounts.length, 1);
});

Deno.test("MercuryClient.json: repeats array query values as repeated params", async () => {
  const { ctx, calls } = mockCtx([{ body: { cards: [] } }]);
  await new MercuryClient(ctx).json("/cards", { query: { cardId: ["a", "b"] } });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.getAll("cardId"), ["a", "b"]);
});

Deno.test("MercuryClient.json: drops undefined/null/empty query values", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new MercuryClient(ctx).json("/accounts", {
    query: { limit: undefined, order: null as unknown as undefined, search: "" },
  });
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("MercuryClient.json: a non-ok response throws formatMercuryError's message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: mercuryErrorBody("noTokenInDB", "No matching token found"),
  }]);
  await assertRejects(
    () => new MercuryClient(ctx).json("/accounts"),
    Error,
    "noTokenInDB",
  );
});

Deno.test("MercuryClient.json: a POST sends a JSON body with the right content type", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cat_1" } }]);
  await new MercuryClient(ctx).json("/categories", { method: "POST", body: { name: "Software" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ name: "Software" }));
});

Deno.test("MercuryClient.raw: requests accept */* and returns the raw Response", async () => {
  const { ctx, calls } = mockCtx([{
    body: "PDF-BYTES",
    headers: { "content-type": "application/pdf" },
  }]);
  const res = await new MercuryClient(ctx).raw("/statements/s1/pdf");
  assertEquals(calls[0].headers["accept"], "*/*");
  assertEquals(await res.text(), "PDF-BYTES");
});
