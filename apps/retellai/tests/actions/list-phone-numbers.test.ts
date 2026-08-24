import { assertEquals } from "@std/assert";
import listPhoneNumbers from "../../actions/list-phone-numbers.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-phone-numbers: GETs /v2/list-phone-numbers with query-string pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await listPhoneNumbers.execute({ limit: 20, sortOrder: "descending" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/list-phone-numbers");
  assertEquals(calls[0].method, "GET");
  assertEquals(queryOf(calls[0].url), { limit: "20", sort_order: "descending" });
  assertEquals(calls[0].body, null);
});

Deno.test("list-phone-numbers: unwraps the items/has_more/pagination_key envelope", async () => {
  const { ctx } = mockCtx([{
    body: {
      items: [{ phone_number: "+14157774444", phone_number_type: "retell-twilio" }],
      has_more: false,
    },
  }]);
  const out = await listPhoneNumbers.execute({}, ctx);
  assertEquals(out.items, [{ phone_number: "+14157774444", phone_number_type: "retell-twilio" }]);
  assertEquals(out.has_more, false);
});
