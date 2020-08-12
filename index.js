'use strict';

const line     = require('@line/bot-sdk');
const express  = require('express');
const { Pool } = require('pg');
const pool     = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
//const query_name    = `SELECT * FROM player WHERE data->>'name' LIKE '%' || $1 || '%' ;`;
const query_team_no = `SELECT * FROM player WHERE data->>'team' = $1 AND data->>'no' = $2 ;`;

// create LINE SDK config from env variables
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
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
  
  var messages;
  var dct_tn = detectTeamAndNum(event.message.text);

  if ((dct_tn.team) && (dct_tn.num)) {
    // メッセージにチーム名および背番号が含まれている
    // SQL-selet (チーム名&背番号検索)
    pool.query(query_team_no, [dct_tn.team, dct_tn.num])
    .then((res) => {
      if (res.rowCount > 0) {
        messages = createMsgObj(res.rows[0].data);
      } else {
        // 選手hitしなかった場合
        messages = {
          type: 'text',
          text: dct_tn.team + "の背番号" + dct_tn.num + "はいませんでした。"
        };
      }
      // use reply API
      return client.replyMessage(event.replyToken, messages);
    })
    .catch(err => console.error('Error executing query', err.stack));

  } else {
    // メッセージは選手名検索である
    // SQL-select (選手名検索)
    const query_name = require('./itaiji.js').getQuery(event.message.text); // 異体字を考慮してLIKE～ORしたクエリを生成
    pool.query(query_name)
    .then((res) => {
      if (res.rowCount > 1) {
        // 複数選手hitした場合
        messages = [];
        const msg_length  = Math.ceil(res.rowCount / 10); // 選手数を10で割った商(切り上げ)を計算
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
            if ((j == msg_length-1) && (lastmsg_num == 0)) {
              // 現在が最後の10である
              i_max = 10;
            } else if (j == msg_length-1) {
              // 現在が最後の1～9である
              i_max = lastmsg_num;
            } else {
              // 現在が最後でない
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
        messages = createMsgObj(res.rows[0].data);
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
    .catch(err => console.error('Error executing query', err.stack));
  }
}

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});

// LINE表示用にテキスト整形する関数
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

// 選手情報JSONからメッセージオブジェクト作成する関数
function createMsgObj(obj) {
  return [
    { 
      type: 'image', 
      originalContentUrl: obj.photo_url,
      previewImageUrl: obj.photo_url
    },
    { 
      type: 'text',
      text: arrangeText(obj)
    }
  ];
}

// テキストにチーム名、背番号が含まれるか判定する関数
function detectTeamAndNum(text) {
  const teams = {
    g: ["読売ジャイアンツ", "読売", "巨人", "ジャイアンツ"],
    b: ["横浜DeNAベイスターズ", "横浜", "DeNA", "ベイスターズ"],
    t: ["阪神タイガース", "阪神", "タイガース"],
    c: ["広島東洋カープ", "広島", "カープ"],
    d: ["中日ドラゴンズ", "中日", "ドラゴンズ"],
    s: ["東京ヤクルトスワローズ", "ヤクルト", "スワローズ"],
    l: ["埼玉西武ライオンズ", "西武", "ライオンズ"],
    h: ["福岡ソフトバンクホークス", "ホークス", "ソフトバンク"],
    e: ["東北楽天ゴールデンイーグルス", "楽天", "イーグルス"],
    m: ["千葉ロッテマリーンズ", "ロッテ", "マリーンズ"],
    f: ["北海道日本ハムファイターズ", "日ハム", "ファイターズ"],
    bf: ["オリックス・バファローズ", "オリックス", "バファローズ", "バッファローズ"]
  };
  
  var result = {
    team: null,
    num:  null
  };
  for (let key in teams) {      // textにチーム名が入っているか判定
    result.team = checkInclude(text, teams[key]);
    if (result.team) break;
  }
  result.num = detectNum(text); // textに数値が入っているか判定
  return result;

  // textに背番号が含まれているか判定し、含まれていたら背番号を返す関数
  function detectNum(text) {
    // 全角数字を半角に直す
    text = text.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 65248));
    return text.replace(/[^0-9]/g, "");
  };

  // textがチーム名配列に含まれているか判定し、含まれていたらチーム名を返す関数
  function checkInclude(text, matchArary) {
    var inc_team = null;
    matchArary.forEach(e => {
      if(text.indexOf(e) != -1) {
        inc_team = matchArary[0];
      }
    });
    return inc_team;
  };
};