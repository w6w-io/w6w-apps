import { assertEquals, assertRejects } from "@std/assert";
import {
  asJson,
  asOptionalJson,
  BrowseAiClient,
  compact,
  formatBrowseAiError,
} from "../../lib/client.ts";
import { errorBody, mockCtx } from "../_helpers.ts";

Deno.test("compact: drops undefined/null/empty-string but keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});

Deno.test("asOptionalJson: passes through a non-string value unchanged", () => {
  assertEquals(asOptionalJson({ a: 1 }, "x"), { a: 1 });
});

Deno.test("asOptionalJson: parses a JSON string", () => {
  assertEquals(asOptionalJson('{"a":1}', "x"), { a: 1 });
});

Deno.test("asOptionalJson: undefined/null/empty all mean absent", () => {
  assertEquals(asOptionalJson(undefined, "x"), undefined);
  assertEquals(asOptionalJson(null, "x"), undefined);
  assertEquals(asOptionalJson("", "x"), undefined);
});

Deno.test("asOptionalJson: throws with the field label on malformed JSON", () => {
  let threw = false;
  try {
    asOptionalJson("{not json", "Widget");
  } catch (e) {
    threw = true;
    assertEquals((e as Error).message, "Widget is not valid JSON");
  }
  assertEquals(threw, true);
});

Deno.test("asJson: throws with the field label when the value is absent", () => {
  let threw = false;
  try {
    asJson(undefined, "Widget");
  } catch (e) {
    threw = true;
    assertEquals((e as Error).message, "Widget is required");
  }
  assertEquals(threw, true);
});

Deno.test("formatBrowseAiError: surfaces the vendor's messageCode verbatim", () => {
  const raw = JSON.stringify({ statusCode: 400, messageCode: "invalid_robot_id" });
  const msg = formatBrowseAiError(400, "GET", "/v2/robots/x", raw);
  assertEquals(msg, "Browse AI 400 invalid_robot_id for GET /v2/robots/x");
});

Deno.test("formatBrowseAiError: adds a plain-English note for credits_limit_reached", () => {
  const raw = JSON.stringify({ statusCode: 403, messageCode: "credits_limit_reached" });
  const msg = formatBrowseAiError(403, "POST", "/v2/robots/x/tasks", raw);
  assertEquals(
    msg,
    "Browse AI 403 credits_limit_reached for POST /v2/robots/x/tasks: the account has run out " +
      "of task-run credits for this billing period",
  );
});

Deno.test("formatBrowseAiError: adds a plain-English note for robot_under_maintenance", () => {
  const raw = JSON.stringify({ statusCode: 503, messageCode: "robot_under_maintenance" });
  const msg = formatBrowseAiError(503, "POST", "/v2/robots/x/tasks", raw);
  assertEquals(
    msg,
    "Browse AI 503 robot_under_maintenance for POST /v2/robots/x/tasks: the robot is being " +
      "retrained or updated and cannot run tasks right now; retry later",
  );
});

Deno.test("formatBrowseAiError: surfaces cookie field errors from the errors[] array", () => {
  const raw = JSON.stringify(errorBody(400, "bad_request", {
    errors: [{
      name: "session",
      summary: "bad",
      fields: [{ field: "value", message: "Required" }],
    }],
  }));
  const msg = formatBrowseAiError(400, "PATCH", "/v2/robots/x/cookies", raw);
  assertEquals(
    msg,
    "Browse AI 400 bad_request for PATCH /v2/robots/x/cookies: session.value: Required",
  );
});

Deno.test("formatBrowseAiError: falls back to the raw body when it is not JSON", () => {
  const msg = formatBrowseAiError(500, "GET", "/v2/status", "<html>oops</html>");
  assertEquals(msg, "Browse AI 500 for GET /v2/status: <html>oops</html>");
});

Deno.test("BrowseAiClient: throws a formatted error on a non-ok response", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "not_found") }]);
  await assertRejects(
    async () => await new BrowseAiClient(ctx).request("/robots/x"),
    Error,
    "Browse AI 404 not_found for GET /v2/robots/x",
  );
});

Deno.test("BrowseAiClient: parses a successful JSON body", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { statusCode: 200, messageCode: "success" } }]);
  const out = await new BrowseAiClient(ctx).request("/status");
  assertEquals(out, { statusCode: 200, messageCode: "success" });
});

Deno.test("BrowseAiClient: sends a JSON body with the right content-type on POST", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { statusCode: 200 } }]);
  await new BrowseAiClient(ctx).request("/robots/x/tasks", {
    method: "POST",
    body: { recordVideo: true },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { recordVideo: true });
});
