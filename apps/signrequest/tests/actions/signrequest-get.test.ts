import { assertEquals } from "@std/assert";
import signrequestGet from "../../actions/signrequest-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("signrequest-get: GETs /signrequests/{id}/", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { uuid: "sr-1" } }]);
  const out = await signrequestGet.execute({ signrequestId: "sr-1" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/api/v1/signrequests/sr-1/");
  assertEquals(out.uuid, "sr-1");
});
