const request = require('request');
const cheerio = require('cheerio');

exports.getNews = function (name) {
  return new Promise (resolve => {
    const BASE_URL = "https://news.yahoo.co.jp/search?p="
    var result = {title:[],img:[],link:[],src:[]};
    
    const URL = BASE_URL + encodeURI(name);
    request(URL, (e, resp, body) => {
      if (e) {
        console.error(e);
      }
      const $ = cheerio.load(body);
      $('a.newsFeed_item_link').each((i, elem) => {
        result.title[i] = $('div.newsFeed_item_title', elem).text(); // タイトル取得
        result.img[i]   = $('source' ,'div.thumbnail', elem).attr('srcset') // 画像取得
        result.link[i]  = $(elem).attr('href'); // リンク取得
        result.src[i]   = $('div.newsFeed_item_sourceWrap', elem).text(); // 出典取得
      });
      //console.log(result);
      return resolve(result);
    })
  })
}