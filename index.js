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
    const message  = arrangeText(obj);
    const messages = [
                      {type: 'image', 
                       originalContentUrl: obj.photo_url,
                       previewImageUrl: obj.photo_url},
                      {type: 'text',
                       text: message}
                     ];
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
  var dst = moment(obj.birthday, "YYYY年MM月DD日").format();
  return obj.name + "\n" +
         obj.team + " #" + obj.no + "\n" + 
         obj.position + "/" + obj.bt + "\n" +
         obj.birthday + "生まれ(" + moment().diff(dst, 'years') + "歳)";
}