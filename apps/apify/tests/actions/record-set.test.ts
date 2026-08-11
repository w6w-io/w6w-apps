import { assertEquals } from "@std/assert";
import recordSet from "../../actions/record-set.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("record-set: PUTs the value as JSON under the default content type", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  const out = await recordSet.execute(
    { storeId: "s1", recordKey: "OUTPUT", value: { total: 7 } },
    ctx,
  ) as { contentType: string; status: number };

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/key-value-stores/s1/records/OUTPUT");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"total":7}');
  assertEquals(out.contentType, "application/json");
  assertEquals(out.status, 201);
});

/**
 * The content type is stored *with* the record and is what Get Store Record
 * serves it back under — a JSON string written as text/plain reads back as a
 * string forever.
 */
Deno.test("record-set: a textual content type stores the value verbatim", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await recordSet.execute(
    { storeId: "s1", recordKey: "note", value: "hello", contentType: "text/plain" },
    ctx,
  );
  assertEquals(calls[0].headers["content-type"], "text/plain");
  assertEquals(calls[0].body, "hello");
});

Deno.test("record-set: a JSON string value is parsed before being re-serialized", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await recordSet.execute({ storeId: "s1", recordKey: "k", value: '{"a":1}' }, ctx);
  assertEquals(calls[0].body, '{"a":1}');
});

/** A PUT is a full overwrite, so writing the same value twice is a no-op. */
Deno.test("record-set: is declared idempotent", () => {
  assertEquals(recordSet.idempotent, true);
});
