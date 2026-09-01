import { assertEquals, assertRejects } from "@std/assert";
import { DEFAULT_DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get.ts";

Deno.test("user-get: reads one user by id", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { user: { id: "u1", name: "Ada", siteRole: "Explorer" } } }],
    { display: DEFAULT_DISPLAY },
  );
  const result = await action.execute!({ userId: "u1" }, ctx);
  assertEquals(result, { id: "u1", name: "Ada", siteRole: "Explorer" });
  assertEquals(new URL(calls[0].url).pathname, "/api/3.21/sites/site-1/users/u1");
});

Deno.test("user-get: requires a userId before any network call", async () => {
  const { ctx, calls } = mockCtx([], { display: DEFAULT_DISPLAY });
  await assertRejects(
    () => Promise.resolve(action.execute!({}, ctx)),
    Error,
    "`userId` is required",
  );
  assertEquals(calls.length, 0);
});
