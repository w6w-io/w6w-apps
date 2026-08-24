import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  ClickSendClient,
  compact,
  formatClickSendError,
  partialFailures,
  truncate,
} from "../../lib/client.ts";

Deno.test("compact: drops undefined/null/empty-string keys, keeps false and 0", () => {
  const out = compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0, g: "x" });
  assertEquals(out, { a: 1, e: false, f: 0, g: "x" });
});

Deno.test("truncate: passes short text through unchanged", () => {
  assertEquals(truncate("hi"), "hi");
});

Deno.test("truncate: caps long text and reports the original length", () => {
  const long = "x".repeat(700);
  const out = truncate(long, 10);
  assertEquals(out.startsWith("x".repeat(10)), true);
  assertEquals(out.includes("700 bytes truncated"), true);
});

Deno.test("formatClickSendError: surfaces response_code and response_msg verbatim", () => {
  const raw = JSON.stringify({
    http_code: 401,
    response_code: "UNAUTHORIZED",
    response_msg: "Authorization failed.",
    data: null,
  });
  const msg = formatClickSendError(401, "GET", "/account", raw);
  assertEquals(msg.includes("UNAUTHORIZED"), true);
  assertEquals(msg.includes("Authorization failed."), true);
  assertEquals(msg.includes("GET /account"), true);
});

Deno.test("formatClickSendError: falls back to the raw body when it isn't the envelope shape", () => {
  const msg = formatClickSendError(500, "POST", "/sms/send", "<html>gateway error</html>");
  assertEquals(msg.includes("500"), true);
  assertEquals(msg.includes("gateway error"), true);
});

Deno.test("partialFailures: reports only non-SUCCESS entries with their recipient", () => {
  const failures = partialFailures([
    { to: "+1", status: "SUCCESS" },
    { to: "+2", status: "INVALID_RECIPIENT" },
    { to: "+3", status: "INSUFFICIENT_CREDIT" },
  ]);
  assertEquals(failures, ["+2: INVALID_RECIPIENT", "+3: INSUFFICIENT_CREDIT"]);
});

Deno.test("partialFailures: empty/undefined input yields no failures", () => {
  assertEquals(partialFailures(undefined), []);
  assertEquals(partialFailures([]), []);
});

Deno.test("ClickSendClient.data: unwraps the envelope's data field", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        http_code: 200,
        response_code: "SUCCESS",
        response_msg: "ok",
        data: { total: 1 },
      },
    },
  ]);
  const client = new ClickSendClient(ctx);
  const data = await client.data<{ total: number }>("/countries");
  assertEquals(data.total, 1);
  assertEquals(calls[0].url, "https://rest.clicksend.com/v3/countries");
  assertEquals(calls[0].method, "GET");
});

Deno.test("ClickSendClient: drops empty query params and sends JSON body with content-type", async () => {
  const { ctx, calls } = mockCtx([
    { body: { http_code: 200, response_code: "SUCCESS", response_msg: "ok", data: {} } },
    { body: { http_code: 200, response_code: "SUCCESS", response_msg: "ok", data: {} } },
  ]);
  const client = new ClickSendClient(ctx);
  await client.data("/sms/history", { query: { page: 1, q: "", limit: undefined } });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("page"), "1");
  assertEquals(url.searchParams.has("q"), false);
  assertEquals(url.searchParams.has("limit"), false);

  await client.data("/lists", { method: "POST", body: { list_name: "x" } });
  assertEquals(calls[1].headers["content-type"], "application/json");
  assertEquals(calls[1].body, JSON.stringify({ list_name: "x" }));
});

Deno.test("ClickSendClient: throws a formatted error on a non-2xx envelope", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: {
        http_code: 401,
        response_code: "UNAUTHORIZED",
        response_msg: "Authorization failed.",
        data: null,
      },
    },
  ]);
  const client = new ClickSendClient(ctx);
  await assertRejects(
    () => client.data("/account"),
    Error,
    "UNAUTHORIZED",
  );
});

Deno.test("ClickSendClient: throws when the body isn't JSON at all", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "<html>bad gateway</html>" }]);
  const client = new ClickSendClient(ctx);
  await assertRejects(() => client.data("/account"), Error, "non-JSON body");
});
