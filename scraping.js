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
// !!!!ローカルデバッグ用!!!!: 上をコメントアウトしてこの行を有効化すること
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
        result.url       = url;
        result.name      = $('li#pc_v_name').text(); //名前
        result.team      = $('li#pc_v_team').text(); //チーム名
        result.no        = $('li#pc_v_no').text();   //
        result.photo_url = $('div#pc_v_photo > img').attr('src');
        var bio = $('section#pc_bio');
        result.position  = bio.find('tr').eq(0).find('td').text();
        result.bt        = bio.find('tr').eq(1).find('td').text();
        result.hw        = bio.find('tr').eq(2).find('td').text();
        result.birthday  = bio.find('tr').eq(3).find('td').text();
        result.career    = bio.find('tr').eq(4).find('td').text();
        result.draft_y   = bio.find('tr').eq(5).find('td').text();

        // 2020年度の成績を取得
        var stats_2020 = $('div#pc_stats_wrapper td.year:contains("2020")').parent();

        if (stats_2020[0]) { // 今年度出場しているか
          result.stats = {};
          if (result.position == "投手") {
            result.stats.game   = stats_2020.find('td').eq(2).text();
            result.stats.win    = stats_2020.find('td').eq(3).text();
            result.stats.lose   = stats_2020.find('td').eq(4).text();
            result.stats.save   = stats_2020.find('td').eq(5).text();
            result.stats.inning = stats_2020.find('td').eq(13).text();
            result.stats.era    = stats_2020.find('td').eq(24).text();
          } else {
            result.stats.game = stats_2020.find('td').eq(2).text();
            result.stats.ab   = stats_2020.find('td').eq(4).text();
            result.stats.h    = stats_2020.find('td').eq(6).text();
            result.stats.hr   = stats_2020.find('td').eq(9).text();
            result.stats.rbi  = stats_2020.find('td').eq(11).text();
            result.stats.sb   = stats_2020.find('td').eq(12).text();
            result.stats.avg  = stats_2020.find('td').eq(20).text();
            result.stats.slg  = stats_2020.find('td').eq(21).text();
            result.stats.obp  = stats_2020.find('td').eq(22).text();
            // OPS計算
            result.stats.ops  = Math.round((parseFloat(result.stats.slg) + parseFloat(result.stats.obp)) * 1000) / 1000;
          }
        } else {
          // 今シーズンの出場がない場合、stats propertyはnull
        }

        // スペース除去
        for (let key in result) {
          // オブジェクトの第2階層目があるかどうか
          if (typeof result[key] === "object") {
            // 第２階層目を掃引
            for (let key2 in result[key]) {
              result[key][key2] = result[key][key2].toString().replace(/(^\s+)|(\s+$)/g, "");
            }
          } else {
            // 第１階層目ならそのままスペース除去
            result[key] = result[key].toString().replace(/(^\s+)|(\s+$)/g, "");
          }
        };

        console.log(result);
        resolve(result); //処理完了時にresultを返す

      } catch (e) {
        console.error(e);
      }
    })
  });
};

