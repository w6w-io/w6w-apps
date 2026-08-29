import { assertEquals, assertRejects } from "@std/assert";
import {
  compact,
  ConnecteamClient,
  formatConnecteamError,
  toIdList,
  toList,
} from "../../lib/client.ts";
import {
  envelope,
  invalidKeyErrorBody,
  mockCtx,
  noAuthErrorBody,
  pagedEnvelope,
  pathOf,
  queryOf,
  validationErrorBody,
} from "../_helpers.ts";

Deno.test("ConnecteamClient.data: unwraps the {requestId, data} envelope", async () => {
  const { ctx } = mockCtx([{ body: envelope({ companyName: "Acme", companyId: "co_1" }) }]);
  const out = await new ConnecteamClient(ctx).data("/me");
  assertEquals(out, { companyName: "Acme", companyId: "co_1" });
});

Deno.test("ConnecteamClient.page: keeps paging alongside the unwrapped data", async () => {
  const { ctx } = mockCtx([
    { body: pagedEnvelope({ users: [{ userId: 1 }] }, { offset: 0, total: 1 }) },
  ]);
  const { data, paging } = await new ConnecteamClient(ctx).page<{ users: unknown[] }>(
    "/users/v1/users",
  );
  assertEquals(data.users.length, 1);
  assertEquals(paging, { offset: 0, total: 1 });
});

Deno.test("ConnecteamClient.page: defaults paging when the response omits it", async () => {
  const { ctx } = mockCtx([{ body: envelope({ users: [] }) }]);
  const { paging } = await new ConnecteamClient(ctx).page("/users/v1/users");
  assertEquals(paging, { offset: 0 });
});

Deno.test("ConnecteamClient: array query params repeat the key (form/explode, not comma-joined)", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ users: [] }) }]);
  await new ConnecteamClient(ctx).data("/users/v1/users", { query: { userIds: [1, 2, 3] } });
  assertEquals(queryOf(calls[0].url), { userIds: ["1", "2", "3"] });
});

Deno.test("ConnecteamClient: false and 0 survive query serialization, empty string does not", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }, { body: envelope({}) }]);
  const client = new ConnecteamClient(ctx);
  await client.data("/x", { query: { isApproved: false, offset: 0 } });
  await client.data("/y", { query: { name: "" } });
  assertEquals(queryOf(calls[0].url), { isApproved: "false", offset: "0" });
  assertEquals(queryOf(calls[1].url), {});
});

Deno.test("ConnecteamClient: a JSON body is sent with content-type application/json", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await new ConnecteamClient(ctx).data("/users/v1/users", {
    method: "POST",
    body: [{ firstName: "A" }],
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify([{ firstName: "A" }]));
});

Deno.test("ConnecteamClient.status: returns the status without requiring a body", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const status = await new ConnecteamClient(ctx).status("/x/1", { method: "DELETE" });
  assertEquals(status, 204);
});

Deno.test("ConnecteamClient: a non-2xx response throws with the formatted error", async () => {
  const { ctx } = mockCtx([{ status: 403, body: invalidKeyErrorBody() }]);
  await assertRejects(
    () => new ConnecteamClient(ctx).data("/me"),
    Error,
    "Invalid API key",
  );
});

Deno.test("pathOf/queryOf: split a recorded URL correctly", () => {
  assertEquals(pathOf("https://api.connecteam.com/users/v1/users?limit=10"), "/users/v1/users");
  assertEquals(queryOf("https://api.connecteam.com/x?a=1&a=2&b=3"), { a: ["1", "2"], b: "3" });
});

// --- formatConnecteamError: the three observed/documented shapes -----------

Deno.test("formatConnecteamError: the 'no authentication provided' 401 shape", () => {
  const msg = formatConnecteamError(
    401,
    "GET",
    "/me",
    JSON.stringify(noAuthErrorBody("/me")),
  );
  assertEquals(msg, "Connecteam 401 for GET /me: No authentication provided");
});

Deno.test("formatConnecteamError: the 'invalid API key' 403 shape — detail is a string", () => {
  const msg = formatConnecteamError(403, "GET", "/me", JSON.stringify(invalidKeyErrorBody()));
  assertEquals(msg, "Connecteam 403 for GET /me: Invalid API key");
});

Deno.test("formatConnecteamError: the FastAPI 422 shape — detail is an ARRAY, not a string", () => {
  const raw = JSON.stringify(
    validationErrorBody([{ loc: ["query", "limit"], msg: "ensure this value is <= 500" }]),
  );
  const msg = formatConnecteamError(422, "GET", "/users/v1/users", raw);
  assertEquals(
    msg,
    "Connecteam 422 validation error for GET /users/v1/users: " +
      "query.limit: ensure this value is <= 500",
  );
});

Deno.test("formatConnecteamError: an unparseable body falls back to the raw text", () => {
  const msg = formatConnecteamError(500, "GET", "/x", "<html>oops</html>");
  assertEquals(msg, "Connecteam 500 for GET /x: <html>oops</html>");
});

// --- small pure helpers ------------------------------------------------------

Deno.test("compact: drops undefined/null/empty-string, keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: false, e: 0, f: "x" },
  );
});

Deno.test("toList: accepts an array or a comma-separated string, trims and drops blanks", () => {
  assertEquals(toList(["a", " b ", ""]), ["a", "b"]);
  assertEquals(toList("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(toList(undefined), undefined);
  assertEquals(toList(""), undefined);
});

Deno.test("toIdList: parses to positive integers, dropping anything else", () => {
  assertEquals(toIdList("1,2,3"), [1, 2, 3]);
  assertEquals(toIdList("1, -2, abc, 3"), [1, 3]);
  assertEquals(toIdList(undefined), undefined);
});
