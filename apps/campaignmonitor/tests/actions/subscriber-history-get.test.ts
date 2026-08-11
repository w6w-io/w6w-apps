import { assertEquals } from "@std/assert";
import subscriberHistoryGet from "../../actions/subscriber-history-get.ts";
import { API_PATH, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("subscriber-history-get: GETs /subscribers/{listid}/history.json", async () => {
  const history = [{
    ID: "fc0ce7105baeaf97f47c99be31d02a91",
    Type: "Campaign",
    Name: "Campaign One",
    Actions: [
      { Event: "Open", Date: "2010-10-12 13:18:00", IPAddress: "192.168.126.87", Detail: "" },
      {
        Event: "Click",
        Date: "2010-10-12 13:16:00",
        IPAddress: "192.168.126.87",
        Detail: "https://example.com/post/12323/",
      },
    ],
  }];
  const { ctx, calls } = mockCtx([{ body: history }]);
  const out = await subscriberHistoryGet.execute({ listId: "lid", email: "a@example.com" }, ctx);
  assertEquals(pathOf(calls[0].url), `${API_PATH}/subscribers/lid/history.json`);
  assertEquals(queryOf(calls[0].url), { email: "a@example.com" });
  // Detail carries the clicked URL for a Click and is empty otherwise.
  assertEquals(out[0].Actions[1].Detail, "https://example.com/post/12323/");
  assertEquals(out[0].Actions[0].Detail, "");
});
