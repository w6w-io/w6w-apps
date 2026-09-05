import { assertEquals } from "@std/assert";
import { mockRecruitCtx } from "../_helpers.ts";
import action from "../../actions/candidate-list.ts";

Deno.test("candidate-list: GETs /Candidates with paging and filter params", async () => {
  const { ctx, calls } = mockRecruitCtx([{ body: { data: [{ id: "1" }], info: { count: 1 } } }]);
  const out = await action.execute({
    fields: "id,Last_Name",
    page: 2,
    per_page: 50,
    sort_by: "Created_Time",
    sort_order: "desc",
    converted: "false",
    approved: "true",
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/recruit/v2/Candidates");
  assertEquals(url.searchParams.get("fields"), "id,Last_Name");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("per_page"), "50");
  assertEquals(url.searchParams.get("converted"), "false");
  assertEquals(url.searchParams.get("approved"), "true");
  assertEquals(out, { data: [{ id: "1" }], info: { count: 1 } });
});

Deno.test("candidate-list: fields is optional — omitting it sends no fields param", async () => {
  const { ctx, calls } = mockRecruitCtx([{ body: { data: [] } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).searchParams.has("fields"), false);
});
