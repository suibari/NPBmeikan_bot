'use strict';

const express  = require('express');
const { Pool } = require('pg');
const pool     = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const line      = require('@line/bot-sdk');
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};
const line_wrap = require('./line_wrap.js');
//const query_name    = `SELECT * FROM player WHERE data->>'name' LIKE '%' || $1 || '%' ;`;
const query_team_no = `SELECT * FROM player WHERE data->>'team' = $1 AND data->>'no' = $2 ;`;

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
    res.status(200).send(res_pg.rows[0].data);
  }).catch(err => {
    console.error('Error executing query', err.stack);
    res.status(400).send();
  });
});

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});

// ----------------------------------------
// event handler
function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    // ignore non-text-message event
    return Promise.resolve(null);
  }
  
  var dct_tn = detectTeamAndNum(event.message.text);

  if ((dct_tn.team) && (dct_tn.num)) {
    // メッセージにチーム名および背番号が含まれている
    // SQL-selet (チーム名&背番号検索)
    pool.query(query_team_no, [dct_tn.team, dct_tn.num])
    .then((res) => {
      line_wrap.replyMessageByNumber(event, res);
    })
    .catch(err => console.error('Error executing query', err.stack));

  } else {
    // メッセージは選手名検索である
    // SQL-select (選手名検索)
    const query_name = require('./itaiji.js').getQuery(escapeSQL(event.message.text)); // メタエスケープ＆異体字を考慮してLIKE～ORしたクエリを生成
    pool.query(query_name)
    .then((res) => {
      line_wrap.replyMessageByName(event, res);
    })
    .catch(err => console.error('Error executing query', err.stack));
  }
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

function escapeSQL(str) {
  return str.replace(/'/g,  "''")
            .replace(/"/g,  '\"')
            .replace(/\\/g, "\\")
            .replace(/_/g,  "\_")
            .replace(/%/g,  "\%");
}