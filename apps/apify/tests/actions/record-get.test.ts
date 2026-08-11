import { assert, assertEquals } from "@std/assert";
import recordGet from "../../actions/record-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

/**
 * The vendor's third documented envelope exception: the body is the stored
 * value, served under the content type it was written with.
 */
Deno.test("record-get: a JSON record comes back parsed", async () => {
  const { ctx, calls } = mockCtx([
    { body: { total: 7 }, headers: { "content-type": "application/json; charset=utf-8" } },
  ]);
  const out = await recordGet.execute({ storeId: "s1", recordKey: "OUTPUT" }, ctx) as {
    value: unknown;
    isJson: boolean;
    contentType: string;
  };

  assertEquals(pathOf(calls[0].url), "/v2/key-value-stores/s1/records/OUTPUT");
  assertEquals(calls[0].headers.accept, "*/*");
  assertEquals(out.value, { total: 7 });
  assertEquals(out.isJson, true);
  assertEquals(out.contentType, "application/json; charset=utf-8");
});

Deno.test("record-get: a text record comes back as text, unparsed", async () => {
  const { ctx } = mockCtx([
    { body: "hello, world", headers: { "content-type": "text/plain; charset=utf-8" } },
  ]);
  const out = await recordGet.execute({ storeId: "s1", recordKey: "note" }, ctx) as {
    value: unknown;
    isJson: boolean;
  };
  assertEquals(out.value, "hello, world");
  assertEquals(out.isJson, false);
});

/**
 * A run's OUTPUT is very often a screenshot or a zip. Decoding those bytes as a
 * string is lossy and irreversible, so the action reports the record rather than
 * returning something that looks like data and is not.
 */
Deno.test("record-get: a binary record is reported, not returned mangled", async () => {
  const { ctx } = mockCtx([{ body: "PNG...", headers: { "content-type": "image/png" } }]);
  const out = await recordGet.execute({ storeId: "s1", recordKey: "screenshot" }, ctx) as {
    value: unknown;
    note?: string;
    contentType: string;
  };

  assertEquals(out.value, null);
  assertEquals(out.contentType, "image/png");
  assert(/not text/i.test(out.note ?? ""), out.note);
});

Deno.test("record-get: a record served as JSON that is not JSON degrades to text", async () => {
  const { ctx } = mockCtx([
    { body: "{definitely not json", headers: { "content-type": "application/json" } },
  ]);
  const out = await recordGet.execute({ storeId: "s1", recordKey: "broken" }, ctx) as {
    value: unknown;
    isJson: boolean;
    note?: string;
  };
  assertEquals(out.value, "{definitely not json");
  assertEquals(out.isJson, false);
  assert(/did not parse/i.test(out.note ?? ""), out.note);
});

/**
 * Apify makes small security-motivated edits to stored HTML before serving it;
 * `attachment` is the only documented way to get the bytes back unmodified.
 */
Deno.test("record-get: attachment is sent only when requested", async () => {
  const { ctx, calls } = mockCtx([
    { body: "<html></html>", headers: { "content-type": "text/html" } },
    { body: "<html></html>", headers: { "content-type": "text/html" } },
  ]);
  await recordGet.execute({ storeId: "s1", recordKey: "page" }, ctx);
  assert(!("attachment" in queryOf(calls[0].url)));

  await recordGet.execute({ storeId: "s1", recordKey: "page", attachment: true }, ctx);
  assertEquals(queryOf(calls[1].url).attachment, "1");
});

Deno.test("record-get: a record key with a slash cannot escape the path", async () => {
  const { ctx, calls } = mockCtx([{ body: "", headers: { "content-type": "text/plain" } }]);
  await recordGet.execute({ storeId: "s1", recordKey: "a/b" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/key-value-stores/s1/records/a%2Fb");
});
