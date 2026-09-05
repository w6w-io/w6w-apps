import { assertEquals } from "@std/assert";
import fieldCreate from "../../actions/field-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("field-create: POSTs to /v2/fields", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        data: { id: "f1", title: "New text field", type: "text", field_name: "{$new_text_field}" },
      },
    },
  ]);
  const out = await fieldCreate.execute({ title: "New text field", type: "text" }, ctx) as {
    field_name: string;
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/fields");
  assertEquals(JSON.parse(calls[0].body!), { title: "New text field", type: "text" });
  assertEquals(out.field_name, "{$new_text_field}");
});
