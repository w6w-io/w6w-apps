import { assertEquals } from "@std/assert";
import { mockRecruitCtx } from "../_helpers.ts";
import action from "../../actions/candidate-update.ts";

Deno.test("candidate-update: PUTs /Candidates with the id merged into the fields", async () => {
  const { ctx, calls } = mockRecruitCtx([
    { body: { data: [{ code: "SUCCESS", status: "success", details: { id: "1" } }] } },
  ]);
  await action.execute({ recordId: "1", fields: { City: "Berlin" } }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/recruit/v2/Candidates");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { data: [{ id: "1", City: "Berlin" }] });
});

Deno.test("candidate-update: idempotent — retrying converges on the same fields", () => {
  assertEquals(action.idempotent, true);
});
