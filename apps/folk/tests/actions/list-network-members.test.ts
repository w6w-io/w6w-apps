import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-network-members.ts";
import { NETWORK_PLACEHOLDER } from "../../lib/client.ts";

Deno.test("list-network-members: GETs the network's users (teammates, not CRM contacts)", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ id: "u1", fullName: "Ada Lovelace", email: "ada@example.com" }],
  }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, `https://api.folk.app/network/${NETWORK_PLACEHOLDER}/users`);
  assertEquals(out, {
    members: [{ id: "u1", fullName: "Ada Lovelace", email: "ada@example.com" }],
  });
});
