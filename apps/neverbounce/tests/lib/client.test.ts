import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { formatNeverBounceError, NeverBounceClient } from "../../lib/client.ts";

Deno.test("formatNeverBounceError: includes the path and status, and the message when present", () => {
  const withMessage = formatNeverBounceError("/account/info", "auth_failure", "Invalid API Key");
  assert(withMessage.includes("/account/info"));
  assert(withMessage.includes("auth_failure"));
  assert(withMessage.includes("Invalid API Key"));

  const withoutMessage = formatNeverBounceError("/single/check", "general_failure");
  assert(withoutMessage.includes("general_failure"));
});

Deno.test("NeverBounceClient.request: builds the URL against the fixed host/version and query params", async () => {
  const { ctx, calls } = mockCtx([
    { body: { status: "success", credits_info: {}, job_counts: {} } },
  ]);
  const client = new NeverBounceClient(ctx);
  const result = await client.request("/account/info", { query: { key: "x" } });

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.neverbounce.com");
  assertEquals(url.pathname, "/v4.2/account/info");
  assertEquals(url.searchParams.get("key"), "x");
  assertEquals(result.status, "success");
});

Deno.test("NeverBounceClient.request: sends a JSON body with content-type on POST", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", job_id: 1 } }]);
  const client = new NeverBounceClient(ctx);
  await client.request("/jobs/create", { method: "POST", body: { input_location: "supplied" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { input_location: "supplied" });
});

Deno.test("NeverBounceClient.request: throws on a non-2xx status with no parseable status field", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  const client = new NeverBounceClient(ctx);
  await assertRejects(() => client.request("/account/info"), Error, "500");
});

Deno.test("NeverBounceClient.request: throws on a documented non-success status even on HTTP 200", async () => {
  // `docs/error-handling`: "these error messages will be returned with a 200
  // level status code" — this is the case that catches a client which gates
  // on `res.ok` instead of the body's `status` field.
  const { ctx } = mockCtx([{
    status: 200,
    body: { status: "general_failure", message: "Missing required parameter 'key'" },
  }]);
  const client = new NeverBounceClient(ctx);
  await assertRejects(
    () => client.request("/account/info"),
    Error,
    "Missing required parameter",
  );
});

Deno.test("NeverBounceClient.downloadCsv: returns the raw text body on success", async () => {
  const csv = "id,email,email_status\n1,a@b.com,valid";
  const { ctx, calls } = mockCtx([{ body: csv, headers: { "content-type": "text/csv" } }]);
  const client = new NeverBounceClient(ctx);
  const result = await client.downloadCsv({ job_id: 1 });

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v4.2/jobs/download");
  assertEquals(url.searchParams.get("job_id"), "1");
  assertEquals(result, csv);
});

Deno.test("NeverBounceClient.downloadCsv: throws when the body is JSON carrying a non-success status", async () => {
  const { ctx } = mockCtx([{ body: { status: "auth_failure", message: "Invalid API Key" } }]);
  const client = new NeverBounceClient(ctx);
  await assertRejects(() => client.downloadCsv({ job_id: 1 }), Error, "auth_failure");
});

Deno.test("NeverBounceClient.downloadCsv: omits undefined/empty query values", async () => {
  const { ctx, calls } = mockCtx([{ body: "id,email\n" }]);
  const client = new NeverBounceClient(ctx);
  await client.downloadCsv({ job_id: 1, only_duplicates: undefined, valids: "" });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("only_duplicates"), false);
  assertEquals(url.searchParams.has("valids"), false);
});
