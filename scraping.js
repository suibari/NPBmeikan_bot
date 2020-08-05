'use strict';

const request  = require('request');
const cheerio  = require('cheerio');
//const { response } = require('express');
const moment   = require('moment');
const url_base = 'https://npb.jp/';
const url_srch = 'bis/players/search/result?active_flg=Y&search_keyword='; // npb公式選手検索

// index.jsから関数読み出し可能にする. NPB選手検索システムから検索結果を得る
exports.getPlayerData = function (q) {
    return new Promise(function (resolve, reject) {
        var res = getPlayerDataByName(q);
        resolve(res);
    })
} 
//getPlayerDataByName(process.argv[2]);

// 選手名から選手データのページURLを得てgetPlayerDataByUrlを実行する関数
function getPlayerDataByName(q) {
    request(url_base+url_srch+q, (e, response, body) => {
        if (e) {
            console.error(e);
        }
        try {
            var url_player;
    
            const $ = cheerio.load(response.body);
            url_player = $('a.player_unit_1', '#pl_result_list' ).attr('href');
            //console.log(url_player);
            getPlayerDataByUrl(url_player).then(player_info => {
                //getPlayerDataByUrl関数実行完了時の処理
                //console.log(player_info);
                console.log(arrangeText(player_info));
                return arrangeText(player_info);
            });
    
        } catch (e) {
            console.error(e);
        }
    }
)};

// 選手データページURLからデータ取得する関数
function getPlayerDataByUrl(url_p) {
    return new Promise((resolve, reject) => {
        const url  = url_base+url_p;
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
                
                resolve(result); //処理完了時にresultを返す

            } catch (e) {
                console.error(e);
            }
        })
    });
};

function arrangeText(obj) {
    var dst = moment(obj.birthday, "YYYY年MM月DD日").format();
    return obj.name + "\n" +
           obj.team + " #" + obj.no + "\n" + 
           obj.position + "/" + obj.bt + "\n" +
           obj.birthday + "生まれ(" + moment().diff(dst, 'years') + "歳)\n";
}