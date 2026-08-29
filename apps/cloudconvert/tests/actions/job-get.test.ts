import { assertEquals } from "@std/assert";
import jobGet from "../../actions/job-get.ts";
import { envelope, hostOf, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("job-get: GETs /v2/jobs/{id} on the async host", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: envelope({ id: "j1", status: "processing" }),
  }]);
  const out = await jobGet.execute({ jobId: "j1" }, ctx) as { id: string };
  assertEquals(calls[0].method, "GET");
  assertEquals(hostOf(calls[0].url), "api.cloudconvert.com");
  assertEquals(pathOf(calls[0].url), "/v2/jobs/j1");
  assertEquals(out.id, "j1");
});

Deno.test("job-get: passes include as a comma-joined query value", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope({ id: "j1" }) }]);
  await jobGet.execute({ jobId: "j1", include: ["tasks"] }, ctx);
  assertEquals(queryOf(calls[0].url), { include: "tasks" });
});

Deno.test("job-get: URL-encodes the job id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope({}) }]);
  await jobGet.execute({ jobId: "abc def" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/jobs/abc%20def");
});

Deno.test("job-get: exposes no redirect param", () => {
  const keys = jobGet.params?.map((p) => p.key) ?? [];
  assertEquals(keys.includes("redirect"), false);
});
