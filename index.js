'use strict';

const line    = require('@line/bot-sdk');
const express = require('express');
const { Pool } = require('pg');
const pool     = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const query    = `SELECT * FROM player WHERE data->>'name' LIKE '%' || $1 || '%' ;`;

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

  // SQL-select
  pool.query(query, [event.message.text])
  .then((res) => {
    if (res.rowCount > 1) {
      // 複数選手hitした場合
      messages = [];
      const msg_length  = Math.ceil(res.rowCount / 10); // 選手数を10で割った商+1を計算
      const lastmsg_num = res.rowCount - Math.floor(res.rowCount / 10) * 10; // 選手数を10で割った余りを計算
      var i_max;

      if (msg_length <= 5) {
        // 検索結果が50人以下なので、LINEで表示可能

        // 選手数を10で割った商+1 分、messages配列にオブジェクトを作って格納する
        for (let j=0; j<msg_length; j++) {
          messages[j] = {
            type: 'template',
            altText: "複数選手検索結果",
            template: {
              type: 'carousel',
              columns: []
            }
          };
          if (j == msg_length-1) { // 現在作成してるオブジェクトが最後かどうか
            i_max = lastmsg_num;
          } else {
            i_max = 10;
          };
          for (let i=0; i<i_max; i++) {
            messages[j].template.columns[i]       = {};
            messages[j].template.columns[i].title = res.rows[j*10+i].data.name;
            messages[j].template.columns[i].text  = res.rows[j*10+i].data.team;
            messages[j].template.columns[i].actions          = [{}];
            messages[j].template.columns[i].actions[0].type  = "message";
            messages[j].template.columns[i].actions[0].label = "この選手を検索";
            messages[j].template.columns[i].actions[0].text  = res.rows[j*10+i].data.name;
            messages[j].template.columns[i].defaultAction    = messages[j].template.columns[i].actions[0];
          }
        };
        //console.log(messages);
      } else {
        // 検索結果が50人より大きいので、LINEで表示不可。エラーを返す
        messages = {type: 'text',
                    text: "選手検索結果が50件を超えました。もう少し長い選手名で試してみてください。"};
      };
    } else if (res.rowCount == 1) {
      // 単一選手hitした場合
      const message = arrangeText(res.rows[0].data);
      messages = [
        { 
          type: 'image', 
          originalContentUrl: res.rows[0].data.photo_url,
          previewImageUrl: res.rows[0].data.photo_url
        },
        { 
          type: 'text',
          text: message
        }
      ];
    } else {
      // 選手hitしなかった場合
      messages = {
        type: 'text',
        text: "選手が見つかりませんでした。"
      };
    }

    // use reply API
    return client.replyMessage(event.replyToken, messages);
  })

  // old: 直接スクレイピングをしていたやり方
  //require('./scraping.js').getPlayerData(event.message.text).then( obj => {
  //  var messages;
  //
  //  if (obj) {
  //    if (Array.isArray(obj)) {
  //      // 複数選手検索結果(Array)が返ってきた場合
  //      messages = [];
  //      const msg_length  = Math.ceil(obj.length / 10); // 選手数を10で割った商+1を計算
  //      const lastmsg_num = obj.length - Math.floor(obj.length / 10) * 10; // 選手数を10で割った余りを計算
  //      var i_max;
  //
  //      if (msg_length <= 5) {
  //        // 検索結果が50人以下なので、LINEで表示可能
  //
  //        // 選手数を10で割った商+1 分、messages配列にオブジェクトを作って格納する
  //        for (let j=0; j<msg_length; j++) {
  //          messages[j] = {
  //            type: 'template',
  //            altText: "複数選手検索結果",
  //            template: {
  //              type: 'carousel',
  //              columns: []
  //            }
  //          };
  //          if (j == msg_length-1) { // 現在作成してるオブジェクトが最後かどうか
  //            i_max = lastmsg_num;
  //          } else {
  //            i_max = 10;
  //          };
  //          for (let i=0; i<i_max; i++) {
  //            messages[j].template.columns[i]       = {}
  //            messages[j].template.columns[i].title = obj[j*10+i].name;
  //            messages[j].template.columns[i].text  = obj[j*10+i].team;
  //            messages[j].template.columns[i].actions          = [{}];
  //            messages[j].template.columns[i].actions[0].type  = "message";
  //            messages[j].template.columns[i].actions[0].label = "この選手を検索";
  //            messages[j].template.columns[i].actions[0].text  = obj[j*10+i].name;
  //          }
  //        };
  //        //console.log(messages);
  //      } else {
  //        // 検索結果が50人より大きいので、LINEで表示不可。エラーを返す
  //        messages = {type: 'text',
  //                    text: "選手検索結果が50件を超えました。もう少し長い選手名で試してみてください。"};
  //      };
  //      
  //    } else {
  //      // 選手情報(object)が返ってきた場合
  //      const message = arrangeText(obj);
  //      messages = [
  //                  {type: 'image', 
  //                   originalContentUrl: obj.photo_url,
  //                   previewImageUrl: obj.photo_url},
  //                  {type: 'text',
  //                   text: message}
  //                 ];
  //    }
  //  } else {
  //    // 何も返ってこなかった場合、エラーを返す。
  //    messages = {type: 'text',
  //                text: "選手が見つかりませんでした。"};
  //  }
  //  // use reply API
  //  return client.replyMessage(event.replyToken, messages);
  //});
  
}

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});

// LINE表示用にテキスト整形
function arrangeText(obj) {
  var res;

  res = obj.name + " (" + obj.kana + ")\n" +
        obj.team + " #" + obj.no + "\n" + 
        obj.position + "/" + obj.bt + "\n" +
        obj.birthday + "生まれ (" + obj.age + "歳)\n" +
        obj.career   + (obj.draft_y ? (" (" + obj.draft_y + ")") : "") + "\n" + 
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