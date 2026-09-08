import { assertEquals } from "@std/assert";
import getLead from "../../actions/get-lead.ts";
import { mockCtx, rpcBody } from "../_helpers.ts";

Deno.test("get-lead: is a read action requiring leadId", () => {
  assertEquals(getLead.type, "read");
  assertEquals(getLead.params?.find((p) => p.key === "leadId")?.required, true);
});

Deno.test("get-lead: calls getLead with a numeric leadId, no rev", async () => {
  const { ctx, calls } = mockCtx([{ result: { id: 1000, entityType: "Leads", rev: "13" } }]);
  const result = await getLead.execute({ leadId: "1000" }, ctx);

  assertEquals(rpcBody(calls[0]).method, "getLead");
  assertEquals(rpcBody(calls[0]).params, { leadId: 1000 });
  assertEquals(result.id, 1000);
});
