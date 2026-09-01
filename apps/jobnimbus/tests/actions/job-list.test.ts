import { assertEquals } from "@std/assert";
import jobList from "../../actions/job-list.ts";
import { listPage, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-list: hits /jobs and returns {count, results}", async () => {
  const { ctx, calls } = mockCtx([{ body: listPage([{ jnid: "j1" }]) }]);
  const out = await jobList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/api1/jobs");
  assertEquals(out, { count: 1, results: [{ jnid: "j1" }] });
});
