// 定期実行用のラッパースクリプト
// 12球団の全選手のページにアクセスしてscraping.jsを実行し、DBに格納する

'use strict';

const request = require('request');
const cheerio = require('cheerio');
const sqlite3 = require("sqlite3");
const db = new sqlite3.Database(':memory:');
const scraper = require('./scraping_worker.js');

const line_wrap = require('./line_wrap.js');
const itaiji = require('./itaiji.js');

// ----------------------
// main function

// 12球団それぞれ全選手が載っているURL
const url_teams =  ["https://npb.jp/bis/teams/rst_g.html",
                    "https://npb.jp/bis/teams/rst_db.html",
                    "https://npb.jp/bis/teams/rst_t.html",
                    "https://npb.jp/bis/teams/rst_c.html",
                    "https://npb.jp/bis/teams/rst_d.html",
                    "https://npb.jp/bis/teams/rst_s.html",
                    "https://npb.jp/bis/teams/rst_l.html",
                    "https://npb.jp/bis/teams/rst_h.html",
                    "https://npb.jp/bis/teams/rst_e.html",
                    "https://npb.jp/bis/teams/rst_m.html",
                    "https://npb.jp/bis/teams/rst_f.html",
                    "https://npb.jp/bis/teams/rst_b.html"];
var url_players = [];

// SQLクエリ(UPDATE)
const query = `INSERT INTO player (url, data, updated_at)
               VALUES ($url, $data, current_timestamp)
              `;

console.log("[WORKER] start worker.")
// 選手一覧ページの全選手に対してgetPlayerDataByUrl関数を実行して、結果をDBに格納する
db.serialize(async() => {
  // テーブルが存在すれば削除し、存在しなければ作る
  db.run("DROP TABLE IF EXISTS player")
  db.run("CREATE TABLE IF NOT EXISTS player(url, data, updated_at)");
  console.log("[WORKER] create db.")

  const url_players = await createPlayerUrlArray();
  await insertDb(url_players);

  return;
});

// -------------------------------
// api (from router.js)
exports.createMessage = function (text) {
  return new Promise (async resolve => {
  
    // チーム名、背番号が含まれるか判定
    const dct_tn = detectTeamAndNum(text);
    
    if ((dct_tn.team) && (dct_tn.num)) {
      // メッセージにチーム名および背番号が含まれている
      const result = await getPlayerJson(text);
      console.log("[WORKER] detect team and number!");
      console.log(result);
      const message = await line_wrap.createMessageByNumber(result, dct_tn);
      return resolve(message);

    } else {
      // メッセージは選手名検索である
      const result = await getPlayerJson(text);
      console.log("[WORKER] detect player name!");
      console.log(result);
      const message = await line_wrap.createMessageByName(result);
      return resolve(message);
    };
  })
};

exports.getPlayerJson = function (query) {
  return new Promise (resolve => {
  
    const query_team_no = `SELECT * FROM player WHERE data->>'team' = $team AND data->>'no' = $number ;`;
    
    // チーム名、背番号が含まれるか判定
    const dct_tn = detectTeamAndNum(query);
    
    if ((dct_tn.team) && (dct_tn.num)) {
      // メッセージにチーム名および背番号が含まれている
      // SQL-selet (チーム名&背番号検索)
      const params = {
        $team: dct_tn.team,
        $number: dct_tn.num
      };
      db.serialize(() => {
        console.log(params);
        db.get(query_team_no, params, (err, row) => {
          return resolve(row);
        });
      });

    } else {
      // メッセージは選手名検索である
      // SQL-select (選手名検索)
      const query_name = itaiji.getQuery(escapeSQL(query)); // メタエスケープ＆異体字を考慮してLIKE～ORしたクエリを生成
      db.serialize(() => {
        db.all(query_name, (err, rows) => {
          return resolve(rows);
        });
      })
    };
  })
};

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

// -------------------------------
function createPlayerUrlArray() {
  return new Promise(async resolve => {
    // 全チームの選手URLを一つの配列にまとめる
    for (const url_team of url_teams) {
      const body = await promiseRequest(url_team);
      const $ = cheerio.load(body);
      $('td.rosterRegister > a').each((i, elem) => {
        const url_player = $(elem).attr('href');
        url_players.push(url_player);
        console.log($(elem).text());
        console.log(url_players[i]);
      });
    };
    // 重複削除
    url_players = Array.from(new Set(url_players));

    resolve(url_players);
  })
}

function insertDb(url_players) {
  return new Promise(async resolve => {
    // 選手をDBに格納
    console.log("[WORKER] start to scrape player info and insert db.")
    for (const url_p of url_players) {
      // エラー時再実行処理
      await retry(scrapingAndHmsetDB(url_p), (e) => {
        console.error(e);
        console.log("sleep and retry...");
        return sleep(1000);
      })
      await sleep(1000);
    }
    console.log("[WORKER] finish loop.")
    resolve();
  })
}

async function scrapingAndHmsetDB (url_p) {
  return new Promise ((resolve, reject) => {
    console.log("[WORKER] conecting: " + url_p);
    scraper.getPlayerDataByURL(url_p).then(res => {
      // 選手情報オブジェクトをDBに格納
      const params = {
        $url: res.url,
        // $name: res.name,
        // $team: res.team,
        // $number: res.no,
        $data: JSON.stringify(res)
      };
      db.serialize(() => {
        db.run(query, params);
        // db.all("SELECT * FROM player;", (err, rows) => {
        //   console.log(rows);
        // });
        console.log("[WORKER] inserted db.");
      });
        resolve();
    })
    .catch(err => {
      console.error('[WORKER] Error: ', err.stack);
      console.log("[WORKER] Error occur: "+ url_p);
      reject(err);
    })
  });
};

function sleep(msec) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, msec)
  });
}

function retry(func, onError) {
  function _retry(e) {
    return onError(e)
    .catch((e) => {
      throw e
    })
    .then(func)
    .catch(_retry);
  }
  return func.catch(_retry)
};

function promiseRequest(options) {
  return new Promise(function (resolve, reject) {
    request(options, function (error, res, body) {
      if (!error && res.statusCode == 200) {
        return resolve(body);
      } else {
        return reject(error);
      }
    });
  });
}