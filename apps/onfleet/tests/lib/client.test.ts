import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { compact, csv, describeError, entityRef, json, OnfleetClient } from "../../lib/client.ts";

Deno.test("compact: drops unset keys so an omitted field stays omitted", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: [], f: false }), {
    a: 1,
    f: false,
  });
});

Deno.test("csv: splits, trims and drops empties; blank means unset", () => {
  assertEquals(csv("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
  assertEquals(csv(["a", " b "]), ["a", "b"]);
});

Deno.test("json: parses text, passes live values, and names the bad field", () => {
  assertEquals(json('{"a":1}', "container"), { a: 1 });
  try {
    json("{oops", "container");
    throw new Error("expected a throw");
  } catch (err) {
    assert(String(err).includes("`container`"), String(err));
  }
});

Deno.test("entityRef: a plain string becomes a bare id, not a parsed object", () => {
  assertEquals(entityRef("adr_123", "destination"), "adr_123");
  assertEquals(entityRef('{"address":{"number":"1"}}', "destination"), {
    address: { number: "1" },
  });
  assertEquals(entityRef({ address: {} }, "destination"), { address: {} });
  assertEquals(entityRef("", "destination"), undefined);
});

Deno.test("client: builds the v2 URL and sets no authorization", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { tasks: [] } }]);
  await new OnfleetClient(ctx).request("/tasks/all");
  assertEquals(calls[0].url, "https://onfleet.com/api/v2/tasks/all");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: a body is sent bare, never wrapped in a type key", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "task_1" } }]);
  await new OnfleetClient(ctx).request("/tasks", {
    method: "POST",
    body: { notes: "hello" },
  });
  assertEquals(JSON.parse(calls[0].body!), { notes: "hello" });
});

Deno.test("client: query params are set on the URL and blanks dropped", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new OnfleetClient(ctx).request("/tasks/all", {
    query: { from: 1, to: undefined, lastId: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("from"), "1");
  assertEquals(url.searchParams.has("to"), false);
  assertEquals(url.searchParams.has("lastId"), false);
});

Deno.test("client: a 200 with no body resolves to undefined rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 200, body: undefined }]);
  assertEquals(await new OnfleetClient(ctx).request("/tasks/t1"), undefined);
});

Deno.test("describeError: an object message reports the nested message and cause", () => {
  const out = describeError(
    401,
    JSON.stringify({
      code: "InvalidCredentials",
      message: {
        error: 1102,
        message: "The API key provided is invalid.",
        cause: "This key does not exist or is no longer active.",
        request: "req-1",
      },
    }),
  );
  assert(out.includes("The API key provided is invalid."), out);
  assert(out.includes("This key does not exist"), out);
  assert(out.includes("req-1"), out);
});

Deno.test("describeError: a bare-string message is handled, not treated as invalid JSON", () => {
  const out = describeError(
    405,
    JSON.stringify({ code: "MethodNotAllowed", message: "GET is not allowed" }),
  );
  assert(out.includes("GET is not allowed"), out);
  assert(out.includes("MethodNotAllowed"), out);
});

Deno.test("describeError: a 429 names the shared 20 req/s budget", () => {
  const out = describeError(429, "{}");
  assert(/20 requests per second/.test(out), out);
});

Deno.test("describeError: a 412 explains container locking", () => {
  const out = describeError(412, "{}");
  assert(/locked by a concurrent update/.test(out), out);
});

Deno.test("client: an error carries the method, the path and Onfleet's message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { code: "NotFound", message: "The requested resource could not be found." },
  }]);
  await assertRejects(
    async () => await new OnfleetClient(ctx).request("/tasks/nope"),
    Error,
    "Onfleet 404 for GET /tasks/nope: The requested resource could not be found.",
  );
});
