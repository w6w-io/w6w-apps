import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  formatMoneybirdError,
  jsonArray,
  MoneybirdClient,
  resolveAdministrationId,
} from "../../lib/client.ts";
import { mockCtx, mockMoneybirdCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("formatMoneybirdError: renders a symbolic_error with its symbolic detail", () => {
  const raw = JSON.stringify({
    error: "access token revoked",
    symbolic: { request: "invalid_grant" },
  });
  const msg = formatMoneybirdError(401, "GET", "/administrations.json", raw);
  assertEquals(
    msg,
    "Moneybird 401 for GET /administrations.json: access token revoked (request: invalid_grant)",
  );
});

Deno.test("formatMoneybirdError: renders a symbolic_error with no symbolic block", () => {
  const raw = JSON.stringify({ error: "Record not found for model name: Contact" });
  const msg = formatMoneybirdError(404, "GET", "/123/contacts/9", raw);
  assertEquals(
    msg,
    "Moneybird 404 for GET /123/contacts/9: Record not found for model name: Contact",
  );
});

Deno.test("formatMoneybirdError: renders a non_symbolic_error's per-field validation messages", () => {
  const raw = JSON.stringify({
    error: { company_name: ["can't be blank"], tax_number: ["is invalid"] },
  });
  const msg = formatMoneybirdError(422, "POST", "/123/contacts", raw);
  assertEquals(
    msg,
    "Moneybird 422 for POST /123/contacts: company_name can't be blank; tax_number is invalid",
  );
});

Deno.test("formatMoneybirdError: falls back to the raw body when it is not JSON", () => {
  const msg = formatMoneybirdError(500, "GET", "/123/contacts", "<html>oops</html>");
  assertEquals(msg, "Moneybird 500 for GET /123/contacts: <html>oops</html>");
});

Deno.test("jsonArray: parses a JSON string and passes an array through", () => {
  assertEquals(jsonArray('[{"description":"x"}]', "lineItems"), [{ description: "x" }]);
  assertEquals(jsonArray([{ a: 1 }], "lineItems"), [{ a: 1 }]);
  assertEquals(jsonArray(undefined, "lineItems"), []);
});

Deno.test("jsonArray: rejects a non-array", () => {
  assertThrows(() => jsonArray({ a: 1 }, "lineItems"), Error, "must be a JSON array");
});

Deno.test("resolveAdministrationId: prefers an explicit override over the connection's default", () => {
  const { ctx } = mockMoneybirdCtx([], { administrationId: "111" });
  assertEquals(resolveAdministrationId(ctx, "222"), "222");
});

Deno.test("resolveAdministrationId: falls back to the connection's resolved administration", () => {
  const { ctx } = mockMoneybirdCtx([], { administrationId: "111" });
  assertEquals(resolveAdministrationId(ctx), "111");
});

Deno.test("resolveAdministrationId: throws when neither is available", () => {
  const { ctx } = mockCtx();
  assertThrows(
    () => resolveAdministrationId(ctx),
    Error,
    "No Moneybird administration_id resolved",
  );
});

Deno.test("MoneybirdClient.request: builds .json path under the administration and unwraps JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1" } }]);
  const client = new MoneybirdClient(ctx, "123");
  const out = await client.request("/contacts/c1", { query: { include_archived: false } });
  assertEquals(pathOf(calls[0].url), "/api/v2/123/contacts/c1.json");
  // `false` is a meaningful value for this query param; the client drops only
  // undefined/null/"".
  assertEquals(queryOf(calls[0].url), { include_archived: "false" });
  assertEquals(out, { id: "c1" });
});

Deno.test("MoneybirdClient.request: sends a JSON body with content-type on POST", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "c1" } }]);
  await new MoneybirdClient(ctx, "123").request("/contacts", {
    method: "POST",
    body: { contact: { company_name: "Acme" } },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { contact: { company_name: "Acme" } });
});

Deno.test("MoneybirdClient.request: throws the formatted error on a non-2xx response", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: "record not found" } }]);
  const err = await assertRejects(
    () => Promise.resolve(new MoneybirdClient(ctx, "123").request("/contacts/9")),
    Error,
  );
  assertEquals(err.message.includes("record not found"), true, err.message);
});

Deno.test("MoneybirdClient.redirectLocation: returns the Location header on a 302", async () => {
  const { ctx, calls } = mockCtx([{
    status: 302,
    headers: { location: "https://moneybird-storage:3100/abc/def/download" },
  }]);
  const url = await new MoneybirdClient(ctx, "123").redirectLocation(
    "/sales_invoices/9/download_pdf",
  );
  assertEquals(url, "https://moneybird-storage:3100/abc/def/download");
  assertEquals(pathOf(calls[0].url), "/api/v2/123/sales_invoices/9/download_pdf.json");
});

Deno.test("MoneybirdClient.redirectLocation: throws when the response is not a 302", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: "record not found" } }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        new MoneybirdClient(ctx, "123").redirectLocation("/sales_invoices/9/download_pdf"),
      ),
    Error,
  );
  assertEquals(err.message.includes("expected a 302 redirect"), true, err.message);
});
