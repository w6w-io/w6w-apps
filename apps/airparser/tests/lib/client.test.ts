import { assertEquals, assertRejects } from "@std/assert";
import { AirparserClient, compact, formatAirparserError, truncate } from "../../lib/client.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("client: GET request builds the right URL and query", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { ok: true } }]);
  const client = new AirparserClient(ctx);
  await client.request("/inboxes", { query: { page: 2, q: "" as string, empty: undefined } });
  assertEquals(pathOf(calls[0].url), "/inboxes");
  assertEquals(queryOf(calls[0].url), { page: "2" });
});

Deno.test("client: array query values are sent as repeated keys", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  const client = new AirparserClient(ctx);
  await client.request("/inboxes/abc/docs", { query: { status: ["parsed", "fail"] } });
  assertEquals(queryOf(calls[0].url), { status: ["parsed", "fail"] });
});

Deno.test("client: JSON body carries content-type application/json", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { _id: "in_1" } }]);
  const client = new AirparserClient(ctx);
  await client.request("/inboxes/create", { method: "POST", body: { name: "Invoices" } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ name: "Invoices" }));
});

Deno.test("client: FormData body leaves content-type to fetch", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { doc_id: "d1" } }]);
  const client = new AirparserClient(ctx);
  const form = new FormData();
  form.append("file", new Blob(["hi"]), "hi.txt");
  await client.request("/inboxes/abc/upload", { method: "POST", form });
  assertEquals(calls[0].isFormData, true);
  assertEquals(calls[0].headers["content-type"], undefined);
});

Deno.test("client: a 204 with no body resolves to undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const client = new AirparserClient(ctx);
  const result = await client.request("/inboxes/abc");
  assertEquals(result, undefined);
});

Deno.test("client: a non-ok response throws a formatted error, not a raw Response", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody(401, "Unauthorized") }]);
  const client = new AirparserClient(ctx);
  await assertRejects(
    () => client.request("/inboxes"),
    Error,
    "Airparser 401 for GET /inboxes: Unauthorized",
  );
});

Deno.test("client: an array `message` (validation errors) is joined, not [object Object]", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: errorBody(400, ["name must not be empty"] as unknown as string, "Bad Request"),
  }]);
  const client = new AirparserClient(ctx);
  await assertRejects(
    () => client.request("/inboxes/create", { method: "POST", body: {} }),
    Error,
    "name must not be empty",
  );
});

Deno.test("formatAirparserError: falls back to raw text when the body is not JSON", () => {
  const msg = formatAirparserError(500, "GET", "/inboxes", "<html>gateway timeout</html>");
  assertEquals(msg, "Airparser 500 for GET /inboxes: <html>gateway timeout</html>");
});

Deno.test("truncate: leaves short text alone, truncates long text with a byte count", () => {
  assertEquals(truncate("short"), "short");
  const long = "x".repeat(700);
  const out = truncate(long, 600);
  assertEquals(out.startsWith("x".repeat(600)), true);
  assertEquals(out.endsWith("(700 bytes truncated)"), true);
});

Deno.test("compact: drops undefined/null/empty-string, keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: false, e: 0, f: "x" },
  );
});
