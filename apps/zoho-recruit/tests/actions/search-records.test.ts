import { assertEquals, assertThrows } from "@std/assert";
import { mockRecruitCtx } from "../_helpers.ts";
import action from "../../actions/search-records.ts";

Deno.test("search-records: GETs /{module}/search with the given criteria", async () => {
  const { ctx, calls } = mockRecruitCtx([{ body: { data: [{ id: "1" }], info: { count: 1 } } }]);
  const out = await action.execute(
    { module: "Candidates", criteria: "(Last_Name:contains:Jacky)" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/recruit/v2/Candidates/search");
  assertEquals(url.searchParams.get("criteria"), "(Last_Name:contains:Jacky)");
  assertEquals(out, { data: [{ id: "1" }], info: { count: 1 } });
});

Deno.test("search-records: works with email/phone/word too", async () => {
  const { ctx, calls } = mockRecruitCtx([{ body: { data: [] } }]);
  await action.execute({ module: "Clients", word: "acme" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("word"), "acme");
});

Deno.test("search-records: rejects when none of criteria/email/phone/word is given", () => {
  const { ctx, calls } = mockRecruitCtx();
  assertThrows(
    () => action.execute!({ module: "Candidates" }, ctx),
    Error,
    "requires one of",
  );
  assertEquals(calls.length, 0);
});
