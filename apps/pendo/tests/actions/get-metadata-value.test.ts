import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-metadata-value.ts";

Deno.test("get-metadata-value: GETs the field path and decodes the JSON scalar", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: '"z.avala@pendo.io"' }]);
  const result = await action.execute!({
    kind: "visitor",
    group: "agent",
    id: "v1",
    fieldName: "email",
  }, ctx) as { value: unknown };

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://app.pendo.io/api/v1/metadata/visitor/agent/value/v1/email");
  assertEquals(result.value, "z.avala@pendo.io");
});

Deno.test("get-metadata-value: every field is required", async () => {
  for (const missing of ["kind", "group", "id", "fieldName"]) {
    const input: Record<string, unknown> = {
      kind: "visitor",
      group: "agent",
      id: "v1",
      fieldName: "email",
    };
    delete input[missing];
    await assertRejects(
      async () => await action.execute!(input, mockCtx([]).ctx),
      Error,
      `\`${missing}\` is required`,
    );
  }
});
