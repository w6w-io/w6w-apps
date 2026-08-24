import { assertEquals } from "@std/assert";
import jobUpdate from "../../actions/job-update.ts";
import { bodyOf, mockCtx, pathOf, result } from "../_helpers.ts";

Deno.test("job-update: POSTs only the fields that were set", async () => {
  const { ctx, calls } = mockCtx([{ body: result() }]);
  const out = await jobUpdate.execute({ jobUuid: "j1", status: "Completed" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api_1.0/job/j1.json");
  assertEquals(bodyOf(calls[0]), { status: "Completed" });
  assertEquals(out, { errorCode: 0, message: "OK" });
});

Deno.test("job-update: sends an empty body when nothing was set", async () => {
  const { ctx, calls } = mockCtx([{ body: result() }]);
  await jobUpdate.execute({ jobUuid: "j1" }, ctx);
  assertEquals(bodyOf(calls[0]), {});
});

Deno.test("job-update: is marked idempotent", () => {
  assertEquals(jobUpdate.idempotent, true);
});
