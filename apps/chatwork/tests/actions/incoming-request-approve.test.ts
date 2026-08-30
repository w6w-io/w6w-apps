import { assertEquals } from "@std/assert";
import incomingRequestApprove from "../../actions/incoming-request-approve.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("incoming-request-approve: PUTs the request and returns the new contact", async () => {
  const contact = { account_id: 5, room_id: 10, name: "Bob", chatwork_id: "bob" };
  const { ctx, calls } = mockCtx([{ body: contact }]);
  const out = await incomingRequestApprove.execute({ requestId: 1 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/incoming_requests/1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(out, contact);
});
