import { assertEquals } from "@std/assert";
import usersList from "../../actions/users-list.ts";
import { API_ROOT, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("users-list defaults users_per_page to 25", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { users: [] } }]);
  await usersList.execute({}, ctx);
  assertEquals(calls[0].url, `${API_ROOT}/users?users_per_page=25`);
});

Deno.test("users-list forwards ordering, date range and user_type filters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { users: [] } }]);
  await usersList.execute({
    usersPerPage: 50,
    pageNumber: 2,
    startDate: "2015-11-10",
    endDate: "2015-12-01",
    order: "asc",
    userType: "account",
  }, ctx);
  assertEquals(queryOf(calls[0].url), {
    users_per_page: "50",
    page_number: "2",
    start_date: "2015-11-10",
    end_date: "2015-12-01",
    order: "asc",
    user_type: "account",
  });
});
