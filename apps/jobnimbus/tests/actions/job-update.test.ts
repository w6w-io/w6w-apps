import { assertEquals } from "@std/assert";
import jobUpdate from "../../actions/job-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-update: PUTs only the fields supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { jnid: "j1" } }]);
  await jobUpdate.execute({ jnid: "j1", status_name: "Approved" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api1/jobs/j1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { status_name: "Approved" });
});

Deno.test("job-update: primary_contact_jnid becomes the nested primary.id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await jobUpdate.execute({ jnid: "j1", primary_contact_jnid: "he2d2" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { primary: { id: "he2d2" } });
});

Deno.test("job-update: is marked idempotent", () => {
  assertEquals(jobUpdate.idempotent, true);
});
