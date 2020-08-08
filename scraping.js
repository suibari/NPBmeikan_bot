'use strict';

const request = require('request');
const cheerio = require('cheerio');
const moment  = require('moment');
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
        var res_search = [];

        const $ = cheerio.load(response.body);

        //検索結果の配列取得
        $('a.player_unit_1', '#pl_result_list').each((i, elem) => {
          res_search[i] = {};
          //res_search[i].position = $(elem).find('dd.pos').text().replace(/\s+/g, "");  // ポジション&背番号取得&スペース除去
          res_search[i].team     = $(elem).find('dd.team').text().replace(/\s+/g, ""); // チーム取得&スペース除去
          res_search[i].name     = $(elem).find('dd.name').text().replace(/\s+/g, ""); // 名前取得&スペース除去
          res_search[i].url_p    = $(elem).attr('href');
        })

        //url_player = $('a.player_unit_1', '#pl_result_list').attr('href');
        //console.log(url_player);
        if (res_search.length == 1) {
          // 一人だけ検索ヒットした場合、その選手のデータ取得
          getPlayerDataByUrl(res_search[0].url_p).then(player_info => {
            //getPlayerDataByUrl関数実行完了時の処理
            resolve(player_info); // 呼び出し元に選手情報を返す
          });
        } else if (res_search.length > 1) {
          // 複数人検索ヒットした場合、検索結果を返す
          //console.log(res_search);
          resolve(res_search);
        } else {
          // 検索ヒットしない場合、nullを返す
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
            result.stats.inning = stats_2020.find('td').eq(13).text().replace(/\s+/g, ""); // 投球回のスペース除去
            result.stats.h      = stats_2020.find('td').eq(15).text();
            result.stats.bb     = stats_2020.find('td').eq(17).text();
            result.stats.era    = stats_2020.find('td').eq(24).text();
            // WHIP計算
            var ing_int  = Number(String(result.stats.inning).split(".")[0]); //投球回の整数部分を得る
            var ing_frac = Number(String(result.stats.inning).split(".")[1]); //投球回の小数部分を得る
            var h_p_bb   = parseInt(result.stats.h)+parseInt(result.stats.bb); //安打数＋四球
            if (ing_frac == 2) {
              // 投球回小数部:2/3 
              result.stats.whip = Math.round((h_p_bb/(ing_int+2/3))* 100 ) / 100;
            } else if (ing_frac == 1) {
              // 投球回小数部:1/3
              result.stats.whip = Math.round((h_p_bb/(ing_int+1/3))* 100 ) / 100;
            } else {
              // 投球回小数部なし
              result.stats.whip = Math.round((h_p_bb/ ing_int     )* 100 ) / 100;
            }
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
              result[key][key2] = result[key][key2].toString().replace(/\s{2,}/g, ""); // 2文字以上連続するスペースor改行を削除
            }
          } else {
            // 第１階層目ならそのままスペース除去
            result[key] = result[key].toString().replace(/\s{2,}/g, ""); // 2文字以上連続するスペースor改行を削除
          }
        };

        // 誕生日算出
        var date_bth = moment(result.birthday, "YYYY年MM月DD日").format();
        result.age   = moment().diff(date_bth, 'years');

        console.log(result);
        resolve(result); //処理完了時にresultを返す

      } catch (e) {
        console.error(e);
      }
    })
  });
};

