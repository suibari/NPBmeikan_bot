'use strict';

const line    = require('@line/bot-sdk');
const express = require('express');
const moment  = require('moment');

// create LINE SDK config from env variables
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

// create LINE SDK client
const client = new line.Client(config);

// create Express app
// about Express itself: https://expressjs.com/
const app = express();

// register a webhook handler with middleware
// about the middleware, please refer to doc
app.post('/callback', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// event handler
function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    // ignore non-text-message event
    return Promise.resolve(null);
  }

  // create a echoing text message
  //const echo = { type: 'text', text: event.message.text };
  require('./scraping.js').getPlayerData(event.message.text).then( obj => {
    var messages;

    if (obj) {
      if (!Array.isArray(obj)) {
        // 選手情報が返ってきた場合
        const message = arrangeText(obj);
        messages = [
                    {type: 'image', 
                     originalContentUrl: obj.photo_url,
                     previewImageUrl: obj.photo_url},
                    {type: 'text',
                     text: message}
                   ];
      } else {
        // 複数選手検索結果が返ってきた場合
        messages = [
                    {
                      type: 'template',
                      altText: "このデバイスは複数選手検索に被対応です。",
                      template: {
                        type: 'carousel',
                        columns: []
                      }
                    }
                   ];
        for (let i=0; i++; i<obj.length) {
          messages[0].template.columns[i]       = {}
          messages[0].template.columns[i].title = obj[i].name
          messages[0].template.columns[i].text  = obj[i].team;
          messages[0].template.columns[i].actions          = [{}];
          messages[0].template.columns[i].actions[0].type  = "message";
          messages[0].template.columns[i].actions[0].label = "この選手を検索";
          messages[0].template.columns[i].actions[0].text  = obj[i].name;
        }
      }
    } else {
      // 何も返ってこなかった場合
      messages = {type: 'text',
                  text: "選手が見つかりませんでした。"};
    }
    // use reply API
    return client.replyMessage(event.replyToken, messages);
  });
  
}

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});

// LINE表示用にテキスト整形
function arrangeText(obj) {
  var res;

  var dst = moment(obj.birthday, "YYYY年MM月DD日").format();
  res = obj.name + "\n" +
        obj.team + " #" + obj.no + "\n" + 
        obj.position + "/" + obj.bt + "\n" +
        obj.birthday + "生まれ(" + moment().diff(dst, 'years') + "歳)\n" +
        obj.career   + " (" + obj.draft_y + ")\n" + 
        "\n";
  if (obj.stats) {
    res = res + "<今シーズンの成績>\n"
    if (obj.position == "投手") {
      res = res + "試" + obj.stats.game + "/勝" + obj.stats.win + "/敗" + obj.stats.lose + "/S" + obj.stats.save +
                  "/回" + obj.stats.inning + "/防" + obj.stats.era + "/WHIP:" + obj.stats.whip;
    } else {
      res = res + "試" + obj.stats.game + "/打" + obj.stats.ab + "/安" + obj.stats.h + "/率" + obj.stats.avg + "/出" + obj.stats.obp + 
                  "/本" + obj.stats.hr + "/点" + obj.stats.rbi + "/盗" + obj.stats.sb + "/OPS:" + obj.stats.ops;
    }
  } else {
    res = res + "<今シーズン未出場>"
  }
  return res;
}