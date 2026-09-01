import { assertEquals, assertRejects } from "@std/assert";
import { compact, encodeId, formatError, JobNimbusClient, truncate } from "../../lib/client.ts";
import { errorBody, listPage, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("client: list() hits the given path and unwraps {count, results}", async () => {
  const { ctx, calls } = mockCtx([{ body: listPage([{ jnid: "a1" }]) }]);
  const page = await new JobNimbusClient(ctx).list("/contacts", { size: 1 });

  assertEquals(pathOf(calls[0].url), "/api1/contacts");
  assertEquals(queryOf(calls[0].url), { size: "1" });
  assertEquals(page, { count: 1, results: [{ jnid: "a1" }] });
});

Deno.test("client: list() drops unset query values rather than sending them empty", async () => {
  const { ctx, calls } = mockCtx([{ body: listPage([]) }]);
  await new JobNimbusClient(ctx).list("/contacts", {
    size: undefined,
    from: undefined,
    filter: undefined,
    actor: "",
  });
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("client: single() returns the body unwrapped — no envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: { jnid: "a1", first_name: "Bruce" } }]);
  const contact = await new JobNimbusClient(ctx).single("/contacts/a1");

  assertEquals(pathOf(calls[0].url), "/api1/contacts/a1");
  assertEquals(contact, { jnid: "a1", first_name: "Bruce" });
});

Deno.test("client: single() with a POST sends a JSON body and content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: { jnid: "new1" } }]);
  await new JobNimbusClient(ctx).single("/contacts", {
    method: "POST",
    body: { first_name: "Sammy" },
  });

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { first_name: "Sammy" });
});

Deno.test("client: deactivate() sends PUT {is_active: false}", async () => {
  const { ctx, calls } = mockCtx([{ body: { jnid: "a1", is_active: false } }]);
  const out = await new JobNimbusClient(ctx).deactivate("/contacts/a1");

  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { is_active: false });
  assertEquals(out, { jnid: "a1", is_active: false });
});

Deno.test("client: a failed request throws with JobNimbus's own error detail", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody(401, "Authentication required") }]);
  await assertRejects(
    () => new JobNimbusClient(ctx).single("/contacts/a1"),
    Error,
    "Authentication required",
  );
});

Deno.test("client: an empty successful body returns undefined rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  const out = await new JobNimbusClient(ctx).single("/contacts/a1");
  assertEquals(out, undefined);
});

Deno.test("formatError: reads the documented {status, body} shape", () => {
  const msg = formatError(
    401,
    "GET",
    "/contacts",
    JSON.stringify(errorBody(401, "Authentication required")),
  );
  assertEquals(msg, "JobNimbus 401 for GET /contacts: Authentication required");
});

Deno.test("formatError: falls back to the raw text when the body isn't JSON", () => {
  const msg = formatError(500, "GET", "/contacts", "internal server error");
  assertEquals(msg, "JobNimbus 500 for GET /contacts: internal server error");
});

Deno.test("formatError: an empty body still names the status and path", () => {
  assertEquals(formatError(500, "GET", "/contacts", ""), "JobNimbus 500 for GET /contacts");
});

Deno.test("truncate: leaves short text untouched and caps long text", () => {
  assertEquals(truncate("short"), "short");
  const long = "x".repeat(700);
  const out = truncate(long);
  assertEquals(out.startsWith("x".repeat(600)), true);
  assertEquals(out.includes("700 bytes truncated"), true);
});

Deno.test("compact: drops undefined, null and empty-string but keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "kept" }),
    { d: false, e: 0, f: "kept" },
  );
});

Deno.test("encodeId: neutralises path-breaking characters", () => {
  assertEquals(encodeId("abc123"), "abc123");
  assertEquals(encodeId("../etc"), "..%2Fetc");
});
