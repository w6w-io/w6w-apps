import { assertEquals } from "@std/assert";
import exportGamma from "../../actions/export-gamma.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("export-gamma: POSTs /gammas/{id}/export with exportAs", async () => {
  const { ctx, calls } = mockCtx([{ body: { exportId: "exp1" } }]);
  const out = await exportGamma.execute({ gammaId: "g_1", exportAs: "pdf" }, ctx) as {
    exportId: string;
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1.0/gammas/g_1/export");
  assertEquals(JSON.parse(calls[0].body!), { exportAs: "pdf" });
  assertEquals(out.exportId, "exp1");
});

Deno.test("export-gamma: is not idempotent — every call starts a new export job", () => {
  assertEquals(exportGamma.idempotent, false);
});
