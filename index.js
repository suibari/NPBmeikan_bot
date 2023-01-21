'use strict';

const express  = require('express');
const line      = require('@line/bot-sdk');
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};
const client = new line.Client(config);
const router    = require('./router.js')

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
app.get('/json', (req, res) => {
  res.header('Content-Type', 'application/json', 'charset=utf-8');
  const query_name = require('./itaiji.js').getQuery(escapeSQL(req.query.name));
  pool.query(query_name)
  .then((res_pg) => {
    if (res_pg.rowCount == 1) {
      res.status(200).send(res_pg.rows[0].data);
    } else if (res_pg.rowCount == 0) {
      res.status(500).send("error: hit no players.");
    } else {
      res.status(500).send("error: hit multiple players.");
    }
  }).catch(err => {
    console.error('Error executing query', err.stack);
    res.status(400).send();
  });
});

app.get('/', (req, res) => {
  res.status(500).send("ping ok!");
});

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});

// ----------------------------------------
// event handler
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    // ignore non-text-message event
    return Promise.resolve(null);
  }
  
  const messages = await router.createMessage(event.message.text);
  client.replyMessage(event.replyToken, messages)
  .catch(e => {console.error(e)});
}