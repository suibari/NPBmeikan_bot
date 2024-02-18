'use strict';

const express = require('express');
const line   = require('@line/bot-sdk');
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};
const client = new line.Client(config);
const cron = require('node-cron');
const {Worker} = require('worker_threads');
const worker = require('./worker.js');

// create Express app
// about Express itself: https://expressjs.com/
const app = express();

// register a webhook handler with middleware
app.post('/callback', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// 生データを返す
app.get('/json', async (req, res) => {
  res.header('Content-Type', 'application/json', 'charset=utf-8');
  const result = await worker.getPlayerJson(req.query.q);
  console.log(result);

  if (result && Array.isArray(result)) {
    res.status(200).send(result[0].data);
  } else if (result) {
    res.status(200).send(result.data);
  } else {
    res.status(500).send("error: hit no players.");
  }

  // if (result.length > 0) {
  //   res.status(200).send(result[0].data);
  // } if (result.length == 0) {
  //   res.status(500).send("error: hit no players.");
  // } else {
  //   res.status(500).send("error: hit multiple players.");
  // }
});

app.get('/', (req, res) => {
  res.status(200).send("ping ok!");
});

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`[MAIN] listening on ${port}`);
});

// execute update DB at AM3:00
cron.schedule('0 0 3 * * *', () => {
  worker.initOrUpdateDB();
}, {
  scheduled: true,
  timezone: "Asia/Tokyo"
});

// ----------------------------------------
// event handler
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    // ignore non-text-message event
    return Promise.resolve(null);
  }
  
  const messages = await worker.createMessage(event.message.text);
  client.replyMessage(event.replyToken, messages)
  .catch(e => {console.error(e)});
}