import { assertEquals } from "@std/assert";
import { mockRecruitCtx } from "../_helpers.ts";
import action from "../../actions/candidate-create.ts";

Deno.test("candidate-create: POSTs the fields wrapped in a data array", async () => {
  const { ctx, calls } = mockRecruitCtx([
    { body: { data: [{ code: "SUCCESS", status: "success", details: { id: "1" } }] } },
  ]);
  await action.execute({ fields: { Last_Name: "Jones", Email: "a@acme.com" } }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/recruit/v2/Candidates");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { data: [{ Last_Name: "Jones", Email: "a@acme.com" }] });
});

Deno.test("candidate-create: not idempotent — every call creates a new record", () => {
  assertEquals(action.idempotent, false);
});
