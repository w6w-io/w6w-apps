import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  asOptionalJson,
  CannyClient,
  compact,
  formatCannyError,
  toList,
  v2,
} from "../../lib/client.ts";
import { bodyOf, errorBody, mockCtx } from "../_helpers.ts";

Deno.test("CannyClient.post: posts JSON to the v1 host and path, no apiKey added", async () => {
  const { ctx, calls } = mockCtx([{ body: { boards: [] } }]);
  const out = await new CannyClient(ctx).post("/boards/list");

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://canny.io/api/v1/boards/list");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(bodyOf(calls[0]), {});
  assertEquals(out, { boards: [] });
});

Deno.test("CannyClient.post: drops undefined/null/empty-string params, keeps false and 0", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new CannyClient(ctx).post("/posts/update", {
    postID: "p1",
    title: undefined,
    details: null,
    eta: "",
    etaPublic: false,
    limit: 0,
  });

  assertEquals(bodyOf(calls[0]), { postID: "p1", etaPublic: false, limit: 0 });
});

Deno.test("v2: targets the /api/v2 prefix", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await v2(ctx).post("/votes/list");

  assertEquals(calls[0].url, "https://canny.io/api/v2/votes/list");
});

Deno.test("CannyClient.post: a Canny error surfaces the vendor's message", async () => {
  const { ctx } = mockCtx([{ status: 400, body: errorBody("invalid post id") }]);

  await assertRejects(
    () => new CannyClient(ctx).post("/posts/retrieve", { id: "bogus" }),
    Error,
    "invalid post id",
  );
});

Deno.test("CannyClient.postMessage: unwraps a JSON-quoted confirmation string", async () => {
  const { ctx } = mockCtx([{ body: '"success"' }]);
  const message = await new CannyClient(ctx).postMessage("/posts/delete", { postID: "p1" });
  assertEquals(message, "success");
});

Deno.test("CannyClient.postMessage: also accepts a bare unquoted confirmation string", async () => {
  const { ctx } = mockCtx([{ body: "success" }]);
  const message = await new CannyClient(ctx).postMessage("/posts/delete", { postID: "p1" });
  assertEquals(message, "success");
});

Deno.test("formatCannyError: carries Canny's own message, not a generic HTTP line", () => {
  const message = formatCannyError(
    400,
    "/posts/retrieve",
    JSON.stringify(errorBody("invalid post id")),
  );
  assert(message.includes("invalid post id"));
  assert(message.includes("400"));
});

Deno.test("formatCannyError: falls back to the raw body when it isn't JSON", () => {
  const message = formatCannyError(500, "/boards/list", "upstream exploded");
  assert(message.includes("upstream exploded"));
});

Deno.test("toList: normalises a comma string, an array, and drops empties", () => {
  assertEquals(toList("a, b ,c"), ["a", "b", "c"]);
  assertEquals(toList(["a", "b"]), ["a", "b"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList(undefined), undefined);
});

Deno.test("asOptionalJson: parses a JSON string, passes through an object, rejects garbage", () => {
  assertEquals(asOptionalJson('{"a":1}', "customFields"), { a: 1 });
  assertEquals(asOptionalJson({ a: 1 }, "customFields"), { a: 1 });
  assertEquals(asOptionalJson(undefined, "customFields"), undefined);
  let threw = false;
  try {
    asOptionalJson("not json", "customFields");
  } catch {
    threw = true;
  }
  assert(threw);
});

Deno.test("compact: drops undefined/null/empty-string, keeps false/0/[]", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: [], g: "x" }),
    { d: false, e: 0, f: [], g: "x" },
  );
});
