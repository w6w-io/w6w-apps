import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  asOptionalJson,
  compact,
  formatHeyGenError,
  HeyGenClient,
  toList,
  truncate,
} from "../../lib/client.ts";
import { envelope, errorBody, listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("compact: drops undefined, null and empty string, keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});

Deno.test("asOptionalJson: passes through a non-string, parses a JSON string, errors on garbage", () => {
  assertEquals(asOptionalJson({ a: 1 }, "x"), { a: 1 });
  assertEquals(asOptionalJson('{"a":1}', "x"), { a: 1 });
  assertEquals(asOptionalJson(undefined, "x"), undefined);
  assertEquals(asOptionalJson("", "x"), undefined);
  let threw = false;
  try {
    asOptionalJson("not json", "variables");
  } catch (e) {
    threw = true;
    assert((e as Error).message.includes("variables"));
  }
  assert(threw);
});

Deno.test("toList: splits a comma-separated string and trims entries", () => {
  assertEquals(toList("Spanish (Spain), French"), ["Spanish (Spain)", "French"]);
  assertEquals(toList(["a", "b"]), ["a", "b"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList(undefined), undefined);
});

Deno.test("truncate: leaves short text alone, caps long text with a byte count", () => {
  assertEquals(truncate("short"), "short");
  const long = "x".repeat(700);
  const out = truncate(long, 600);
  assert(out.startsWith("x".repeat(600)));
  assert(out.includes("700 bytes truncated"));
});

Deno.test("formatHeyGenError: surfaces the vendor's code, message and param", () => {
  const raw = JSON.stringify(errorBody("insufficient_credit", "Not enough credits", null));
  const msg = formatHeyGenError(402, "POST", "/v3/videos", raw);
  assert(msg.includes("402 insufficient_credit"));
  assert(msg.includes("Not enough credits"));
});

Deno.test("formatHeyGenError: includes the param when the vendor names one", () => {
  const raw = JSON.stringify(errorBody("invalid_parameter", "Bad avatar_id", "avatar_id"));
  const msg = formatHeyGenError(400, "POST", "/v3/videos", raw);
  assert(msg.includes("param: avatar_id"));
});

Deno.test("formatHeyGenError: names the retry delay on a 429", () => {
  const raw = JSON.stringify(errorBody("rate_limit_exceeded", "Too many requests"));
  const msg = formatHeyGenError(429, "GET", "/v3/videos", raw, "12");
  assert(msg.includes("retry after 12s"), msg);
});

Deno.test("formatHeyGenError: falls back to the raw body when it is not the error envelope", () => {
  const msg = formatHeyGenError(500, "GET", "/v3/videos", "upstream exploded");
  assert(msg.includes("500"));
  assert(msg.includes("upstream exploded"));
});

Deno.test("HeyGenClient.data: unwraps the single-resource envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "v1", status: "completed" }) }]);
  const client = new HeyGenClient(ctx);
  const out = await client.data("/v3/videos/v1");

  assertEquals(pathOf(calls[0].url), "/v3/videos/v1");
  assertEquals(out, { id: "v1", status: "completed" });
});

/**
 * The list envelope carries `has_more`/`next_token` BESIDE `data`, not inside it — a plain
 * `.data()` unwrap would silently drop them. This is the one shape difference the client exists
 * to keep straight.
 */
Deno.test("HeyGenClient.list: keeps has_more/next_token alongside the items, not inside them", async () => {
  const { ctx } = mockCtx([
    { body: listEnvelope([{ id: "v1" }, { id: "v2" }], { has_more: true, next_token: "abc" }) },
  ]);
  const client = new HeyGenClient(ctx);
  const page = await client.list("/v3/videos");

  assertEquals(page.items, [{ id: "v1" }, { id: "v2" }]);
  assertEquals(page.hasMore, true);
  assertEquals(page.nextToken, "abc");
});

Deno.test("HeyGenClient: query params drop undefined/null/empty entries", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  const client = new HeyGenClient(ctx);
  await client.list("/v3/videos", { query: { limit: 10, token: undefined, title: "" } });

  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("limit"), "10");
  assertEquals(url.searchParams.has("token"), false);
  assertEquals(url.searchParams.has("title"), false);
});

Deno.test("HeyGenClient: a JSON body is sent with a content-type header", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ video_id: "v1", status: "waiting" }) }]);
  const client = new HeyGenClient(ctx);
  await client.data("/v3/videos", { method: "POST", body: { type: "avatar", avatar_id: "a1" } });

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { type: "avatar", avatar_id: "a1" });
});

Deno.test("HeyGenClient: a FormData body is sent without a manual content-type", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ asset_id: "a1", url: "https://x", mime_type: "image/png", size_bytes: 3 }) },
  ]);
  const client = new HeyGenClient(ctx);
  const form = new FormData();
  form.append("file", new Blob(["abc"]), "x.png");
  await client.data("/v3/assets", { method: "POST", form });

  assertEquals(calls[0].formKeys, ["file"]);
  assertEquals(calls[0].headers["content-type"], undefined);
});

Deno.test("HeyGenClient: a non-ok response throws a formatted error, not a raw HTTP failure", async () => {
  const { ctx } = mockCtx([
    {
      status: 404,
      body: errorBody("video_not_found", "No video, draft, or video translation was found"),
    },
  ]);
  const client = new HeyGenClient(ctx);
  await assertRejects(
    () => client.data("/v3/videos/bogus"),
    Error,
    "404 video_not_found",
  );
});

Deno.test("HeyGenClient: a 204 with no body resolves to undefined rather than throwing on JSON.parse", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  const client = new HeyGenClient(ctx);
  assertEquals(await client.json("/v3/videos/v1"), undefined);
});
