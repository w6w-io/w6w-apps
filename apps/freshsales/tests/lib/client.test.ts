import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx, mockFreshsalesCtx } from "../_helpers.ts";
import {
  baseUrl,
  compact,
  customField,
  domainFromConnection,
  FreshsalesClient,
  unset,
  unwrap,
} from "../../lib/client.ts";

Deno.test("client: builds the URL from the connection's domain, not a param", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{ body: { contact: { id: 1 } } }], "acme");
  await new FreshsalesClient(ctx).request("/contacts/1");
  assertEquals(calls[0].url, "https://acme.myfreshworks.com/crm/sales/api/contacts/1");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("client: fails loudly when the connection carries no domain", () => {
  const { ctx } = mockCtx();
  assertThrows(() => new FreshsalesClient(ctx), Error, "no domain");
});

Deno.test("client: surfaces Freshsales's error body", async () => {
  const { ctx } = mockFreshsalesCtx([{
    status: 400,
    statusText: "Bad Request",
    body: '{"errors":{"code":"400","message":"Email is invalid"}}',
  }]);
  await assertRejects(
    () => new FreshsalesClient(ctx).request("/contacts", { method: "POST", body: {} }),
    Error,
    "Email is invalid",
  );
});

Deno.test("client: a delete's bare `true` body parses fine, no unwrap needed", async () => {
  const { ctx } = mockFreshsalesCtx([{ body: "true" }]);
  assertEquals(
    await new FreshsalesClient(ctx).request("/contacts/1", { method: "DELETE" }),
    true,
  );
});

Deno.test("client: returns undefined for a 204", async () => {
  const { ctx } = mockFreshsalesCtx([{ status: 204 }]);
  assertEquals(
    await new FreshsalesClient(ctx).request("/contacts/1", { method: "DELETE" }),
    undefined,
  );
});

Deno.test("client.resource: unwraps the singular resource key", async () => {
  const { ctx } = mockFreshsalesCtx([{ body: { contact: { id: 1, first_name: "James" } } }]);
  assertEquals(
    await new FreshsalesClient(ctx).resource("contact", "/contacts/1"),
    { id: 1, first_name: "James" },
  );
});

Deno.test("client.list: unwraps the plural key and reads meta.total", async () => {
  const { ctx } = mockFreshsalesCtx([{ body: { contacts: [{ id: 1 }], meta: { total: 1 } } }]);
  assertEquals(
    await new FreshsalesClient(ctx).list("contacts", "/contacts/view/3"),
    { items: [{ id: 1 }], total: 1 },
  );
});

Deno.test("client.list: defaults to an empty array when the key is absent", async () => {
  const { ctx } = mockFreshsalesCtx([{ body: { meta: { total: 0 } } }]);
  assertEquals(
    await new FreshsalesClient(ctx).list("contacts", "/contacts/view/3"),
    { items: [], total: 0 },
  );
});

Deno.test("unwrap: falls back to the raw payload when the key is absent", () => {
  assertEquals(unwrap({ id: 1 }, "contact"), { id: 1 });
  assertEquals(unwrap({ contact: { id: 1 } }, "contact"), { id: 1 });
});

Deno.test("domainFromConnection: reads the display data afterConnect records", () => {
  assertEquals(
    domainFromConnection({ display: { domain: "acme" } } as never),
    "acme",
  );
  assertThrows(() => domainFromConnection(undefined), Error, "no domain");
});

Deno.test("baseUrl: builds the per-account host under /crm/sales/api", () => {
  assertEquals(baseUrl("acme"), "https://acme.myfreshworks.com/crm/sales/api");
});

Deno.test("customField: accepts the flat map, as a string or object", () => {
  assertEquals(customField({ cf_is_active: true }), { cf_is_active: true });
  assertEquals(customField('{"cf_is_active":true}'), { cf_is_active: true });
  assertEquals(customField(""), undefined);
  assertEquals(customField({}), undefined);
});

Deno.test("customField: rejects a non-object rather than sending nonsense", () => {
  assertThrows(() => customField('"nope"'), Error, "must be a JSON object");
  assertThrows(() => customField("[1,2]"), Error, "must be a JSON object");
});

Deno.test("compact/unset behave as the other apps' helpers do", () => {
  assertEquals(compact({ a: 0, b: undefined, c: null }), { a: 0 });
  assertEquals(unset(""), undefined);
  assertEquals(unset("x"), "x");
});
