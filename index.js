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
      const message = arrangeText(obj);
      messages = [
                  {type: 'image', 
                   originalContentUrl: obj.photo_url,
                   previewImageUrl: obj.photo_url},
                  {type: 'text',
                   text: message}
                 ];
    } else {
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
        "\n";
  if (obj.stats) {
    res = res + "<今シーズンの成績>\n"
    if (obj.position == "投手") {
      res = res + obj.stats.game + "試合" + obj.stats.win + "勝" + obj.stats.lose + "敗" + obj.stats.save + "S\n" +
                  "防御率" + obj.stats.era;
    } else {
      res = res + obj.stats.game + "試合" + obj.stats.ab + "打数\n" + 
                  "打率: "   + obj.stats.avg + "\n" +
                  "長打率: " + obj.stats.slg + "\n" +
                  "出塁率: " + obj.stats.obp;
    }
  } else {
    res = res + "<今シーズン未出場>"
  }
  return res;
}