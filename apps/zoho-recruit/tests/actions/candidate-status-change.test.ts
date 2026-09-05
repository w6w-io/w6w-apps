import { assertEquals } from "@std/assert";
import { mockRecruitCtx } from "../_helpers.ts";
import action from "../../actions/candidate-status-change.ts";

Deno.test("candidate-status-change: PUTs /Candidates/status with Candidate_Status and flattens the nested result", async () => {
  const { ctx, calls } = mockRecruitCtx([
    {
      body: {
        data: [[
          { code: "SUCCESS", status: "success", details: { id: "1" }, message: "status changed" },
        ]],
      },
    },
  ]);
  const out = await action.execute(
    { ids: "1", status: "Qualified", comments: "Screened" },
    ctx,
  );

  assertEquals(new URL(calls[0].url).pathname, "/recruit/v2/Candidates/status");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), {
    data: [{ ids: ["1"], Candidate_Status: "Qualified", comments: "Screened" }],
  });
  assertEquals(out.results.length, 1);
  assertEquals(out.results[0].code, "SUCCESS");
});

Deno.test("candidate-status-change: splits comma-separated ids and includes jobIds when given", async () => {
  const { ctx, calls } = mockRecruitCtx([
    { body: { data: [[{ code: "SUCCESS", status: "success" }]] } },
  ]);
  await action.execute({ ids: "1, 2", status: "Qualified", jobIds: "j1" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data[0].ids, ["1", "2"]);
  assertEquals(body.data[0].jobids, ["j1"]);
});

Deno.test("candidate-status-change: idempotent — re-applying the same status converges", () => {
  assertEquals(action.idempotent, true);
});
