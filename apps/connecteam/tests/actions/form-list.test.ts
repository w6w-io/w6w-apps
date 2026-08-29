import { assertEquals } from "@std/assert";
import formList from "../../actions/form-list.ts";
import { mockCtx, pagedEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("form-list: GETs /forms/v1/forms with the name/date filters", async () => {
  const { ctx, calls } = mockCtx([{ body: pagedEnvelope({ forms: [{ formId: 1 }] }) }]);
  const out = await formList.execute({ name: "Incident", startDate: "2026-01-01" }, ctx);
  assertEquals(pathOf(calls[0].url), "/forms/v1/forms");
  assertEquals(queryOf(calls[0].url), { name: "Incident", startDate: "2026-01-01" });
  assertEquals(out, { forms: [{ formId: 1 }], offset: 0 });
});
