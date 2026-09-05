import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  accountDomainFromConnection,
  compact,
  csv,
  errorMessage,
  jsonArray,
  KommoClient,
  normalizeAccountDomain,
  tagList,
} from "../../lib/client.ts";

Deno.test("normalizeAccountDomain: assumes .kommo.com for a bare subdomain", () => {
  assertEquals(normalizeAccountDomain("acme"), "acme.kommo.com");
});

Deno.test("normalizeAccountDomain: keeps a full .kommo.com host as-is", () => {
  assertEquals(normalizeAccountDomain("acme.kommo.com"), "acme.kommo.com");
});

Deno.test("normalizeAccountDomain: keeps the legacy .amocrm.com host as-is", () => {
  assertEquals(normalizeAccountDomain("acme.amocrm.com"), "acme.amocrm.com");
});

Deno.test("normalizeAccountDomain: strips a pasted scheme and path", () => {
  assertEquals(normalizeAccountDomain("https://acme.kommo.com/leads"), "acme.kommo.com");
});

Deno.test("normalizeAccountDomain: lowercases the host", () => {
  assertEquals(normalizeAccountDomain("ACME.Kommo.com"), "acme.kommo.com");
});

Deno.test("normalizeAccountDomain: rejects an empty address", () => {
  assertThrows(() => normalizeAccountDomain(""), Error, "empty");
});

Deno.test("normalizeAccountDomain: rejects a host on neither known apex", () => {
  assertThrows(() => normalizeAccountDomain("acme.example.com"), Error, "doesn't look like");
});

Deno.test("accountDomainFromConnection: reads the connection's accountDomain", () => {
  const { ctx } = mockCtx([], { display: { accountDomain: "acme.kommo.com" } });
  assertEquals(accountDomainFromConnection(ctx.connection), "acme.kommo.com");
});

Deno.test("accountDomainFromConnection: throws a reconnect message when there is none", () => {
  assertThrows(() => accountDomainFromConnection(undefined), Error, "records no account address");
});

Deno.test("compact: drops undefined, null, empty string and empty arrays", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: "", e: [], f: "x", g: [1] }),
    { a: 1, f: "x", g: [1] },
  );
});

Deno.test("csv: splits a comma-separated string and trims", () => {
  assertEquals(csv(" a, b ,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
  assertEquals(csv(undefined), undefined);
  assertEquals(csv(["x", " y "]), ["x", "y"]);
});

Deno.test("jsonArray: parses a JSON-string array", () => {
  assertEquals(jsonArray('[{"field_id":1}]'), [{ field_id: 1 }]);
});

Deno.test("jsonArray: passes an already-parsed array through", () => {
  assertEquals(jsonArray([{ a: 1 }]), [{ a: 1 }]);
});

Deno.test("jsonArray: treats an empty value as unset", () => {
  assertEquals(jsonArray(undefined), undefined);
  assertEquals(jsonArray(""), undefined);
  assertEquals(jsonArray([]), undefined);
});

Deno.test("jsonArray: rejects a non-array", () => {
  assertThrows(() => jsonArray('{"a":1}'), Error, "expected a JSON array");
});

Deno.test("tagList: turns comma-separated names into Kommo's [{name}] shape", () => {
  assertEquals(tagList("vip, lead"), [{ name: "vip" }, { name: "lead" }]);
  assertEquals(tagList(undefined), undefined);
});

Deno.test("errorMessage: reads the problem+json envelope {title, detail}", () => {
  const msg = errorMessage(JSON.stringify({
    title: "Unauthorized",
    type: "https://httpstatus.es/401",
    status: 401,
    detail: "Invalid user name or password",
  }));
  assertEquals(msg, "Unauthorized: Invalid user name or password");
});

Deno.test("errorMessage: folds validation-errors into the message", () => {
  const msg = errorMessage(JSON.stringify({
    title: "Bad Request",
    detail: "Request validation failed",
    "validation-errors": [
      { request_id: "0", errors: [{ path: "status_id", detail: "not a valid choice" }] },
    ],
  }));
  assertEquals(msg, "Bad Request: Request validation failed; status_id: not a valid choice");
});

Deno.test("errorMessage: falls back to the raw text when it is not JSON", () => {
  assertEquals(errorMessage("<html>nope</html>"), "<html>nope</html>");
  assertEquals(errorMessage(""), "");
});

const conn = { display: { accountDomain: "acme.kommo.com" } };

Deno.test("KommoClient.request: builds the URL under /api/v4 and forwards query params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }], conn);
  const client = new KommoClient(ctx);
  await client.request("/leads/1", { query: { with: "contacts", empty: undefined } });
  assertEquals(calls[0].url, "https://acme.kommo.com/api/v4/leads/1?with=contacts");
});

Deno.test("KommoClient.request: throws a message carrying the problem+json envelope", async () => {
  const { ctx } = mockCtx(
    [{
      status: 401,
      statusText: "Unauthorized",
      body: { title: "Unauthorized", detail: "Invalid user name or password" },
    }],
    conn,
  );
  const client = new KommoClient(ctx);
  await assertRejects(
    () => client.request("/leads/1"),
    Error,
    "Kommo 401 Unauthorized for GET /api/v4/leads/1: Unauthorized: Invalid user name or password",
  );
});

Deno.test("KommoClient.request: treats a 204 as no body", async () => {
  const { ctx } = mockCtx([{ status: 204 }], conn);
  const client = new KommoClient(ctx);
  assertEquals(await client.request("/leads"), undefined);
});

Deno.test("KommoClient.requestPage: unwraps _embedded.<key> and reports hasMore", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { _embedded: { leads: [{ id: 1 }, { id: 2 }] } } }],
    conn,
  );
  const client = new KommoClient(ctx);
  const { items, page, hasMore } = await client.requestPage("/leads", "leads", { limit: 2 });
  assertEquals(items, [{ id: 1 }, { id: 2 }]);
  assertEquals(page, 1);
  assertEquals(hasMore, true);
  assertEquals(calls[0].url, "https://acme.kommo.com/api/v4/leads?page=1&limit=2");
});

Deno.test("KommoClient.requestPage: a short page means no more", async () => {
  const { ctx } = mockCtx(
    [{ status: 200, body: { _embedded: { leads: [{ id: 1 }] } } }],
    conn,
  );
  const client = new KommoClient(ctx);
  const { hasMore } = await client.requestPage("/leads", "leads", { limit: 50 });
  assertEquals(hasMore, false);
});

Deno.test("KommoClient.requestPage: an empty collection is an empty array, not a throw", async () => {
  const { ctx } = mockCtx([{ status: 204 }], conn);
  const client = new KommoClient(ctx);
  const { items, hasMore } = await client.requestPage("/leads", "leads");
  assertEquals(items, []);
  assertEquals(hasMore, false);
});

Deno.test("KommoClient.createOne: wraps the body in an array and unwraps the echoed row", async () => {
  const { ctx, calls } = mockCtx(
    [{
      status: 200,
      body: { _embedded: { leads: [{ id: 152462, request_id: "0" }] } },
    }],
    conn,
  );
  const client = new KommoClient(ctx);
  const created = await client.createOne("/leads", "leads", { name: "Example" });
  assertEquals(created, { id: 152462, request_id: "0" });
  assertEquals(JSON.parse(calls[0].body!), [{ name: "Example" }]);
});

Deno.test("KommoClient.createOne: throws when Kommo echoes back no row", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { _embedded: { leads: [] } } }], conn);
  const client = new KommoClient(ctx);
  await assertRejects(
    () => client.createOne("/leads", "leads", { name: "x" }),
    Error,
    "did not echo back a created leads row",
  );
});

Deno.test("KommoClient.updateOne: sends a plain object body and unwraps the envelope", async () => {
  const { ctx, calls } = mockCtx(
    [{
      status: 200,
      body: { _embedded: { leads: [{ id: 152464, updated_at: 1686732474 }] } },
    }],
    conn,
  );
  const client = new KommoClient(ctx);
  const updated = await client.updateOne("/leads/152464", "leads", { price: 12000 });
  assertEquals(updated, { id: 152464, updated_at: 1686732474 });
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { price: 12000 });
});
