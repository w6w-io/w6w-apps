import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import userGet from "../../actions/user-get.ts";

Deno.test("user-get: returns the user with no businessId required", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        user: {
          id: "u1",
          firstName: "Ada",
          lastName: "Lovelace",
          defaultEmail: "ada@example.com",
          createdAt: "2020-01-01T00:00:00Z",
          modifiedAt: "2020-01-01T00:00:00Z",
        },
      },
    },
  }]);
  const out = await userGet.execute({}, ctx) as { id: string; defaultEmail: string };
  assertEquals(out.id, "u1");
  assertEquals(out.defaultEmail, "ada@example.com");
  assertEquals(calls.length, 1);
});

Deno.test("user-get: type/resource/idempotency metadata", () => {
  assertEquals(userGet.type, "read");
  assertEquals(userGet.resource, "user");
});
