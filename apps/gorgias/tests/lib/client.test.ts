import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx, mockGorgiasCtx } from "../_helpers.ts";
import {
  baseUrl,
  basicHeader,
  csv,
  domainFromConnection,
  GorgiasClient,
  unset,
} from "../../lib/client.ts";

Deno.test("client: builds the URL from the connection's domain, not a param", async () => {
  const { ctx, calls } = mockGorgiasCtx([{ body: { id: 1 } }], "acme");
  await new GorgiasClient(ctx).request("/tickets/1");
  assertEquals(calls[0].url, "https://acme.gorgias.com/api/tickets/1");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("client: fails loudly when the connection carries no domain", () => {
  const { ctx } = mockCtx();
  assertThrows(() => new GorgiasClient(ctx), Error, "no domain");
});

Deno.test("client: surfaces Gorgias's own error message, not just the status", async () => {
  const { ctx } = mockGorgiasCtx([{
    status: 400,
    statusText: "Bad Request",
    body: '{"error":{"msg":"subject is required"}}',
  }]);
  await assertRejects(
    () => new GorgiasClient(ctx).request("/tickets", { method: "POST", body: {} }),
    Error,
    "subject is required",
  );
});

Deno.test("client: falls back to the raw body when the error isn't JSON", async () => {
  const { ctx } = mockGorgiasCtx([{ status: 500, body: "internal error" }]);
  await assertRejects(
    () => new GorgiasClient(ctx).request("/tickets/1"),
    Error,
    "internal error",
  );
});

Deno.test("client: returns undefined for a 204", async () => {
  const { ctx } = mockGorgiasCtx([{ status: 204 }]);
  assertEquals(
    await new GorgiasClient(ctx).request("/tickets/1", { method: "DELETE" }),
    undefined,
  );
});

Deno.test("domainFromConnection: reads the display data afterConnect records", () => {
  assertEquals(
    domainFromConnection({ display: { domain: "acme" } } as never),
    "acme",
  );
  assertThrows(() => domainFromConnection(undefined), Error, "no domain");
});

Deno.test("baseUrl: builds the per-account host", () => {
  assertEquals(baseUrl("acme"), "https://acme.gorgias.com/api");
});

Deno.test("basicHeader: base64s email:apiKey", () => {
  assertEquals(basicHeader("jo@acme.test", "tok"), `Basic ${btoa("jo@acme.test:tok")}`);
});

Deno.test("csv/unset behave as the other apps' helpers do", () => {
  assertEquals(csv("a, b"), ["a", "b"]);
  assertEquals(csv(""), undefined);
  assertEquals(unset(""), undefined);
  assertEquals(unset("x"), "x");
});
