import { assertEquals } from "@std/assert";
import jobCreate from "../../actions/job-create.ts";
import { bodyOf, mockCtx, pathOf, result } from "../_helpers.ts";

Deno.test("job-create: POSTs to /job.json and returns only the uuid header", async () => {
  const { ctx, calls } = mockCtx([{ body: result(), headers: { "x-record-uuid": "new-j1" } }]);
  const out = await jobCreate.execute({ status: "Quote", companyUuid: "c1" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api_1.0/job.json");
  assertEquals(bodyOf(calls[0]), { status: "Quote", company_uuid: "c1" });
  assertEquals(out, { uuid: "new-j1" });
});

Deno.test("job-create: omits unset optional fields from the body", async () => {
  const { ctx, calls } = mockCtx([{ body: result(), headers: { "x-record-uuid": "x" } }]);
  await jobCreate.execute({ status: "Work Order" }, ctx);
  assertEquals(bodyOf(calls[0]), { status: "Work Order" });
});

Deno.test("job-create: offers the four documented Job.status values", () => {
  const status = jobCreate.params?.find((p) => p.key === "status");
  const values = Array.isArray(status?.options) ? status.options.map((o) => o.value) : [];
  assertEquals(values, ["Quote", "Work Order", "Unsuccessful", "Completed"]);
});

Deno.test("job-create: is not marked idempotent", () => {
  assertEquals(jobCreate.idempotent, false);
});
