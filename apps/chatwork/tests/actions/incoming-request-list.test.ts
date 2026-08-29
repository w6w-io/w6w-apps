import { assertEquals } from "@std/assert";
import incomingRequestList from "../../actions/incoming-request-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("incoming-request-list: calls GET /incoming_requests", async () => {
  const requests = [{ request_id: 1, account_id: 5, message: "hi", name: "Bob" }];
  const { ctx, calls } = mockCtx([{ body: requests }]);
  const out = await incomingRequestList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/incoming_requests");
  assertEquals(out, requests);
});

Deno.test("incoming-request-list: a 204 (nothing pending) normalises to an empty array", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const out = await incomingRequestList.execute({}, ctx);
  assertEquals(out, []);
});
