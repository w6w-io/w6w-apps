import { assertEquals } from "@std/assert";
import getGenerationStatus from "../../actions/get-generation-status.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-generation-status: calls GET /generations/{id}", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        generationId: "gen1",
        status: "completed",
        gammaId: "g_1",
        gammaUrl: "https://gamma.app/docs/x",
      },
    },
  ]);
  const out = await getGenerationStatus.execute({ generationId: "gen1" }, ctx) as {
    status: string;
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1.0/generations/gen1");
  assertEquals(out.status, "completed");
});

Deno.test("get-generation-status: a failed generation's error object passes through", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        generationId: "gen1",
        status: "failed",
        error: { message: "bad input", statusCode: 400 },
      },
    },
  ]);
  const out = await getGenerationStatus.execute({ generationId: "gen1" }, ctx) as {
    error: { message: string };
  };
  assertEquals(out.error.message, "bad input");
});
