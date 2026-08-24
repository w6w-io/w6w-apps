import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { API_BASE, compact, pageQuery, WealthboxClient } from "../../lib/client.ts";

Deno.test("client: targets api.crmworkspace.com, not a wealthbox.com subdomain", () => {
  assertEquals(API_BASE, "https://api.crmworkspace.com/v1");
  assert(!API_BASE.includes("wealthbox.com"));
});

Deno.test("client: GETs with an accept header and no body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { contacts: [] } }]);
  await new WealthboxClient(ctx).request("/contacts");
  assertEquals(calls[0].url, "https://api.crmworkspace.com/v1/contacts");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].body, null);
});

Deno.test("client: never sets an auth header itself — that is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new WealthboxClient(ctx).request("/contacts", {
    method: "POST",
    body: { first_name: "x" },
  });
  assertEquals(calls[0].headers["access_token"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: serialises a JSON body and sets content-type", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  await new WealthboxClient(ctx).request("/contacts", {
    method: "POST",
    body: { first_name: "Kevin" },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { first_name: "Kevin" });
});

Deno.test("client: appends query params, skipping undefined, null and empty string", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new WealthboxClient(ctx).request("/contacts", {
    query: { page: 2, per_page: 0, name: undefined, id: null, q: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("page"), "2");
  // 0 is meaningful and must survive; only undefined/null/"" are dropped.
  assertEquals(url.searchParams.get("per_page"), "0");
  assertEquals(url.searchParams.has("name"), false);
  assertEquals(url.searchParams.has("id"), false);
  assertEquals(url.searchParams.has("q"), false);
});

Deno.test("client: sends an array query param as repeated `key[]=` entries", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new WealthboxClient(ctx).request("/contacts", { query: { tags: ["a", "b"] } });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.getAll("tags[]"), ["a", "b"]);
});

Deno.test("client: throws with status, method, path and body on a non-2xx", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { errors: "First name can't be blank" } }]);
  const err = await assertRejects(
    () => new WealthboxClient(ctx).request("/contacts", { method: "POST", body: {} }),
    Error,
  );
  assert(err.message.includes("Wealthbox 422"));
  assert(err.message.includes("POST"));
  assert(err.message.includes("/v1/contacts"));
  assert(err.message.includes("First name can't be blank"));
});

Deno.test("client: returns undefined for a 204 and for an empty body", async () => {
  const { ctx } = mockCtx([{ status: 204 }, { status: 200, body: "" }]);
  const client = new WealthboxClient(ctx);
  assertEquals(await client.request("/contacts/1", { method: "DELETE" }), undefined);
  assertEquals(await client.request("/contacts"), undefined);
});

Deno.test("pageQuery: maps the shared page inputs onto Wealthbox's names", () => {
  assertEquals(pageQuery({ page: 2, perPage: 50 }), { page: 2, per_page: 50 });
  assertEquals(pageQuery({}), { page: undefined, per_page: undefined });
});

Deno.test("compact: drops undefined but keeps null, false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: false, d: 0, e: "" }), {
    b: null,
    c: false,
    d: 0,
    e: "",
  });
});
