import { assertEquals } from "@std/assert";
import sessionRecordingsList from "../../actions/session-recordings-list.ts";
import { list, mockCtx, pathOf, queryOf, resource } from "../_helpers.ts";

Deno.test("session-recordings-list: GETs /sessions/{id}/recordings, forwarding url_expires_in", async () => {
  const { ctx, calls } = mockCtx([{ body: list([resource("recordings", "r1")]) }]);
  await sessionRecordingsList.execute({ id: "s1", urlExpiresIn: 604800 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/sessions/s1/recordings");
  assertEquals(queryOf(calls[0].url), { url_expires_in: "604800" });
});
