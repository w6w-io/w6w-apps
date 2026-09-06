import { assertEquals } from "@std/assert";
import getLead from "../../actions/get-lead.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("get-lead: reads a lead by ID", async () => {
  const lead = {
    id: "18kPq7GPye-YQ3LyKyAZPw",
    business_id: "VXi7gzRqPKp63X0u6fUtbg",
    time_created: "2022-01-02T03:04:05+00:00",
    last_event_time: "2022-01-02T04:04:05+00:00",
  };
  const { ctx, calls } = mockCtx([{ body: lead }]);

  const result = await getLead.execute({ leadId: "18kPq7GPye-YQ3LyKyAZPw" }, ctx);

  assertEquals(result, lead);
  assertEquals(pathOf(calls[0].url), "/v3/leads/18kPq7GPye-YQ3LyKyAZPw");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].method, "GET");
});

Deno.test("get-lead: path-escapes the lead ID", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await getLead.execute({ leadId: "weird/id with space" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/leads/weird%2Fid%20with%20space");
});
