const scraping = require('./scraping.js');

exports.createMessageByNumber = async function (res, dct_tn) {
  if (res.length > 0) {
    const obj = JSON.parse(res[0].data);
    const news = await scraping.getNews(obj.name);
    const messages_main = createMsgObj(obj);
    const messages_news = createMsgNewsObj(news);
    messages = [messages_main, messages_news];
  } else {
    // 選手hitしなかった場合
    messages = {
      type: 'text',
      text: dct_tn.team + "の背番号" + dct_tn.num + "はいませんでした。"
    };
  }
  return messages;
};

exports.createMessageByName = async function (res) {
  const res_length = res.length;

  if (res_length > 1) {
    // 複数選手hitした場合
    messages = [];
    const msg_length  = Math.ceil(res_length / 10); // 選手数を10で割った商(切り上げ)を計算
    const lastmsg_num = res_length - Math.floor(res_length / 10) * 10; // 選手数を10で割った余りを計算
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
          var obj = JSON.parse(res[j*10+i].data);
          console.log(obj);
          messages[j].template.columns[i]       = {};
          messages[j].template.columns[i].title = obj.name;
          messages[j].template.columns[i].text  = obj.team;
          messages[j].template.columns[i].actions          = [{}];
          messages[j].template.columns[i].actions[0].type  = "message";
          messages[j].template.columns[i].actions[0].label = "この選手を検索";
          messages[j].template.columns[i].actions[0].text  = obj.name;
          messages[j].template.columns[i].defaultAction    = messages[j].template.columns[i].actions[0];
        }
      };
      //console.log(messages);
    } else {
      // 検索結果が50人より大きいので、LINEで表示不可。エラーを返す
      messages = {type: 'text',
                  text: "選手検索結果が50件を超えました。もう少し長い選手名で試してみてください。"};
    };

  } else if (res_length == 1) {
    // 単一選手hitした場合
    const obj = JSON.parse(res[0].data);
    const news = await scraping.getNews(obj.name);
    const messages_main = createMsgObj(obj);
    const messages_news = createMsgNewsObj(news);
    messages = [messages_main, messages_news];

  } else {
    // 選手hitしなかった場合
    messages = {
      type: 'text',
      text: "選手が見つかりませんでした。"
    };
  }

  // use reply API
  return messages;
}

// LINE表示用にテキスト整形する関数
//function arrangeText(obj) {
//  var res;
//
//  res = obj.name + " (" + obj.kana + ")\n" +
//        obj.team + " #" + obj.no + "\n" + 
//        obj.position + "/" + obj.bt + "\n" +
//        obj.birthday + "生まれ (" + obj.age + "歳)\n" +
//        obj.career   + (obj.draft_y ? (" (" + obj.draft_y + ")") : "") + "\n" + 
//        "\n";
//  if (obj.stats) {
//    res = res + "<今シーズンの成績>\n"
//    if (obj.position == "投手") {
//      res = res + "試" + obj.stats.game + "/勝" + obj.stats.win + "/敗" + obj.stats.lose + "/S" + obj.stats.save +
//                  "/回" + obj.stats.inning + "/防" + obj.stats.era + "/WHIP:" + obj.stats.whip;
//    } else {
//      res = res + "試" + obj.stats.game + "/打" + obj.stats.ab + "/安" + obj.stats.h + "/率" + obj.stats.avg + "/出" + obj.stats.obp + 
//                  "/本" + obj.stats.hr + "/点" + obj.stats.rbi + "/盗" + obj.stats.sb + "/OPS:" + obj.stats.ops;
//    }
//  } else {
//    res = res + "<今シーズン未出場>"
//  }
//  return res;
//}

// -----------------
// 選手情報JSONからメッセージオブジェクト作成する関数
function createMsgObj(obj) {
  const txt_stats_thisyear = generateTextFromStats(obj.position, obj.stats_2022);
  const txt_stats_lastyear = generateTextFromStats(obj.position, obj.stats_2021);
  const txt_stats_total    = generateTextFromStats(obj.position, obj.stats_total);

  const contents = {
    "type": "bubble",
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "box",
          "layout": "horizontal",
          "contents": [
            {
              "type": "text",
              "text": obj.name,
              "size": "xxl",
              "weight": "bold",
              "flex": 0
            },
            {
              "type": "text",
              "text": "(" + obj.kana + ")",
              "size": "sm",
              "margin": "md",
              "wrap": true,
              "color": "#aaaaaa",
              "gravity": "bottom"
            }
          ]
        },
        {
          "type": "text",
          "text": obj.team + " #" + obj.no,
          "size": "sm",
          "margin": "xs",
          "color": "#aaaaaa"
        },
        {
          "type": "box",
          "layout": "vertical",
          "spacing": "sm",
          "margin": "md",
          "contents": [
            {
              "type": "box",
              "layout": "baseline",
              "spacing": "sm",
              "contents": [
                {
                  "type": "text",
                  "text": "Profile",
                  "color": "#aaaaaa",
                  "size": "md",
                  "flex": 1
                },
                {
                  "type": "text",
                  "text": obj.position + "/" + obj.bt + "\n" +
                          obj.birthday + "生まれ (" + obj.age + "歳)\n" +
                          obj.career   + (obj.draft_y ? (" (" + obj.draft_y + ")") : ""),
                  "wrap": true,
                  "size": "md",
                  "flex": 5
                }
              ]
            },
            {
              "type": "box",
              "layout": "baseline",
              "contents": [
                {
                  "type": "text",
                  "text": "2022",
                  "color": "#aaaaaa",
                  "size": "md",
                  "flex": 1
                },
                {
                  "type": "text",
                  "text": txt_stats_thisyear,
                  "wrap": true,
                  "size": "md",
                  "flex": 5
                }
              ],
              "spacing": "sm"
            },
            {
              "type": "box",
              "layout": "baseline",
              "contents": [
                {
                  "type": "text",
                  "text": "2021",
                  "color": "#aaaaaa",
                  "size": "md",
                  "flex": 1
                },
                {
                  "type": "text",
                  "text": txt_stats_lastyear,
                  "wrap": true,
                  "size": "md",
                  "flex": 5
                }
              ],
              "spacing": "sm"
            },
            {
              "type": "box",
              "layout": "baseline",
              "contents": [
                {
                  "type": "text",
                  "text": "通算",
                  "color": "#aaaaaa",
                  "size": "md",
                  "flex": 1
                },
                {
                  "type": "text",
                  "text": txt_stats_total,
                  "wrap": true,
                  "size": "md",
                  "flex": 5
                }
              ],
              "spacing": "sm"
            }
          ]
        }
      ]
    },
    "footer": {
      "type": "box",
      "layout": "horizontal",
      "spacing": "sm",
      "contents": [
        {
          "type": "image",
          "url": obj.photo_url,
          "flex": 0,
          "size": "xs"
        },
        {
          "type": "text",
          "text": obj.url,
          "wrap": true,
          "color": "#FFFFFF",
          "decoration": "underline",
          "gravity": "center"
        }
      ],
      "flex": 0,
      "action": {
        "type": "uri",
        "label": "action",
        "uri": obj.url
      }
    },
    "size": "giga",
    "styles": {
      "footer": {
        "backgroundColor": "#464F69"
      }
    }
  };
  return {
    type: "flex",
    altText: obj.name + "/" + txt_stats_thisyear,
    contents: contents
  };

  //return [
  //  { 
  //    type: 'image', 
  //    originalContentUrl: obj.photo_url,
  //    previewImageUrl: obj.photo_url
  //  },
  //  { 
  //    type: 'text',
  //    text: arrangeText(obj)
  //  }
  //];
}

function createMsgNewsObj (news) {
  const displayedNewsMAX = 3;
  var displayedNews;

  var message = {
    "type": "flex",
    "altText": "選手ニュース",
    "contents": {
      "type": "carousel",
      "contents": []
    }
  };
  
  // ニュース件数がdisplayedNews以下か
  if (news.title.length >= displayedNewsMAX) {
    displayedNews = displayedNewsMAX;
  } else {
    displayedNews = news.title.length;
  }

  if (displayedNews > 0) {
    for (let i=0; i<displayedNews; i++) {
      const contents = createContents(news.title[i], news.src[i], news.img[i], news.link[i]);
      message.contents.contents.push(contents);
    };
    return message;
  } else {
    message = {
      type: 'text',
      text: "ニュースは見つかりませんでした。"
    };
    return message;
  }

  function createContents (title, src, img, link) {
    return {
      "type": "bubble",
      "size": "micro",
      "hero": {
        "type": "image",
        "url": img,
        "size": "full",
        "aspectMode": "cover",
        "aspectRatio": "320:213"
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": title,
            "weight": "bold",
            "size": "sm",
            "wrap": true
          },
          {
            "type": "text",
            "text": src,
            "size": "xxs",
            "wrap": true
          }
        ],
        "spacing": "sm",
        "paddingAll": "lg"
      },
      "action": {
        "type": "uri",
        "label": "action",
        "uri": link
      }
    }
  }
}

function generateTextFromStats (position, stats) {
  return stats_year = (stats) ? 
                      ((position == "投手") ?
                        ("試" + stats.game + "/勝" + stats.win + "/敗" + stats.lose + "/S" + stats.save +
                        "/回" + stats.inning + "/防" + stats.era + "/WHIP:" + stats.whip) :
                        ("試" + stats.game + "/打" + stats.ab + "/安" + stats.h + "/率" + stats.avg + "/出" + stats.obp + 
                        "/本" + stats.hr + "/点" + stats.rbi + "/盗" + stats.sb + "/OPS:" + stats.ops)) :
                      ("シーズン未出場");  
}