import { assertEquals, assertRejects } from "@std/assert";
import {
  API_BASE,
  asJson,
  asOptionalJson,
  CloudConvertClient,
  formatCloudConvertError,
  SYNC_API_BASE,
  toArray,
  truncate,
} from "../../lib/client.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("client: bases — API_BASE and SYNC_API_BASE are distinct hosts, same prefix", () => {
  assertEquals(API_BASE, "https://api.cloudconvert.com");
  assertEquals(SYNC_API_BASE, "https://sync.api.cloudconvert.com");
});

Deno.test("client: data() unwraps the {data} envelope", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { data: { id: "j1" } } }]);
  const out = await new CloudConvertClient(ctx).data("/jobs/j1");
  assertEquals(out, { id: "j1" });
});

Deno.test("client: page() keeps the full envelope, including meta/links", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { data: [{ id: "j1" }], meta: { current_page: 1, per_page: 100 } },
  }]);
  const out = await new CloudConvertClient(ctx).page("/jobs");
  assertEquals(out.data, [{ id: "j1" }]);
  assertEquals(out.meta?.current_page, 1);
});

Deno.test("client: status() returns the HTTP status for a bodyless 204", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const status = await new CloudConvertClient(ctx).status("/jobs/j1", { method: "DELETE" });
  assertEquals(status, 204);
});

Deno.test("client: send() defaults to API_BASE and honours an explicit base", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: {} } },
    { status: 200, body: { data: {} } },
  ]);
  const client = new CloudConvertClient(ctx);
  await client.data("/jobs/j1");
  await client.data("/jobs/j1", { base: SYNC_API_BASE });
  assertEquals(new URL(calls[0].url).hostname, "api.cloudconvert.com");
  assertEquals(new URL(calls[1].url).hostname, "sync.api.cloudconvert.com");
  assertEquals(pathOf(calls[0].url), "/v2/jobs/j1");
  assertEquals(pathOf(calls[1].url), "/v2/jobs/j1");
});

Deno.test("client: query params drop undefined/null/empty but keep false and 0", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: {} } }]);
  await new CloudConvertClient(ctx).data("/jobs", {
    query: { a: undefined, b: null, c: "", d: false, e: 0, f: "x" },
  });
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.has("a"), false);
  assertEquals(params.has("b"), false);
  assertEquals(params.has("c"), false);
  assertEquals(params.get("d"), "false");
  assertEquals(params.get("e"), "0");
  assertEquals(params.get("f"), "x");
});

Deno.test("client: array query values are comma-joined", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: {} } }]);
  await new CloudConvertClient(ctx).data("/tasks", { query: { include: ["retries", "payload"] } });
  assertEquals(new URL(calls[0].url).searchParams.get("include"), "retries,payload");
});

Deno.test("client: a JSON body is sent with content-type application/json", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: { id: "j1" } } }]);
  await new CloudConvertClient(ctx).data("/jobs", { method: "POST", body: { tag: "x" } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { tag: "x" });
});

Deno.test("client: a non-ok response throws with the vendor's message and code", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("Unauthenticated.", "UNAUTHENTICATED"),
  }]);
  await assertRejects(
    () => new CloudConvertClient(ctx).data("/jobs"),
    Error,
    "CloudConvert 401 UNAUTHENTICATED",
  );
});

Deno.test("client: a 422 surfaces the field-level validation errors", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("The given data was invalid.", "INVALID_DATA", {
      tasks: ["The tasks field is required."],
    }),
  }]);
  await assertRejects(
    () => new CloudConvertClient(ctx).data("/jobs", { method: "POST", body: {} }),
    Error,
    "tasks: The tasks field is required.",
  );
});

Deno.test("client: a 429 error message names the Retry-After remedy", () => {
  const message = formatCloudConvertError(
    429,
    "POST",
    "/v2/jobs",
    JSON.stringify({ message: "Too many attempts", code: "TOO_MANY_REQUESTS" }),
  );
  assertEquals(message.includes("Retry-After"), true);
});

Deno.test("client: formatCloudConvertError falls back to the raw body when it is not JSON", () => {
  const message = formatCloudConvertError(500, "GET", "/v2/jobs", "<html>oops</html>");
  assertEquals(message, "CloudConvert 500 for GET /v2/jobs: <html>oops</html>");
});

Deno.test("client: toArray() normalises a comma string or an array, dropping blanks", () => {
  assertEquals(toArray("job.finished, job.failed"), ["job.finished", "job.failed"]);
  assertEquals(toArray(["job.finished", "job.failed"]), ["job.finished", "job.failed"]);
  assertEquals(toArray(undefined), []);
  assertEquals(toArray(""), []);
});

Deno.test("client: asJson() parses a string, passes through an object, and requires a value", () => {
  assertEquals(asJson({ a: 1 }, "x"), { a: 1 });
  assertEquals(asJson('{"a":1}', "x"), { a: 1 });
  let threw = false;
  try {
    asJson(undefined, "Tasks");
  } catch (e) {
    threw = true;
    assertEquals((e as Error).message, "Tasks is required");
  }
  assertEquals(threw, true);
});

Deno.test("client: asOptionalJson() returns undefined for absence and throws on bad JSON", () => {
  assertEquals(asOptionalJson(undefined, "x"), undefined);
  assertEquals(asOptionalJson("", "x"), undefined);
  let threw = false;
  try {
    asOptionalJson("{not json", "Headers");
  } catch (e) {
    threw = true;
    assertEquals((e as Error).message, "Headers is not valid JSON");
  }
  assertEquals(threw, true);
});

Deno.test("client: truncate() caps long text and reports the trimmed byte count", () => {
  const long = "x".repeat(2000);
  const out = truncate(long, 800);
  assertEquals(out.length <= 830, true);
  assertEquals(out.includes("2000 bytes truncated"), true);
});
