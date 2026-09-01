import { assertEquals } from "@std/assert";
import { mockDripCtx } from "../_helpers.ts";
import action from "../../actions/list-custom-field-identifiers.ts";

Deno.test("list-custom-field-identifiers: GETs /custom_field_identifiers", async () => {
  const { ctx, calls } = mockDripCtx([{
    body: { custom_field_identifiers: ["first_name", "last_name"] },
  }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://api.getdrip.com/v2/1234567/custom_field_identifiers");
  assertEquals(out, { customFieldIdentifiers: ["first_name", "last_name"] });
});

Deno.test("list-custom-field-identifiers: defaults to an empty array", async () => {
  const { ctx } = mockDripCtx([{ body: {} }]);
  assertEquals(await action.execute({}, ctx), { customFieldIdentifiers: [] });
});
