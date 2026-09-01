import { assertEquals } from "@std/assert";
import jobDelete from "../../actions/job-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-delete: PUTs {is_active: false}", async () => {
  const { ctx, calls } = mockCtx([{ body: { jnid: "j1", is_active: false } }]);
  const out = await jobDelete.execute({ jnid: "j1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api1/jobs/j1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { is_active: false });
  assertEquals(out, { jnid: "j1", is_active: false });
});

Deno.test("job-delete: is marked idempotent", () => {
  assertEquals(jobDelete.idempotent, true);
});
