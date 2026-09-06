import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API_URL,
  CapsuleClient,
  compact,
  errorMessage,
  nextPageFromLink,
  unset,
} from "../../lib/client.ts";

Deno.test("client: builds the URL against api.capsulecrm.com/api/v2", async () => {
  const { ctx, calls } = mockCtx([{ body: { parties: [] } }]);
  await new CapsuleClient(ctx).request("/parties");
  assertEquals(calls[0].url, "https://api.capsulecrm.com/api/v2/parties");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("client: surfaces Capsule's {message, errors[]} envelope", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    statusText: "Unprocessable Entity",
    body: {
      message: "Validation Failed",
      errors: [{ message: "name is required", field: "name" }],
    },
  }]);
  await assertRejects(
    () => new CapsuleClient(ctx).request("/parties", { method: "POST", body: {} }),
    Error,
    "Validation Failed (name: name is required)",
  );
});

Deno.test("client: surfaces the flatter 429 {error} envelope", async () => {
  const { ctx } = mockCtx([{ status: 429, body: { error: "rate limit reached" } }]);
  await assertRejects(
    () => new CapsuleClient(ctx).request("/parties"),
    Error,
    "rate limit reached",
  );
});

Deno.test("client: falls back to the raw body when neither documented shape matches", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "internal error", headers: {} }]);
  await assertRejects(() => new CapsuleClient(ctx).request("/parties"), Error, "internal error");
});

Deno.test("client: returns undefined data + the real status for an empty body (204 delete)", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  const result = await new CapsuleClient(ctx).request("/parties/1", { method: "DELETE" });
  assertEquals(result.data, undefined);
  assertEquals(result.status, 204);
});

Deno.test("client: surfaces a 202 (deferred long-running delete) status distinctly from 204", async () => {
  const { ctx } = mockCtx([{ status: 202, body: undefined, headers: {} }]);
  const result = await new CapsuleClient(ctx).request("/parties/1", { method: "DELETE" });
  assertEquals(result.status, 202);
});

Deno.test("client: drops undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { parties: [] } }]);
  await new CapsuleClient(ctx).request("/parties", {
    query: { page: 2, perPage: undefined, since: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.has("perPage"), false);
  assertEquals(url.searchParams.has("since"), false);
});

Deno.test("client: sends content-type + JSON body only when a body is given", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { party: {} } }]);
  await new CapsuleClient(ctx).request("/parties", {
    method: "POST",
    body: { party: { name: "Acme" } },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { party: { name: "Acme" } });
});

Deno.test('nextPageFromLink: reads the page number out of rel="next"', () => {
  assertEquals(
    nextPageFromLink('<https://api.capsulecrm.com/api/v2/parties?page=4>; rel="next"'),
    4,
  );
});

Deno.test("nextPageFromLink: undefined when there is no next link (last page)", () => {
  assertEquals(nextPageFromLink(null), undefined);
  assertEquals(
    nextPageFromLink('<https://api.capsulecrm.com/api/v2/parties?page=1>; rel="prev"'),
    undefined,
  );
});

Deno.test('nextPageFromLink: picks rel="next" out of a multi-entry header', () => {
  assertEquals(
    nextPageFromLink(
      '<https://api.capsulecrm.com/api/v2/parties?page=3>; rel="next", ' +
        '<https://api.capsulecrm.com/api/v2/parties?page=1>; rel="prev"',
    ),
    3,
  );
});

Deno.test("errorMessage: parses {message}, {error}, and falls back to raw text", () => {
  assertEquals(errorMessage('{"message":"nope"}'), "nope");
  assertEquals(errorMessage('{"error":"rate limit reached"}'), "rate limit reached");
  assertEquals(errorMessage("plain text error"), "plain text error");
  assertEquals(errorMessage(""), "");
});

Deno.test("compact/unset drop undefined and blank values", () => {
  assertEquals(compact({ a: 0, b: undefined, c: "x" }), { a: 0, c: "x" });
  assertEquals(unset(""), undefined);
  assertEquals(unset("x"), "x");
});

Deno.test("API_URL points at the versioned root", () => {
  assertEquals(API_URL, "https://api.capsulecrm.com/api/v2");
});
