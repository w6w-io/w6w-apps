import { assertEquals } from "@std/assert";
import formSubmissionList from "../../actions/form-submission-list.ts";
import { mockCtx, pagedEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("form-submission-list: GETs a form's submissions with the numeric-id filters", async () => {
  const { ctx, calls } = mockCtx([
    { body: pagedEnvelope({ formSubmissions: [{ id: "sub_1" }] }) },
  ]);
  const out = await formSubmissionList.execute({ formId: 1, userIds: "1,2" }, ctx);
  assertEquals(pathOf(calls[0].url), "/forms/v1/forms/1/form-submissions");
  assertEquals(queryOf(calls[0].url), { userIds: ["1", "2"] });
  assertEquals(out, { formSubmissions: [{ id: "sub_1" }], offset: 0 });
});
