// 定期実行用のラッパースクリプト
// 12球団の全選手のページにアクセスしてscraping.jsを実行し、DBに格納する

'use strict';

const request  = require('request');
const cheerio  = require('cheerio');
const { Pool } = require('pg');
const pool     = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

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
               VALUES ($1, $2, current_timestamp)
              `;
// あればUPDATE, なければINSERT
//const query = `INSERT INTO player (url, data, updated_at)
//               VALUES ($1, $2, current_timestamp)
//               ON CONFLICT(url)
//               DO UPDATE SET data = $2, updated_at = current_timestamp;
//              `;

// テーブル全削除
pool.query("DELETE FROM player")
.then(console.log("seccessful DELETE DB"))
.catch(err => console.error('Error executing query', err.stack));

// 選手一覧ページの全選手に対してgetPlayerDataByUrl関数を実行して、結果をDBに格納する
url_teams.forEach((url_team, j) => {
  setTimeout(() => { // 1チームあたり100秒おきにアクセス
    request(url_team, (e, response) => {
      if (e) {
        console.error(e);
      }
      try {
        // 選手一覧ページの全選手URLを取得
        console.log(url_team);
        const $ = cheerio.load(response.body);
        $('td.rosterRegister > a').each((i, elem) => {
          url_players[i] = $(elem).attr('href');
          console.log($(elem).text());
          console.log(url_players[i]);
        });

        // getPlayerDataByUrl関数を1秒置きに実行して各URLにアクセスを繰り返す
        url_players.forEach((url_p, i) => {
          setTimeout(() => { // 1選手あたり1秒おきにアクセス
            require('./scraping.js').getPlayerDataByURL(url_p).then((res) => {
              // 選手情報オブジェクトをDBに格納
              pool.query(query, [res.url, res])
              .then(console.log("seccessful UPDATE/INSERT DB: " + res.name + "@" +res.team))
              .catch(err => console.error('Error executing query', err.stack));
            });
          }, i * 1000);
        });
        console.log("Successful finish: " + url_team);
        url_players = [];

        // デバッグ用: 選手一人バージョン
        //require('./scraping.js').getPlayerDataByURL(url_players[0]).then((res) => {
        //  // 選手情報オブジェクトをDBに格納
        //  pool.query(query, [res.url, res])
        //  .then(console.log("seccessful UPDATE/INSET DB: " + res.name))
        //  .catch(err => {
        //    console.error('Error executing query', err.stack)
        //  });
        //});

      } catch (e) {
        console.error(e);
      }
    })
  }, j * 150 * 1000)
});
