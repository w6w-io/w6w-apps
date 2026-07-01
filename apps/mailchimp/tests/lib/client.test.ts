import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  datacenterFromApiEndpoint,
  datacenterFromApiKey,
  MailchimpClient,
} from "../../lib/client.ts";

Deno.test("datacenterFromApiKey: extracts suffix after last dash", () => {
  assertEquals(datacenterFromApiKey("abcdef0123456789-us14"), "us14");
  assertEquals(datacenterFromApiKey("with-many-dashes-eu2"), "eu2");
});

Deno.test("datacenterFromApiKey: throws on malformed keys", () => {
  assertThrows(() => datacenterFromApiKey("no-suffix-"), Error, "datacenter suffix");
  assertThrows(() => datacenterFromApiKey("nodashkey"), Error, "datacenter suffix");
});

Deno.test("datacenterFromApiEndpoint: pulls first host label out of api_endpoint", () => {
  assertEquals(
    datacenterFromApiEndpoint("https://us14.api.mailchimp.com"),
    "us14",
  );
  assertEquals(
    datacenterFromApiEndpoint("https://eu2.api.mailchimp.com/some/path"),
    "eu2",
  );
});

Deno.test("client: builds URLs against the connection's datacenter", async () => {
  const { ctx, calls } = mockCtx([{ body: { members: [] } }], { datacenter: "us7" });
  const client = new MailchimpClient(ctx);
  await client.request("/lists/abc/members");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://us7.api.mailchimp.com");
  assertEquals(url.pathname, "/3.0/lists/abc/members");
});

Deno.test("client: explicit datacenter overrides the connection", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { datacenter: "us1" });
  const client = new MailchimpClient(ctx, { datacenter: "eu2" });
  await client.request("/ping");
  assertEquals(new URL(calls[0].url).origin, "https://eu2.api.mailchimp.com");
});

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const client = new MailchimpClient(ctx);
  const result = await client.request("/lists/abc/members/x/actions/delete-permanent", {
    method: "POST",
  });
  assertEquals(result, undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 404, statusText: "Not Found", body: '{"title":"Resource Not Found"}' },
  ]);
  const client = new MailchimpClient(ctx);
  const err = await assertRejects(
    () => client.request("/lists/missing"),
    Error,
    "Mailchimp 404",
  );
  // Path should appear so log lines are actionable.
  assertEquals(err.message.includes("/3.0/lists/missing"), true);
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new MailchimpClient(ctx);
  await client.request("/x", {
    query: { a: "kept", b: undefined, c: null, d: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});

Deno.test("client: serializes JSON body and sets content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const client = new MailchimpClient(ctx);
  await client.request("/x", { method: "POST", body: { hello: "world" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"hello":"world"}');
});

Deno.test("client: throws when connection has no datacenter", () => {
  const { ctx } = mockCtx([], { display: {} });
  assertThrows(() => new MailchimpClient(ctx), Error, "no datacenter");
});
