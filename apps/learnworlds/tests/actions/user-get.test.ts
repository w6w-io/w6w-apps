import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get.ts";

const conn = { display: { schoolDomain: "https://yourschool.learnworlds.com" } };

Deno.test("user-get: GETs /v2/users/{id}, accepting an email as the id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1", email: "a@b.com" } }], conn);
  await action.execute!({ id: "a@b.com" }, ctx);
  assertEquals(
    calls[0].url,
    "https://yourschool.learnworlds.com/admin/api/v2/users/a%40b.com",
  );
});
