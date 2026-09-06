import { assertEquals } from "@std/assert";
import broadcastCreate from "../../actions/broadcast-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("broadcast-create: POSTs to /episodes/{id}/broadcasts with episode_id repeated in the body", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: { id: 1, date: 1752064200, episode: { id: 42 } } },
  ]);
  const out = await broadcastCreate.execute({
    episodeId: 42,
    date: "2025-07-09T14:30:00+02:00",
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/episodes/42/broadcasts");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.episode_id, 42);
  assertEquals(body.date, "2025-07-09T14:30:00+02:00");
  assertEquals(out, { id: 1, date: 1752064200, episode: { id: 42 } });
});

Deno.test("broadcast-create: is declared idempotent (documented same-date returns the existing broadcast)", () => {
  assertEquals(broadcastCreate.idempotent, true);
});
