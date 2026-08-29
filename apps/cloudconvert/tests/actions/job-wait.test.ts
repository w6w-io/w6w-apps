import { assertEquals } from "@std/assert";
import jobWait from "../../actions/job-wait.ts";
import { envelope, hostOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-wait: GETs /v2/jobs/{id} on the SYNC host", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: envelope({ id: "j1", status: "finished" }),
  }]);
  const out = await jobWait.execute({ jobId: "j1" }, ctx) as { status: string };
  assertEquals(hostOf(calls[0].url), "sync.api.cloudconvert.com");
  assertEquals(pathOf(calls[0].url), "/v2/jobs/j1");
  assertEquals(out.status, "finished");
});

Deno.test("job-wait: is a read action with a single required jobId param", () => {
  assertEquals(jobWait.type, "read");
  assertEquals(jobWait.params?.map((p) => p.key), ["jobId"]);
  assertEquals(jobWait.params?.[0].required, true);
});
