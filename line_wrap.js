const line     = require('@line/bot-sdk');
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

// create LINE SDK client
const client = new line.Client(config);

exports.replyMessageByNumber = function (event, res) {
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
};

exports.replyMessageByName = function (event, res) {
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
  const stats_thisyear     = obj.stats_2020;
  const txt_stats_thisyear = (stats_thisyear) ? 
                             ((obj.position == "投手") ?
                               ("試" + stats_thisyear.game + "/勝" + stats_thisyear.win + "/敗" + stats_thisyear.lose + "/S" + stats_thisyear.save +
                               "/回" + stats_thisyear.inning + "/防" + stats_thisyear.era + "/WHIP:" + stats_thisyear.whip) :
                               ("試" + stats_thisyear.game + "/打" + stats_thisyear.ab + "/安" + stats_thisyear.h + "/率" + stats_thisyear.avg + "/出" + stats_thisyear.obp + 
                               "/本" + stats_thisyear.hr + "/点" + stats_thisyear.rbi + "/盗" + stats_thisyear.sb + "/OPS:" + stats_thisyear.ops)) :
                             ("今シーズン未出場");  
  const stats_total        = obj.stats_total;
  const txt_stats_total    = (stats_total) ? 
                             ((obj.position == "投手") ?
                               ("試" + stats_total.game + "/勝" + stats_total.win + "/敗" + stats_total.lose + "/S" + stats_total.save +
                               "/回" + stats_total.inning + "/防" + stats_total.era + "/WHIP:" + stats_total.whip) :
                               ("試" + stats_total.game + "/打" + stats_total.ab + "/安" + stats_total.h + "/率" + stats_total.avg + "/出" + stats_total.obp + 
                               "/本" + stats_total.hr + "/点" + stats_total.rbi + "/盗" + stats_total.sb + "/OPS:" + stats_total.ops)) :
                             ("公式戦未出場");

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
                  "text": "2020",
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