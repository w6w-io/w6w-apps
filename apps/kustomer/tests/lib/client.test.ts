import { assertEquals, assertRejects } from "@std/assert";
import { mockKustomerCtx } from "../_helpers.ts";
import {
  compact,
  csv,
  domainFromConnection,
  formatKustomerError,
  KustomerClient,
  unset,
} from "../../lib/client.ts";

Deno.test("baseUrl: builds the per-org host with the /v1 prefix", async () => {
  const { ctx, calls } = mockKustomerCtx([{ body: { data: { id: "1" } } }], "acme");
  await new KustomerClient(ctx).data("/customers/1");
  assertEquals(calls[0].url, "https://acme.api.kustomerapp.com/v1/customers/1");
});

Deno.test("domainFromConnection: throws when the connection carries no org subdomain", () => {
  let threw = false;
  try {
    domainFromConnection({
      id: "c",
      app: "a",
      auth: "a",
      owner: "u",
      state: "connected",
      createdAt: "2026-01-01T00:00:00.000Z",
      display: {},
    });
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

Deno.test("KustomerClient.data: unwraps the {data} envelope", async () => {
  const { ctx } = mockKustomerCtx([{ body: { data: { id: "1", type: "customer" } } }]);
  const out = await new KustomerClient(ctx).data("/customers/1");
  assertEquals(out, { id: "1", type: "customer" });
});

Deno.test("KustomerClient.json: returns the envelope untouched (meta/links preserved)", async () => {
  const { ctx } = mockKustomerCtx([{ body: { data: [{ id: "1" }], meta: { page: 1 } } }]);
  const out = await new KustomerClient(ctx).json("/customers");
  assertEquals(out, { data: [{ id: "1" }], meta: { page: 1 } });
});

Deno.test("KustomerClient: drops empty query params", async () => {
  const { ctx, calls } = mockKustomerCtx([{ body: { data: [] } }]);
  await new KustomerClient(ctx).json("/customers", {
    query: { page: 1, pageSize: undefined, sort: "" },
  });
  assertEquals(calls[0].url, "https://acme.api.kustomerapp.com/v1/customers?page=1");
});

Deno.test("KustomerClient: sends a JSON content-type by default, overridable per call", async () => {
  const { ctx, calls } = mockKustomerCtx([{ body: { data: {} } }, { body: { data: {} } }]);
  const client = new KustomerClient(ctx);
  await client.data("/customers", { method: "POST", body: { name: "Jo" } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  await client.data("/conversations/1", {
    method: "PATCH",
    contentType: "application/json-patch+json",
    body: { status: "done" },
  });
  assertEquals(calls[1].headers["content-type"], "application/json-patch+json");
});

Deno.test("KustomerClient: a non-2xx response throws with the vendor's error code and message", async () => {
  const { ctx } = mockKustomerCtx([
    { status: 400, body: { errors: [{ code: "bad_request", message: "Invalid body" }] } },
  ]);
  await assertRejects(
    () => new KustomerClient(ctx).data("/customers", { method: "POST", body: {} }),
    Error,
    "bad_request: Invalid body",
  );
});

Deno.test("formatKustomerError: falls back to the raw body when it isn't the documented shape", () => {
  const msg = formatKustomerError(500, "GET", "/customers", "<html>oops</html>");
  assertEquals(msg, "Kustomer 500 for GET /customers: <html>oops</html>");
});

Deno.test("compact: drops undefined, null and empty-string values", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: "x" }), { a: 1, e: "x" });
});

Deno.test("unset: treats a blank string as absent", () => {
  assertEquals(unset(""), undefined);
  assertEquals(unset("x"), "x");
});

Deno.test("csv: splits and trims a comma-separated field", () => {
  assertEquals(csv("a, b ,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
  assertEquals(csv(undefined), undefined);
});
