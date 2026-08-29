import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  asOptionalJson,
  baseUrl,
  buildQuery,
  formatWrikeError,
  hostFromConnection,
  joinIds,
  toList,
  WrikeClient,
} from "../../lib/client.ts";
import { envelope, errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("buildQuery: drops undefined/null/empty, keeps false", () => {
  const q = buildQuery({ a: "x", b: undefined, c: null, d: "", e: false, f: 0 });
  assertEquals(q, { a: "x", e: "false", f: "0" });
});

Deno.test("buildQuery: JSON-encodes arrays and objects — the query-string convention", () => {
  const q = buildQuery({ ids: ["a", "b"], dates: { start: "2026-01-01" } });
  assertEquals(q.ids, '["a","b"]');
  assertEquals(q.dates, '{"start":"2026-01-01"}');
});

Deno.test("asOptionalJson: accepts a parsed object, a JSON string, or absence", () => {
  assertEquals(asOptionalJson({ a: 1 }, "x"), { a: 1 });
  assertEquals(asOptionalJson('{"a":1}', "x"), { a: 1 });
  assertEquals(asOptionalJson(undefined, "x"), undefined);
  assertEquals(asOptionalJson("", "x"), undefined);
});

Deno.test("asOptionalJson: throws a readable error on malformed JSON", () => {
  assertThrows(() => asOptionalJson("{not json", "Dates"), Error, "Dates is not valid JSON");
});

Deno.test("toList: splits a comma string, passes an array through, drops empties", () => {
  assertEquals(toList("a, b ,c"), ["a", "b", "c"]);
  assertEquals(toList(["a", "b"]), ["a", "b"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList(undefined), undefined);
});

Deno.test("joinIds: comma-joins and URI-encodes; throws on empty", () => {
  assertEquals(joinIds("a,b"), "a,b");
  assertEquals(joinIds(["a", "b c"]), "a,b%20c");
  assertThrows(() => joinIds(""), Error, "at least one id is required");
});

Deno.test("hostFromConnection: reads display.host, rejects an unknown host", () => {
  assertEquals(
    hostFromConnection(
      { display: { host: "app-eu.wrike.com" } } as unknown as Parameters<
        typeof hostFromConnection
      >[0],
    ),
    "app-eu.wrike.com",
  );
  assertThrows(
    () => hostFromConnection(undefined),
    Error,
    "reconnect the account",
  );
  assertThrows(
    () =>
      hostFromConnection(
        { display: { host: "evil.example.com" } } as unknown as Parameters<
          typeof hostFromConnection
        >[0],
      ),
    Error,
    "reconnect the account",
  );
});

Deno.test("baseUrl: builds https://<host>/api/v4", () => {
  assertEquals(baseUrl("www.wrike.com"), "https://www.wrike.com/api/v4");
});

Deno.test("formatWrikeError: surfaces the vendor's error code and description verbatim", () => {
  const msg = formatWrikeError(
    401,
    "GET",
    "/version",
    JSON.stringify(errorBody("not_authorized", "Access token is unknown or invalid")),
  );
  assertEquals(
    msg,
    "Wrike 401 not_authorized for GET /version: Access token is unknown or invalid",
  );
});

Deno.test("formatWrikeError: names the documented rate limit on 429", () => {
  const msg = formatWrikeError(
    429,
    "GET",
    "/tasks",
    JSON.stringify(errorBody("too_many_requests", "limit exceeded")),
  );
  assertEquals(msg.includes("400 requests/minute"), true);
});

Deno.test("formatWrikeError: falls back to the raw body when it is not the documented shape", () => {
  const msg = formatWrikeError(500, "GET", "/tasks", "<html>oops</html>");
  assertEquals(msg, "Wrike 500 for GET /tasks: <html>oops</html>");
});

Deno.test("WrikeClient.list: unwraps the {kind, data} envelope", async () => {
  const { ctx } = mockCtx([{ status: 200, body: envelope([{ id: "1" }, { id: "2" }]) }]);
  const items = await new WrikeClient(ctx, "www.wrike.com").list("/tasks");
  assertEquals(items, [{ id: "1" }, { id: "2" }]);
});

Deno.test("WrikeClient.one: returns the first element, throws on an empty array", async () => {
  const { ctx } = mockCtx([{ status: 200, body: envelope([{ id: "1" }]) }]);
  assertEquals(await new WrikeClient(ctx, "www.wrike.com").one("/tasks/1"), { id: "1" });

  const { ctx: emptyCtx } = mockCtx([{ status: 200, body: envelope([]) }]);
  await assertRejects(
    () => new WrikeClient(emptyCtx, "www.wrike.com").one("/tasks/gone"),
    Error,
    "empty data array",
  );
});

Deno.test("WrikeClient.envelope: returns kind alongside data", async () => {
  const { ctx } = mockCtx([{ status: 200, body: envelope([{ id: "1" }], "folderTree") }]);
  const body = await new WrikeClient(ctx, "www.wrike.com").envelope("/folders");
  assertEquals(body.kind, "folderTree");
  assertEquals(body.data, [{ id: "1" }]);
});

Deno.test("WrikeClient.status: returns the HTTP status for a no-body response", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const status = await new WrikeClient(ctx, "www.wrike.com").status("/tasks/1", {
    method: "DELETE",
  });
  assertEquals(status, 204);
});

Deno.test("WrikeClient: every request goes to the given host under /api/v4", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope([]) }]);
  await new WrikeClient(ctx, "app-eu.wrike.com").list("/tasks");
  assertEquals(pathOf(calls[0].url), "/api/v4/tasks");
  assertEquals(new URL(calls[0].url).host, "app-eu.wrike.com");
});

Deno.test("WrikeClient: structured query params are JSON-encoded, never sent as a body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope([{ id: "1" }]) }]);
  await new WrikeClient(ctx, "www.wrike.com").one("/folders/1/tasks", {
    method: "POST",
    query: { title: "Ship it", dates: { start: "2026-09-01" }, responsibles: ["u1", "u2"] },
  });
  assertEquals(calls[0].body, null, "Wrike takes every field as a query param, never a JSON body");
  assertEquals(queryOf(calls[0].url), {
    title: "Ship it",
    dates: '{"start":"2026-09-01"}',
    responsibles: '["u1","u2"]',
  });
});

Deno.test("WrikeClient: an error response's body drives the thrown message", async () => {
  const { ctx } = mockCtx([
    { status: 403, body: errorBody("access_forbidden", "Access to requested entity is denied") },
  ]);
  await assertRejects(
    () => new WrikeClient(ctx, "www.wrike.com").list("/tasks/secret"),
    Error,
    "access_forbidden",
  );
});
