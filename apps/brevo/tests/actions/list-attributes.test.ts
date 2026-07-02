import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-attributes.ts";

Deno.test("list-attributes: GETs /v3/contacts/attributes and returns the envelope", async () => {
  const body = {
    attributes: [
      { name: "FIRSTNAME", category: "normal" },
      { name: "AGE", category: "calculated" },
    ],
  };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/contacts/attributes");
  assertEquals(result, body);
});

Deno.test("list-attributes: applies limit client-side when provided", async () => {
  const body = {
    attributes: [
      { name: "A" },
      { name: "B" },
      { name: "C" },
    ],
  };
  const { ctx } = mockCtx([{ body }]);
  const result = await action.execute!({ limit: 2 }, ctx) as { attributes: unknown[] };
  assertEquals(result.attributes.length, 2);
});
