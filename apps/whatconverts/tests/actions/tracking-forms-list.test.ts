import { assertEquals } from "@std/assert";
import trackingFormsList from "../../actions/tracking-forms-list.ts";
import { API_ROOT, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("tracking-forms-list defaults forms_per_page to 25", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { forms: [] } }]);
  await trackingFormsList.execute({}, ctx);
  assertEquals(calls[0].url, `${API_ROOT}/tracking/forms?forms_per_page=25`);
});

Deno.test("tracking-forms-list forwards account/profile filters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { forms: [] } }]);
  await trackingFormsList.execute({ accountId: 1, profileId: 2 }, ctx);
  assertEquals(queryOf(calls[0].url), {
    forms_per_page: "25",
    account_id: "1",
    profile_id: "2",
  });
});
