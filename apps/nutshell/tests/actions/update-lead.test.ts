import { assertEquals, assertRejects } from "@std/assert";
import updateLead from "../../actions/update-lead.ts";
import { mockCtx, rpcBody } from "../_helpers.ts";

Deno.test("update-lead: is a non-idempotent perform action requiring rev", () => {
  assertEquals(updateLead.type, "perform");
  assertEquals(updateLead.idempotent, false);
  assertEquals(updateLead.params?.find((p) => p.key === "rev")?.required, true);
});

Deno.test("update-lead: sends leadId, rev, and the lead diff", async () => {
  const { ctx, calls } = mockCtx([{ result: { id: 1000, rev: "14" } }]);
  const result = await updateLead.execute({
    leadId: "1000",
    rev: "13",
    confidence: 75,
    note: "Called back",
  }, ctx);

  assertEquals(rpcBody(calls[0]).method, "editLead");
  const params = rpcBody(calls[0]).params;
  assertEquals(params.leadId, 1000);
  assertEquals(params.rev, "13");
  assertEquals(params.lead, { confidence: 75, note: "Called back" });
  assertEquals(result.rev, "14");
});

Deno.test("update-lead: surfaces the vendor's own message on a stale rev (verified 409 shape)", async () => {
  const { ctx } = mockCtx([{
    status: 409,
    error: { code: 409, message: "rev key is out-of-date", data: null },
  }]);
  await assertRejects(
    () => updateLead.execute({ leadId: "1000", rev: "1" }, ctx) as Promise<unknown>,
    Error,
    "rev key is out-of-date",
  );
});
