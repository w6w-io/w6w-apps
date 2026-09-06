import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/company-create.ts";
import { NETWORK_PLACEHOLDER } from "../../lib/client.ts";

Deno.test("company-create: POSTs to the group's company endpoint with the built body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "c1" } }]);
  const out = await action.execute({ groupId: "g1", name: "Acme" }, ctx);
  assertEquals(
    calls[0].url,
    `https://api.folk.app/network/${NETWORK_PLACEHOLDER}/group/g1/company`,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "Acme" });
  assertEquals(out, { company: { id: "c1" } });
});
