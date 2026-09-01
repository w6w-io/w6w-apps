import { assertEquals } from "@std/assert";
import jobCreate from "../../actions/job-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-create: POSTs the required fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { jnid: "j1" } }]);
  await jobCreate.execute({
    name: "Kenny G's Roof",
    record_type_name: "Job",
    status_name: "Lead",
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/api1/jobs");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Kenny G's Roof",
    record_type_name: "Job",
    status_name: "Lead",
  });
});

Deno.test("job-create: primary_contact_jnid becomes the nested primary.id JobNimbus expects", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await jobCreate.execute({
    name: "Kenny G's Roof",
    record_type_name: "Job",
    status_name: "Lead",
    primary_contact_jnid: "he2d2",
  }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.primary, { id: "he2d2" });
  assertEquals("primary_contact_jnid" in body, false);
});

Deno.test("job-create: is not marked idempotent", () => {
  assertEquals(jobCreate.idempotent, false);
});
