import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-delete.ts";

Deno.test("contact-delete: deletes by comma-separated ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { job_id: "job-1" } }]);
  const result = await action.execute!({ ids: "abc, def" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(
    calls[0].url,
    "https://api.sendgrid.com/v3/marketing/contacts?ids=abc%2Cdef",
  );
  assertEquals(result, { job_id: "job-1" });
});

Deno.test("contact-delete: deleteAll adds delete_all_contacts=true", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { job_id: "job-2" } }]);
  await action.execute!({ deleteAll: true, ids: "" }, ctx);

  assertEquals(
    calls[0].url,
    "https://api.sendgrid.com/v3/marketing/contacts?delete_all_contacts=true",
  );
});

Deno.test("contact-delete: propagates non-2xx as Error", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "forbidden" }]);
  await assertRejects(
    async () => await action.execute!({ ids: "x" }, ctx),
    Error,
    "returned 403",
  );
});
