import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-enroll.ts";

const conn = { display: { schoolDomain: "https://yourschool.learnworlds.com" } };

Deno.test("user-enroll: POSTs to /v2/users/{id}/enrollment", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  const result = await action.execute!(
    { id: "1", productId: "course-1", productType: "course", price: 0 },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(
    calls[0].url,
    "https://yourschool.learnworlds.com/admin/api/v2/users/1/enrollment",
  );
  assertEquals(JSON.parse(calls[0].body!), {
    productId: "course-1",
    productType: "course",
    price: 0,
  });
  assertEquals(result, { success: true });
});

Deno.test("user-enroll: idempotent is false", () => {
  assertEquals(action.idempotent, false);
});
