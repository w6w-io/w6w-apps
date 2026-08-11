import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  API_URL,
  describeError,
  EmailOctopusClient,
  PAGE_PARAMS,
  pageQuery,
  seg,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: the base URL carries the version in the host, not the path", () => {
  assertEquals(API_URL, "https://api.emailoctopus.com");
  assert(!API_URL.includes("/v2"), "v2 paths are bare — /lists, not /v2/lists");
});

Deno.test("client: drops undefined, null and empty-string query values", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new EmailOctopusClient(ctx).request("/lists", {
    query: { limit: 10, starting_after: undefined, tag: "", status: null, keep: false },
  });
  const p = new URL(calls[0].url).searchParams;
  assertEquals([...p.keys()].sort(), ["keep", "limit"]);
  assertEquals(p.get("keep"), "false", "an explicit false is a value, not an omission");
});

Deno.test("client: sets content-type only when there is a body", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }, { body: {} }]);
  const client = new EmailOctopusClient(ctx);
  await client.request("/lists/l1", { method: "DELETE" });
  await client.request("/lists", { method: "POST", body: { name: "x" } });
  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(calls[1].headers["content-type"], "application/json");
  assertEquals(calls[1].body, '{"name":"x"}');
});

Deno.test("client: returns undefined for 204 and for an empty 200 body", async () => {
  const { ctx } = mockCtx([{ status: 204 }, { status: 200, body: "" }]);
  const client = new EmailOctopusClient(ctx);
  assertEquals(await client.request("/a", { method: "DELETE" }), undefined);
  assertEquals(await client.request("/b"), undefined);
});

Deno.test("client: an absolute URL is used as-is (following paging.next.url)", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new EmailOctopusClient(ctx).request(
    "https://api.emailoctopus.com/lists/l1/contacts?starting_after=abc&limit=100",
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/lists/l1/contacts");
  assertEquals(url.searchParams.get("starting_after"), "abc");
});

Deno.test("client: throws with the RFC 7807 detail, pointer list and type", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: {
      title: "An error occurred.",
      detail: "Unprocessable content.",
      status: 422,
      type: "https://emailoctopus.com/api-documentation/v2#unprocessable-content",
      errors: [{ detail: "This value should not be blank.", pointer: "/email_address" }],
    },
  }]);
  const err = await assertRejects(
    () => new EmailOctopusClient(ctx).request("/lists/l1/contacts", { method: "POST", body: {} }),
    Error,
  );
  assert(err.message.includes("422"));
  assert(err.message.includes("POST /lists/l1/contacts"));
  assert(err.message.includes("Unprocessable content."));
  assert(err.message.includes("/email_address: This value should not be blank."));
  assert(err.message.includes("#unprocessable-content"));
});

Deno.test("client: falls back to the raw text when the error body is not JSON", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "<html>Bad gateway</html>" }]);
  const err = await assertRejects(() => new EmailOctopusClient(ctx).request("/lists"), Error);
  assert(err.message.includes("Bad gateway"));
});

Deno.test("describeError: prefers detail, then title, then the status", () => {
  assertEquals(describeError(400, { detail: "Bad request." }, ""), "Bad request.");
  assertEquals(describeError(400, { title: "An error occurred." }, ""), "An error occurred.");
  assertEquals(describeError(400, {}, ""), "HTTP 400");
  assertEquals(describeError(400, null, "raw text"), "raw text");
});

Deno.test("pageQuery maps the two shared page inputs onto the API's names", () => {
  assertEquals(pageQuery({ limit: 10, startingAfter: "c" }), {
    limit: 10,
    starting_after: "c",
  });
  assertEquals(pageQuery({}), { limit: undefined, starting_after: undefined });
});

Deno.test("PAGE_PARAMS caps limit at the documented maximum of 100", () => {
  const limit = PAGE_PARAMS.find((p) => p.key === "limit")!;
  assertEquals((limit as { validation?: { max?: number } }).validation?.max, 100);
});

Deno.test("seg percent-encodes a path segment", () => {
  assertEquals(seg("First Name"), "First%20Name");
  assertEquals(seg("a/b"), "a%2Fb");
  assertEquals(seg("00000000-0000-0000-0000-000000000000"), "00000000-0000-0000-0000-000000000000");
});
