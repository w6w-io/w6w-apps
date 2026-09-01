import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/set-metadata-value.ts";

Deno.test("set-metadata-value: PUTs the raw JSON value to the field path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const result = await action.execute!({
    kind: "visitor",
    group: "custom",
    id: "v1",
    fieldName: "plan",
    value: '"pro"',
  }, ctx) as { ok: boolean };

  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://app.pendo.io/api/v1/metadata/visitor/custom/value/v1/plan");
  assertEquals(calls[0].body, '"pro"');
  assertEquals(result.ok, true);
});

Deno.test("set-metadata-value: accepts a non-string JSON value (number, boolean, array)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  await action.execute!({
    kind: "account",
    group: "custom",
    id: "a1",
    fieldName: "seats",
    value: "42",
  }, ctx);
  assertEquals(calls[0].body, "42");
});

Deno.test("set-metadata-value: encodes path segments", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  await action.execute!({
    kind: "visitor",
    group: "custom",
    id: "a b",
    fieldName: "f/1",
    value: "true",
  }, ctx);
  assert(calls[0].url.includes("/value/a%20b/f%2F1"));
});

Deno.test("set-metadata-value: every field is required", async () => {
  for (const missing of ["kind", "group", "id", "fieldName"]) {
    const input: Record<string, unknown> = {
      kind: "visitor",
      group: "custom",
      id: "v1",
      fieldName: "plan",
      value: "1",
    };
    delete input[missing];
    await assertRejects(
      async () => await action.execute!(input, mockCtx([]).ctx),
      Error,
      `\`${missing}\` is required`,
    );
  }
});

Deno.test("set-metadata-value: `value` is required", async () => {
  await assertRejects(
    async () =>
      await action.execute!(
        { kind: "visitor", group: "custom", id: "v1", fieldName: "plan" },
        mockCtx([]).ctx,
      ),
    Error,
    "`value` is required",
  );
});
