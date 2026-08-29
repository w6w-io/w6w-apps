import { assertEquals } from "@std/assert";
import transcriptGet from "../../actions/transcript-get.ts";
import { hostOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("transcript-get: GETs /v2/transcript/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "t1", status: "completed" } }]);
  const out = await transcriptGet.execute({ transcriptId: "t1" }, ctx) as { status: string };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/transcript/t1");
  assertEquals(out.status, "completed");
});

Deno.test("transcript-get: region 'eu' routes to the EU host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "t1" } }]);
  await transcriptGet.execute({ transcriptId: "t1", region: "eu" }, ctx);
  assertEquals(hostOf(calls[0].url), "api.eu.assemblyai.com");
});

Deno.test("transcript-get: is a read action with a required transcriptId param", () => {
  assertEquals(transcriptGet.type, "read");
  const idParam = transcriptGet.params?.find((p) => p.key === "transcriptId");
  assertEquals(idParam?.required, true);
});
