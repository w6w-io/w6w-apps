import { assertEquals } from "@std/assert";
import jobGet from "../../actions/job-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-get: calls GET /job/{uuid}.json", async () => {
  const { ctx, calls } = mockCtx([{ body: { uuid: "j1", status: "Quote" } }]);
  const out = await jobGet.execute({ jobUuid: "j1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api_1.0/job/j1.json");
  assertEquals(out, { uuid: "j1", status: "Quote" });
});

Deno.test("job-get: escapes a path-breaking uuid", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await jobGet.execute({ jobUuid: "a/b" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api_1.0/job/a%2Fb.json");
});
