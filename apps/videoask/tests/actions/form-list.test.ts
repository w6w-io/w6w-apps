import { assertEquals } from "@std/assert";
import formList from "../../actions/form-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("form-list: defaults limit/offset and unwraps the page envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ form_id: "f1" }], { count: 1 }) }]);
  const out = await formList.execute({ limit: 20, offset: 0 }, ctx) as {
    count: number;
    results: unknown[];
  };
  assertEquals(pathOf(calls[0].url), "/forms");
  assertEquals(queryOf(calls[0].url), { limit: "20", offset: "0" });
  assertEquals(out.count, 1);
  assertEquals(out.results, [{ form_id: "f1" }]);
});

Deno.test("form-list: sends organization-id only when provided", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await formList.execute({ organizationId: "org-9" }, ctx);
  assertEquals(calls[0].headers["organization-id"], "org-9");
});
