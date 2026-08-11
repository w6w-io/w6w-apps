import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  ACT_AS_HEADER,
  compact,
  CompanyCamClient,
  encodeId,
  formatCompanyCamError,
  stripWebhookSecret,
  stripWebhookSecrets,
  toList,
  truncate,
} from "../../lib/client.ts";
import { paginationQuery } from "../../lib/params.ts";
import { bodyOf, errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("client: builds the v2 URL and asks for JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await new CompanyCamClient(ctx).list("/projects", { query: { page: 2, per_page: 50 } });
  assertEquals(pathOf(calls[0].url), "/v2/projects");
  assertEquals(queryOf(calls[0].url), { page: "2", per_page: "50" });
  assertEquals(calls[0].headers.accept, "application/json");
  assertEquals(calls[0].method, "GET");
});

Deno.test("client: never sets an auth header itself", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await new CompanyCamClient(ctx).list("/projects");
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("client: drops empty query values but keeps 0 and false", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await new CompanyCamClient(ctx).list("/checklists", {
    query: { page: undefined, per_page: 0, completed: false, query: "" },
  });
  assertEquals(queryOf(calls[0].url), { per_page: "0", completed: "false" });
});

Deno.test("client: sends the impersonation header in the dashed form only", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  await new CompanyCamClient(ctx).json("/projects", {
    method: "POST",
    body: { name: "x" },
    actAs: "crew@example.com",
  });
  assertEquals(calls[0].headers[ACT_AS_HEADER], "crew@example.com");
  assertEquals(ACT_AS_HEADER, "x-companycam-user");
  assert(!("x_companycam_user" in calls[0].headers), "sent the nginx-dropped underscored form");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(bodyOf(calls[0]), { name: "x" });
});

Deno.test("client: omits the impersonation header when no user is named", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  await new CompanyCamClient(ctx).json("/projects", { method: "POST", body: { name: "x" } });
  assertEquals(calls[0].headers[ACT_AS_HEADER], undefined);
});

Deno.test("client: a bare array becomes items + count", async () => {
  const { ctx } = mockCtx([{ body: [{ id: "1" }, { id: "2" }] }]);
  const page = await new CompanyCamClient(ctx).list<{ id: string }>("/projects");
  assertEquals(page.count, 2);
  assertEquals(page.items.map((i) => i.id), ["1", "2"]);
  // No cursor headers on this endpoint, so no cursor fields — not empty strings.
  assertEquals(page.nextCursor, undefined);
  assertEquals(page.hasNext, undefined);
});

Deno.test("client: cursor headers are surfaced, and an empty cursor is an absent one", async () => {
  const { ctx } = mockCtx([{
    body: [{ id: "1" }],
    headers: {
      "content-type": "application/json",
      "x-next-cursor": "eyJpZCI6MX0",
      "x-prev-cursor": "",
      "x-has-next": "true",
      "x-has-prev": "false",
    },
  }]);
  const page = await new CompanyCamClient(ctx).list("/photos");
  assertEquals(page.nextCursor, "eyJpZCI6MX0");
  assertEquals(page.prevCursor, undefined, "an empty cursor header must not become a cursor");
  assertEquals(page.hasNext, true);
  assertEquals(page.hasPrev, false);
});

Deno.test("client: 204 answers with no body rather than a parse error", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  assertEquals(await new CompanyCamClient(ctx).json("/tags/1", { method: "DELETE" }), undefined);
});

Deno.test("client: status() reports the code for a no-body delete", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, headers: {} }]);
  assertEquals(
    await new CompanyCamClient(ctx).status("/tags/1", { method: "DELETE" }),
    { status: 204 },
  );
  assertEquals(calls[0].method, "DELETE");
});

/**
 * The measured trap: `/v2/<unknown>` redirects to the web sign-in page, and
 * `fetch` follows it, so the client sees `200 text/html`. Parsing that as data
 * is how a typo becomes an empty result set instead of an error.
 */
Deno.test("client: a 200 carrying HTML is rejected, not parsed", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
    body: "<!DOCTYPE html><html><body>Sign in</body></html>",
  }]);
  const error = await assertRejects(
    () => new CompanyCamClient(ctx).list("/projekts"),
    Error,
  );
  assert(
    /non-JSON body/.test(error.message),
    `unhelpful message for an HTML answer: ${error.message}`,
  );
  assert(/sign-in/.test(error.message), "the message must name the actual cause");
});

Deno.test("client: an error body is surfaced with its messages", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("Record not found") }]);
  const error = await assertRejects(() => new CompanyCamClient(ctx).json("/projects/9"), Error);
  assert(error.message.includes("Record not found"), error.message);
  assert(error.message.includes("/v2/projects/9"), error.message);
});

Deno.test("formatCompanyCamError: 401 says both causes, because the API cannot tell them apart", () => {
  const message = formatCompanyCamError(401, "GET", "/v2/projects", '{"errors":["Unauthorized"]}');
  assert(message.includes("Unauthorized"));
  assert(/no credential arrived|no credential/.test(message), message);
  assert(/revoked|rejected/.test(message), message);
});

Deno.test("formatCompanyCamError: a non-JSON body is still reported", () => {
  const message = formatCompanyCamError(502, "GET", "/v2/projects", "<html>bad gateway</html>");
  assert(message.includes("502"));
  assert(message.includes("bad gateway"));
});

Deno.test("stripWebhookSecret: deletes the signing token and nothing else", () => {
  const webhook = {
    id: "42",
    url: "https://example.com/hook",
    scopes: ["*"],
    token: "s3cret",
    enabled: true,
  };
  const stripped = stripWebhookSecret<Record<string, unknown>>(webhook);
  assertEquals(stripped, {
    id: "42",
    url: "https://example.com/hook",
    scopes: ["*"],
    enabled: true,
  });
  assert(!("token" in stripped), "the signing token survived");
  // The input is not mutated — the caller may still be holding it.
  assertEquals(webhook.token, "s3cret");
});

Deno.test("stripWebhookSecrets: strips every row of a page", () => {
  const page = {
    items: [{ id: "1", token: "a" }, { id: "2", token: "b" }],
    count: 2,
    hasNext: false,
  };
  const stripped = stripWebhookSecrets(page);
  assertEquals(stripped.count, 2);
  assertEquals(stripped.hasNext, false);
  for (const item of stripped.items) assert(!("token" in item), "a token survived the page strip");
});

Deno.test("compact: drops undefined, null and empty strings, keeps 0 and false", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: "", e: 0, f: false }),
    { a: 1, e: 0, f: false },
  );
});

Deno.test("encodeId: neutralises a path separator pasted into an id field", () => {
  assertEquals(encodeId("123"), "123");
  assertEquals(encodeId(" 123 "), "123");
  assertEquals(encodeId("../webhooks"), "..%2Fwebhooks");
});

Deno.test("toList: accepts an array or a comma-separated string", () => {
  assertEquals(toList(["a", "b"]), ["a", "b"]);
  assertEquals(toList("a, b"), ["a", "b"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList(undefined), undefined);
});

Deno.test("truncate: keeps short text and marks long text", () => {
  assertEquals(truncate("short", 10), "short");
  assert(truncate("x".repeat(50), 10).includes("truncated"));
});

Deno.test("paginationQuery: rejects the combinations the vendor documents as illegal", () => {
  assertEquals(
    paginationQuery({ page: 2, perPage: 10 }),
    { page: 2, per_page: 10, after: undefined, before: undefined },
  );
  assertEquals(
    paginationQuery({ after: "cur" }),
    { page: undefined, per_page: undefined, after: "cur", before: undefined },
  );
  assertThrows(() => paginationQuery({ after: "a", before: "b" }), Error, "only one of After");
  assertThrows(() => paginationQuery({ page: 1, after: "a" }), Error, "Page cannot be combined");
});
