import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-unenroll.ts";

const conn = { display: { schoolDomain: "https://yourschool.learnworlds.com" } };

Deno.test("user-unenroll: DELETEs /v2/users/{id}/enrollment with a JSON body", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }], conn);
  const result = await action.execute!(
    { id: "1", productId: "course-1", productType: "course" },
    ctx,
  );
  assertEquals(calls[0].method, "DELETE");
  assertEquals(
    calls[0].url,
    "https://yourschool.learnworlds.com/admin/api/v2/users/1/enrollment",
  );
  assertEquals(JSON.parse(calls[0].body!), { productId: "course-1", productType: "course" });
  assertEquals(result, { success: true });
});

Deno.test("user-unenroll: idempotent is true — removing an already-gone enrollment is a no-op", () => {
  assertEquals(action.idempotent, true);
});
