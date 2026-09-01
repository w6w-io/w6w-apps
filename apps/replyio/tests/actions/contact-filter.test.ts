import { assertEquals } from "@std/assert";
import contactFilter from "../../actions/contact-filter.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-filter: POSTs rules and scoping, with top/skip as query params", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: 1 }]) }]);
  await contactFilter.execute(
    {
      rules: '[{"property":"title","condition":"contains","value":"CEO"}]',
      sequenceId: 9,
      top: 50,
      skip: 0,
    },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3/contacts/filter");
  assertEquals(queryOf(calls[0].url), { top: "50", skip: "0" });
  assertEquals(JSON.parse(calls[0].body!), {
    rules: [{ property: "title", condition: "contains", value: "CEO" }],
    sequenceId: 9,
  });
});

Deno.test("contact-filter: with no rules, still POSTs an (empty) body", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await contactFilter.execute({ searchTerm: "acme" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { searchTerm: "acme" });
});
