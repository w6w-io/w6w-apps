import { assertEquals } from "@std/assert";
import profilesList from "../../actions/profiles-list.ts";
import { API_ROOT, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("profiles-list requests under the account path with default page size", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { profiles: [] } }]);
  await profilesList.execute({ accountId: 5411295 }, ctx);
  assertEquals(calls[0].url, `${API_ROOT}/accounts/5411295/profiles?profiles_per_page=25`);
});

Deno.test("profiles-list forwards pagination and ordering filters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { profiles: [] } }]);
  await profilesList.execute({
    accountId: 1,
    profilesPerPage: 50,
    pageNumber: 2,
    order: "asc",
  }, ctx);
  assertEquals(queryOf(calls[0].url), { profiles_per_page: "50", page_number: "2", order: "asc" });
});
