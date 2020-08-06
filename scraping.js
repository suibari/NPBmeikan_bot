'use strict';

const request = require('request');
const cheerio = require('cheerio');
const url_base = 'https://npb.jp/';
const url_srch = 'bis/players/search/result?active_flg=Y&search_keyword='; // npb公式選手検索

// index.jsから関数読み出し可能にする. NPB選手検索システムから検索結果を得る
exports.getPlayerData = function (q) {
  return new Promise(function (resolve, reject) {
    getPlayerDataByName(q).then(res => {
      resolve(res);
    })
  })
}
// ローカルデバッグ用: 上をコメントアウトしてこの行を有効化すること
//getPlayerDataByName(process.argv[2]);

// 選手名から選手データのページURLを得てgetPlayerDataByUrlを実行する関数
function getPlayerDataByName(q) {
  return new Promise((resolve, reject) => {
    request(encodeURI(url_base + url_srch + q), (e, response, body) => {
      if (e) {
        console.error(e);
      }
      try {
        var url_player;

        const $ = cheerio.load(response.body);
        url_player = $('a.player_unit_1', '#pl_result_list').attr('href');
        //console.log(url_player);
        if (url_player) {
          getPlayerDataByUrl(url_player).then(player_info => {
            //getPlayerDataByUrl関数実行完了時の処理
            resolve(player_info); // 呼び出し元に選手情報を返す
            //console.log(player_info);
          });
        } else {
          // 検索で引っかからない場合、nullを返す
          resolve(null);
        }

      } catch (e) {
        console.error(e);
      }
    })
  });
};

// 選手データページURLからデータ取得する関数
function getPlayerDataByUrl(url_p) {
  return new Promise((resolve, reject) => {
    const url = url_base + url_p;
    var result = {};

    request(url, (e, response, body) => {
      if (e) {
        console.error(e);
      }
      try {
        // オブジェクトに選手データを格納
        const $ = cheerio.load(response.body);
        result.url = url;
        result.name = $('li#pc_v_name').text(); //名前
        result.team = $('li#pc_v_team').text(); //チーム名
        result.no = $('li#pc_v_no').text();   //
        result.photo_url = $('div#pc_v_photo > img').attr('src');
        var bio = $('section#pc_bio');
        result.position = bio.find('tr').eq(0).find('td').text();
        result.bt = bio.find('tr').eq(1).find('td').text();
        result.hw = bio.find('tr').eq(2).find('td').text();
        result.birthday = bio.find('tr').eq(3).find('td').text();
        result.career = bio.find('tr').eq(4).find('td').text();
        result.draft_y = bio.find('tr').eq(5).find('td').text();

        // 2020年度の成績を取得
        var stats = $('div#pc_stats_wrapper td.year:contains("2020")').parent();
        //console.log(stats);
        if (stats) {
          result.stats = {};
          if (result.position == "投手") {
            result.stats.game = stats.find('td').eq(2).text();
            result.stats.win  = stats.find('td').eq(3).text();
            result.stats.lose = stats.find('td').eq(4).text();
            result.stats.save = stats.find('td').eq(5).text();
            result.stats.era  = stats.find('td').eq(24).text();
          } else {
            result.stats.game = stats.find('td').eq(2).text();
            result.stats.ab   = stats.find('td').eq(4).text();
            result.stats.avg  = stats.find('td').eq(20).text();
            result.stats.slg  = stats.find('td').eq(21).text();
            result.stats.obp  = stats.find('td').eq(22).text();
          }
        } else {
          // 今シーズンの出場がない場合、stats propertyはnull
        }

        console.log(result);
        resolve(result); //処理完了時にresultを返す

      } catch (e) {
        console.error(e);
      }
    })
  });
};

