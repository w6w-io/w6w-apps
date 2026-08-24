import { assertEquals } from "@std/assert";
import jobDelete from "../../actions/job-delete.ts";
import { mockCtx, pathOf, result } from "../_helpers.ts";

Deno.test("job-delete: sends DELETE to /job/{uuid}.json", async () => {
  const { ctx, calls } = mockCtx([{ body: result() }]);
  const out = await jobDelete.execute({ jobUuid: "j1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api_1.0/job/j1.json");
  assertEquals(out, { errorCode: 0, message: "OK" });
});

Deno.test("job-delete: is marked idempotent — archiving twice is a no-op", () => {
  assertEquals(jobDelete.idempotent, true);
});
