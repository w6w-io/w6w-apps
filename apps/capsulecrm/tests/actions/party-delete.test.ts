import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/party-delete.ts";

Deno.test("party-delete: DELETEs /parties/{id}, reporting accepted=false on 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await action.execute({ partyId: 100 }, ctx);
  assertEquals(calls[0].url, "https://api.capsulecrm.com/api/v2/parties/100");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { accepted: false });
});

Deno.test("party-delete: a deferred deletion (202) reports accepted=true", async () => {
  const { ctx } = mockCtx([{ status: 202, body: undefined, headers: {} }]);
  const out = await action.execute({ partyId: 100 }, ctx);
  assertEquals(out, { accepted: true });
});
