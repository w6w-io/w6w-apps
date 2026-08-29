import { assertEquals } from "@std/assert";
import formSubmissionGet from "../../actions/form-submission-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("form-submission-get: GETs one submission, wrapped under 'formSubmission'", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ formSubmission: { id: "sub_1" } }) }]);
  const out = await formSubmissionGet.execute({ formId: 1, formSubmissionId: "sub_1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/forms/v1/forms/1/form-submissions/sub_1");
  assertEquals(out, { formSubmission: { id: "sub_1" } });
});
