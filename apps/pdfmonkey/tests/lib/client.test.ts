import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { PdfMonkeyClient } from "../../lib/client.ts";

Deno.test("client: throws a descriptive Error on an errors array (401-shaped)", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      statusText: "Unauthorized",
      body: {
        errors: [{
          status: "401",
          title: "Unauthorized",
          detail: "We were unable to authenticate you.",
        }],
      },
    },
  ]);
  const client = new PdfMonkeyClient(ctx);
  const err = await assertRejects(
    () => client.request("/current_user"),
    Error,
    "PDFMonkey 401",
  );
  assertEquals(err.message.includes("We were unable to authenticate you."), true);
});

Deno.test("client: throws a descriptive Error on an errors object (422-shaped)", async () => {
  const { ctx } = mockCtx([
    { status: 422, body: { errors: { document_template_id: ["can't be blank"] } } },
  ]);
  const client = new PdfMonkeyClient(ctx);
  const err = await assertRejects(
    () => client.request("/documents", { method: "POST" }),
    Error,
    "PDFMonkey 422",
  );
  assertEquals(err.message.includes("document_template_id can't be blank"), true);
});

Deno.test("client: 204 responses resolve to undefined with no body read", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const client = new PdfMonkeyClient(ctx);
  const result = await client.request("/documents/doc-1", { method: "DELETE" });
  assertEquals(result, undefined);
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { document_cards: [] } }]);
  const client = new PdfMonkeyClient(ctx);
  await client.request("/document_cards", {
    query: { a: "kept", b: undefined, c: null, d: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});

Deno.test("client: JSON body sets content-type and serializes", async () => {
  const { ctx, calls } = mockCtx([{ body: { document: { id: "doc-1" } } }]);
  const client = new PdfMonkeyClient(ctx);
  await client.request("/documents", {
    method: "POST",
    body: { document: { document_template_id: "tpl-1" } },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { document: { document_template_id: "tpl-1" } });
});

Deno.test("client: passes an absolute URL through unchanged", async () => {
  const { ctx, calls } = mockCtx([{ body: { document: {} } }]);
  const client = new PdfMonkeyClient(ctx);
  await client.request("https://example.internal/foo?x=1");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://example.internal");
  assertEquals(url.pathname, "/foo");
});

Deno.test("client: non-JSON responses returned as text", async () => {
  const { ctx } = mockCtx([
    { body: "plain text body", headers: { "content-type": "text/plain" } },
  ]);
  const client = new PdfMonkeyClient(ctx);
  const result = await client.request("/document_cards");
  assertEquals(result, "plain text body");
});
