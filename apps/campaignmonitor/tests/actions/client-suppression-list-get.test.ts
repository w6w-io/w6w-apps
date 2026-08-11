import { assertEquals } from "@std/assert";
import clientSuppressionListGet from "../../actions/client-suppression-list-get.ts";
import { API_PATH, mockCtx, pagedBody, pathOf, queryOf } from "../_helpers.ts";

Deno.test("client-suppression-list-get: GETs suppressionlist with lowercase query keys", async () => {
  const { ctx, calls } = mockCtx([{ body: pagedBody([]) }]);
  await clientSuppressionListGet.execute(
    { clientId: "cid", page: 2, pageSize: 50, orderField: "date", orderDirection: "desc" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), `${API_PATH}/clients/cid/suppressionlist.json`);
  // The API's parameter names are lowercase; the params are camelCase.
  assertEquals(queryOf(calls[0].url), {
    page: "2",
    pagesize: "50",
    orderfield: "date",
    orderdirection: "desc",
  });
});

Deno.test("client-suppression-list-get: omits every parameter the caller left unset", async () => {
  const { ctx, calls } = mockCtx([{ body: pagedBody([]) }]);
  await clientSuppressionListGet.execute({ clientId: "cid" }, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("client-suppression-list-get: returns the paged envelope intact", async () => {
  const record = {
    SuppressionReason: "Bounced",
    EmailAddress: "a@example.com",
    Date: "2010-10-26 10:55:31",
    State: "Suppressed",
  };
  const { ctx } = mockCtx([{ body: pagedBody([record], { TotalNumberOfRecords: 5 }) }]);
  const out = await clientSuppressionListGet.execute({ clientId: "cid" }, ctx);
  assertEquals(out.Results, [record]);
  assertEquals(out.TotalNumberOfRecords, 5);
  assertEquals(out.NumberOfPages, 1);
});
