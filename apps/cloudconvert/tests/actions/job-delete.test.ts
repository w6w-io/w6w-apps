import { assertEquals } from "@std/assert";
import jobDelete from "../../actions/job-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-delete: DELETEs /v2/jobs/{id} and reports deleted on 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await jobDelete.execute({ jobId: "j1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/jobs/j1");
  assertEquals(out, { deleted: true });
});

Deno.test("job-delete: is declared idempotent", () => {
  assertEquals(jobDelete.idempotent, true);
});
