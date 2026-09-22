import { assertEquals } from "@std/assert";
import mailingListList from "../../actions/mailing-list-list.ts";
import { API_ROOT, listEnvelope, mockCtx } from "../_helpers.ts";

Deno.test("mailing-list-list: calls GET /mailinglists", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ mailingListId: "CG_1" }]) }]);
  const out = await mailingListList.execute({}, ctx) as { elements: unknown[] };

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/mailinglists`);
  assertEquals(out.elements, [{ mailingListId: "CG_1" }]);
});

Deno.test("mailing-list-list: follows nextPage", async () => {
  const page2 = "https://iad1.qualtrics.com/API/v3/mailinglists?offset=10";
  const { ctx, calls } = mockCtx([
    { body: listEnvelope([{ mailingListId: "CG_1" }], page2) },
    { body: listEnvelope([{ mailingListId: "CG_2" }]) },
  ]);

  await mailingListList.execute({}, ctx);
  assertEquals(calls[1].url, page2);
});
