import { assertEquals } from "@std/assert";
import campaignList from "../../actions/campaign-list.ts";
import { listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("campaign-list: GETs /v2/campaigns with repeated status[] entries", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "c1" }]) }]);
  const out = await campaignList.execute({ limit: 10, status: ["DRAFT", "SENT"] }, ctx) as {
    data: unknown[];
  };

  assertEquals(pathOf(calls[0].url), "/v2/campaigns");
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("limit"), "10");
  assertEquals(url.searchParams.getAll("status[]"), ["DRAFT", "SENT"]);
  assertEquals(out.data, [{ id: "c1" }]);
});
