import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx, mockTeamworkCtx } from "../_helpers.ts";
import {
  baseUrl,
  compact,
  csv,
  csvIds,
  domainFromConnection,
  readError,
  TeamworkClient,
  unset,
} from "../../lib/client.ts";

Deno.test("client: builds the URL from the connection's site name, not a param", async () => {
  const { ctx, calls } = mockTeamworkCtx([{ body: { task: { id: 1 } } }], "acme");
  await new TeamworkClient(ctx).request("/projects/api/v3/tasks/1.json");
  assertEquals(calls[0].url, "https://acme.teamwork.com/projects/api/v3/tasks/1.json");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("client: fails loudly when the connection carries no site name", () => {
  const { ctx } = mockCtx();
  assertThrows(() => new TeamworkClient(ctx), Error, "no site name");
});

Deno.test("client: surfaces Teamwork's V3 error body", async () => {
  const { ctx } = mockTeamworkCtx([{
    status: 401,
    statusText: "Unauthorized",
    body: { errors: [{ title: "unexpected error", detail: "401: Not authorized" }] },
  }]);
  await assertRejects(
    () => new TeamworkClient(ctx).request("/projects/api/v3/tasks.json"),
    Error,
    "401: Not authorized",
  );
});

Deno.test("client: returns undefined for a 204", async () => {
  const { ctx } = mockTeamworkCtx([{ status: 204 }]);
  assertEquals(
    await new TeamworkClient(ctx).request("/projects/api/v3/tasks/1.json", { method: "DELETE" }),
    undefined,
  );
});

Deno.test("client: comma-joins array query params (Swagger's default collectionFormat)", async () => {
  const { ctx, calls } = mockTeamworkCtx([{ body: { tasks: [] } }]);
  await new TeamworkClient(ctx).request("/projects/api/v3/tasks.json", {
    query: { projectIds: [1, 2, 3] },
  });
  assertEquals(new URL(calls[0].url).searchParams.get("projectIds"), "1,2,3");
});

Deno.test("client: drops undefined/null/empty query values entirely", async () => {
  const { ctx, calls } = mockTeamworkCtx([{ body: { tasks: [] } }]);
  await new TeamworkClient(ctx).request("/projects/api/v3/tasks.json", {
    query: { searchTerm: undefined, page: 1, tagIds: undefined },
  });
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.has("searchTerm"), false);
  assertEquals(params.get("page"), "1");
});

Deno.test("domainFromConnection: reads the display data afterConnect records", () => {
  assertEquals(
    domainFromConnection({ display: { domain: "acme" } } as never),
    "acme",
  );
  assertThrows(() => domainFromConnection(undefined), Error, "no site name");
});

Deno.test("baseUrl: builds the per-account host with no path suffix", () => {
  assertEquals(baseUrl("acme"), "https://acme.teamwork.com");
});

Deno.test("readError: reads the V3 errors[] shape", async () => {
  const res = new Response(
    JSON.stringify({ errors: [{ title: "unexpected error", detail: "401: Not authorized" }] }),
    { status: 401 },
  );
  assertEquals(await readError(res), "401: Not authorized");
});

Deno.test("readError: falls back to the legacy V1 MESSAGE field", async () => {
  const res = new Response(JSON.stringify({ STATUS: "Error", MESSAGE: "Bad request" }), {
    status: 400,
  });
  assertEquals(await readError(res), "Bad request");
});

Deno.test("readError: falls back to raw text when the body isn't JSON", async () => {
  const res = new Response("<html>gateway timeout</html>", { status: 504 });
  assertEquals(await readError(res), "<html>gateway timeout</html>");
});

Deno.test("compact/csv/csvIds/unset behave as the other apps' helpers do", () => {
  assertEquals(compact({ a: 0, b: undefined, c: null }), { a: 0 });
  assertEquals(csv("a, b"), ["a", "b"]);
  assertEquals(csv(""), undefined);
  assertEquals(unset(""), undefined);
  assertEquals(csvIds("1, 2, 3"), [1, 2, 3]);
  assertEquals(csvIds(""), undefined);
  assertEquals(csvIds("not-a-number"), undefined);
});
