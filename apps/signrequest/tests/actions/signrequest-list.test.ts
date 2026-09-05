import { assertEquals } from "@std/assert";
import signrequestList from "../../actions/signrequest-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("signrequest-list: GETs /signrequests/ with who/from_email/page/limit", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { count: 0, results: [] } }]);
  await signrequestList.execute({ who: "mo", fromEmail: "sender@example.com", page: 3 }, ctx);
  assertEquals(pathOf(calls[0]), "/api/v1/signrequests/");
  const q = queryOf(calls[0]);
  assertEquals(q.get("who"), "mo");
  assertEquals(q.get("from_email"), "sender@example.com");
  assertEquals(q.get("page"), "3");
});
