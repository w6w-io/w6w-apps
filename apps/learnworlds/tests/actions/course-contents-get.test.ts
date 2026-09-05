import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/course-contents-get.ts";

const conn = { display: { schoolDomain: "https://yourschool.learnworlds.com" } };

Deno.test("course-contents-get: GETs /v2/courses/{id}/contents", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "c1", sections: [] } }], conn);
  await action.execute!({ id: "c1" }, ctx);
  assertEquals(
    calls[0].url,
    "https://yourschool.learnworlds.com/admin/api/v2/courses/c1/contents",
  );
});
