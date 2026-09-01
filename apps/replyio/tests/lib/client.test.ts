import { assert, assertEquals } from "@std/assert";
import { compact, formatReplyError, ReplyClient } from "../../lib/client.ts";
import { mockCtx, page, pathOf, problem } from "../_helpers.ts";

Deno.test("compact: drops undefined/null/empty-string but keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});

Deno.test("formatReplyError: surfaces the business-problem code and detail", () => {
  const msg = formatReplyError(
    400,
    "POST",
    "/v3/contacts",
    JSON.stringify(problem(400, "Bad Request", "email is invalid", "contacts.invalid-email")),
  );
  assert(msg.includes("contacts.invalid-email"), msg);
  assert(msg.includes("email is invalid"), msg);
  assert(msg.includes("400"), msg);
});

Deno.test("formatReplyError: an empty body (the docs' documented 401 shape) is still readable", () => {
  const msg = formatReplyError(401, "GET", "/v3/whoami", "");
  assert(msg.includes("401"), msg);
  assert(msg.includes("empty body"), msg);
});

Deno.test("formatReplyError: a 429 adds the rate-limit hint", () => {
  const msg = formatReplyError(
    429,
    "POST",
    "/v3/reporting/emails/overview",
    JSON.stringify(problem(429, "Too Many Requests", "slow down")),
  );
  assert(/rate-limits/i.test(msg), msg);
});

Deno.test("ReplyClient.list: reads the {items, hasMore} envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: 1 }], true) }]);
  const out = await new ReplyClient(ctx).list("/contacts");

  assertEquals(pathOf(calls[0].url), "/v3/contacts");
  assertEquals(out, { items: [{ id: 1 }], hasMore: true });
});

Deno.test("ReplyClient.json: parses a bare array with no envelope (custom-fields shape)", async () => {
  const { ctx } = mockCtx([{ body: [{ id: 1, title: "Budget" }] }]);
  const out = await new ReplyClient(ctx).json("/custom-fields");
  assertEquals(out, [{ id: 1, title: "Budget" }]);
});

Deno.test("ReplyClient.status: returns the HTTP status for a 204-with-no-body delete", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const status = await new ReplyClient(ctx).status("/contacts/1", { method: "DELETE" });
  assertEquals(status, 204);
});

Deno.test("ReplyClient: a non-ok response throws formatReplyError's message", async () => {
  const { ctx } = mockCtx([
    {
      status: 404,
      body: problem(404, "Not Found", "contact 999 does not exist", "contacts.not-found"),
    },
  ]);
  try {
    await new ReplyClient(ctx).json("/contacts/999");
    throw new Error("expected a throw");
  } catch (err) {
    assert(err instanceof Error);
    assert(err.message.includes("contacts.not-found"), err.message);
  }
});

Deno.test("ReplyClient: query params drop undefined/null/empty but a body always sends JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await new ReplyClient(ctx).list("/contacts", {
    query: { top: 10, skip: undefined, email: "" },
  });
  assertEquals(calls[0].url, `https://api.reply.io/v3/contacts?top=10`);
});

Deno.test("ReplyClient: a POST body is JSON-encoded with the content-type header set", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await new ReplyClient(ctx).json("/contacts", { method: "POST", body: { email: "a@b.com" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ email: "a@b.com" }));
});
