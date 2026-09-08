import { assertEquals } from "@std/assert";
import sessionQuestionsList from "../../actions/session-questions-list.ts";
import type { JsonApiListResponse } from "../../lib/client.ts";
import { list, mockCtx, pathOf, resource } from "../_helpers.ts";

Deno.test("session-questions-list: GETs /sessions/{id}/questions", async () => {
  const { ctx, calls } = mockCtx([{ body: list([resource("questions", "q1")]) }]);
  const result = await sessionQuestionsList.execute({ id: "s1" }, ctx) as JsonApiListResponse;

  assertEquals(pathOf(calls[0].url), "/v1/sessions/s1/questions");
  assertEquals(result.data.length, 1);
});
