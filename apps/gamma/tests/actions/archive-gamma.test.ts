import { assertEquals } from "@std/assert";
import archiveGamma from "../../actions/archive-gamma.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("archive-gamma: POSTs /gammas/{id}/archive", async () => {
  const { ctx, calls } = mockCtx([{ body: { gammaId: "g_1", archived: true } }]);
  const out = await archiveGamma.execute({ gammaId: "g_1" }, ctx) as { archived: boolean };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1.0/gammas/g_1/archive");
  assertEquals(out.archived, true);
});

Deno.test("archive-gamma: is declared idempotent, matching the vendor's own guarantee", () => {
  assertEquals(archiveGamma.idempotent, true);
});
