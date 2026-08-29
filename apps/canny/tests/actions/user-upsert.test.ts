import { assertEquals } from "@std/assert";
import userUpsert from "../../actions/user-upsert.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("user-upsert: posts to /v1/users/create_or_update, never find_or_create", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1" } }]);
  const out = await userUpsert.execute(
    { name: "Sally Doe", email: "sally@example.com", companies: '[{"id":"co1","name":"Acme"}]' },
    ctx,
  ) as { id: string };

  assertEquals(calls[0].url, "https://canny.io/api/v1/users/create_or_update");
  assertEquals(bodyOf(calls[0]), {
    name: "Sally Doe",
    email: "sally@example.com",
    companies: [{ id: "co1", name: "Acme" }],
  });
  assertEquals(out.id, "u1");
});

Deno.test("user-upsert: is idempotent", () => {
  assertEquals(userUpsert.idempotent, true);
});
