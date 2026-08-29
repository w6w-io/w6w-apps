import { assertEquals } from "@std/assert";
import trackingNumbersList from "../../actions/tracking-numbers-list.ts";
import { API_ROOT, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("tracking-numbers-list defaults numbers_per_page to 25", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { numbers: [] } }]);
  await trackingNumbersList.execute({}, ctx);
  assertEquals(calls[0].url, `${API_ROOT}/tracking/numbers?numbers_per_page=25`);
});

Deno.test("tracking-numbers-list forwards account/profile filters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { numbers: [] } }]);
  await trackingNumbersList.execute({ accountId: 1, profileId: 2, pageNumber: 3 }, ctx);
  assertEquals(queryOf(calls[0].url), {
    numbers_per_page: "25",
    account_id: "1",
    profile_id: "2",
    page_number: "3",
  });
});
