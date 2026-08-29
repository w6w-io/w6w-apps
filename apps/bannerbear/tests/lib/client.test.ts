import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  asOptionalJson,
  BannerbearClient,
  base64ToBytes,
  compact,
  formatBannerbearError,
  toList,
} from "../../lib/client.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("compact: drops undefined/null/empty-string, keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: false, e: 0, f: "x" },
  );
});

Deno.test("asOptionalJson: parses a JSON string, passes through an object, rejects garbage", () => {
  assertEquals(asOptionalJson('{"a":1}', "x"), { a: 1 });
  assertEquals(asOptionalJson({ a: 1 }, "x"), { a: 1 });
  assertEquals(asOptionalJson(undefined, "x"), undefined);
  assertEquals(asOptionalJson("", "x"), undefined);
  assertThrows(() => asOptionalJson("{not json", "modifications"), Error, "modifications");
});

Deno.test("toList: splits comma-separated strings and passes through arrays", () => {
  assertEquals(toList("a, b ,c"), ["a", "b", "c"]);
  assertEquals(toList(["a", "b"]), ["a", "b"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList(undefined), undefined);
});

Deno.test("base64ToBytes: decodes plain base64 and a data: URI the same way", () => {
  const plain = base64ToBytes("aGVsbG8=");
  const dataUri = base64ToBytes("data:image/png;base64,aGVsbG8=");
  assertEquals(new TextDecoder().decode(plain), "hello");
  assertEquals(new TextDecoder().decode(dataUri), "hello");
});

Deno.test("formatBannerbearError: surfaces the vendor message and a fix hint per status", () => {
  const msg = formatBannerbearError(
    402,
    "POST",
    "/images",
    JSON.stringify({ message: "no quota" }),
  );
  assert(msg.includes("no quota"));
  assert(/quota is exhausted/i.test(msg));
});

Deno.test("formatBannerbearError: falls back to the raw body when it is not JSON", () => {
  const msg = formatBannerbearError(500, "GET", "/account", "upstream exploded");
  assert(msg.includes("upstream exploded"));
});

Deno.test("BannerbearClient.json: GET with query params, JSON parsed", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ uid: "a" }] }]);
  const client = new BannerbearClient(ctx);
  const out = await client.json("/images", { query: { page: 2 } });
  assertEquals(out, [{ uid: "a" }]);
  assertEquals(pathOf(calls[0].url), "/images");
  assertEquals(new URL(calls[0].url).searchParams.get("page"), "2");
});

Deno.test("BannerbearClient.json: a non-ok response throws a formatted error", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("not found") }]);
  const client = new BannerbearClient(ctx);
  await assertRejectsMessage(() => client.json("/images/missing"), /404/);
});

Deno.test("BannerbearClient.uploadAsset: sends raw bytes with the given content type", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { uid: "a1", url: "https://cdn/x.png" } }]);
  const client = new BannerbearClient(ctx);
  const out = await client.uploadAsset(base64ToBytes("aGVsbG8="), "image/png") as {
    uid: string;
  };
  assertEquals(out.uid, "a1");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "image/png");
  assertEquals(pathOf(calls[0].url), "/assets");
});

async function assertRejectsMessage(fn: () => Promise<unknown>, pattern: RegExp) {
  try {
    await fn();
  } catch (err) {
    assert(pattern.test((err as Error).message), (err as Error).message);
    return;
  }
  throw new Error("expected a rejection");
}
