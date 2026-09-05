import { assertEquals, assertRejects } from "@std/assert";
import { compact, formatMeisterTaskError, MeisterTaskClient, truncate } from "../../lib/client.ts";
import { errorsBody, mockCtx, pathOf, singularErrorBody } from "../_helpers.ts";

Deno.test("compact: drops undefined/null/empty-string, keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});

Deno.test("truncate: passes short text through unchanged", () => {
  assertEquals(truncate("short", 10), "short");
});

Deno.test("truncate: caps long text and says how much was cut", () => {
  const out = truncate("0123456789", 5);
  assertEquals(out, "01234… (10 bytes truncated)");
});

Deno.test("formatMeisterTaskError: parses the documented plural {errors:[...]} shape", () => {
  const raw = JSON.stringify(errorsBody("Project with ID 318 not found", 404));
  const msg = formatMeisterTaskError(404, "GET", "/projects/318", raw);
  assertEquals(msg, "MeisterTask 404 for GET /projects/318: Project with ID 318 not found");
});

Deno.test("formatMeisterTaskError: joins multiple entries in one errors array", () => {
  const raw = JSON.stringify({
    errors: [{ message: "Required parameter name is missing", status: 400 }, { message: "bad" }],
  });
  const msg = formatMeisterTaskError(400, "POST", "/projects", raw);
  assertEquals(msg, "MeisterTask 400 for POST /projects: Required parameter name is missing; bad");
});

Deno.test(
  "formatMeisterTaskError: falls back to the undocumented singular {error:{...}} shape a 401 answers",
  () => {
    const raw = JSON.stringify(singularErrorBody(401, "Invalid credentials"));
    const msg = formatMeisterTaskError(401, "GET", "/persons/me", raw);
    assertEquals(msg, "MeisterTask 401 for GET /persons/me: Invalid credentials");
  },
);

Deno.test("formatMeisterTaskError: falls back to the raw body when neither shape parses", () => {
  const msg = formatMeisterTaskError(500, "GET", "/projects", "<html>oops</html>");
  assertEquals(msg, "MeisterTask 500 for GET /projects: <html>oops</html>");
});

Deno.test("MeisterTaskClient.request: resolves the bare API_BASE + path, no envelope", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  const out = await new MeisterTaskClient(ctx).request("/projects/1");
  assertEquals(calls[0].url, "https://www.meistertask.com/api/projects/1");
  assertEquals(out, { id: 1 });
});

Deno.test("MeisterTaskClient.request: a 204 resolves to undefined, not a parse error", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const out = await new MeisterTaskClient(ctx).request("/checklists/1", { method: "DELETE" });
  assertEquals(out, undefined);
});

Deno.test("MeisterTaskClient.request: an error response throws a formatted message", async () => {
  const { ctx } = mockCtx([
    { status: 404, body: errorsBody("Project with ID 1 not found", 404) },
  ]);
  await assertRejects(
    () => new MeisterTaskClient(ctx).request("/projects/1"),
    Error,
    "Project with ID 1 not found",
  );
});

Deno.test("MeisterTaskClient.status: returns the HTTP status of a successful delete", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const status = await new MeisterTaskClient(ctx).status("/comments/2", { method: "DELETE" });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(status, 204);
});

Deno.test("MeisterTaskClient: drops query params the caller left unset, keeps false", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await new MeisterTaskClient(ctx).request("/projects", {
    query: { status: undefined, items: 10, assigned_to_me: false },
  });
  assertEquals(pathOf(calls[0].url), "/api/projects");
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.has("status"), false);
  assertEquals(params.get("items"), "10");
  assertEquals(params.get("assigned_to_me"), "false");
});
