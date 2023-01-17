const line_wrap = require('./line_wrap.js');
const itaiji = require('./itaiji.js');

//const redis = new Redis("rediss://red-cf0ln8cgqg45vete6ej0:rXw9XsVXAPoude6qsriJlyNrQBL76cgI@singapore-redis.render.com:6379");
const {BigQuery} = require('@google-cloud/bigquery');
const bigquery = new BigQuery({
  projectId: 'npbmeikan-bot',
  keyFilename: './.key.json'
});

exports.createMessage = function (text) {
  return new Promise (resolve => {
  
    const query_team_no = `SELECT * FROM npb_players.player WHERE team = @team AND number = @number ;`;
    
    // チーム名、背番号が含まれるか判定
    const dct_tn = detectTeamAndNum(text);
    
    if ((dct_tn.team) && (dct_tn.num)) {
      // メッセージにチーム名および背番号が含まれている
      // SQL-selet (チーム名&背番号検索)
      //pool.query(query_team_no, [dct_tn.team, dct_tn.num])
      //redis.hget()
      const params = {
        team: dct_tn.team,
        number: dct_tn.num
      };
      bigquery.query({query: query_team_no, params: params})
      .then((res) => {
        const message = line_wrap.createMessageByNumber(res[0], dct_tn);
        console.log(message);
        return resolve(message);
      })
      .catch(err => console.error('Error executing query', err.stack));

    } else {
      // メッセージは選手名検索である
      // SQL-select (選手名検索)
      const query_name = itaiji.getQuery(escapeSQL(text)); // メタエスケープ＆異体字を考慮してLIKE～ORしたクエリを生成
      //pool.query(query_name)
      bigquery.query(query_name)
      .then((res) => {
        const message = line_wrap.createMessageByName(res[0]);
        console.log(message);
        return resolve(message);
      })
      .catch(err => console.error('Error executing query', err.stack));
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

function getKeysByFieldAndValue(field, value) {
  return new Promise (async (resolve) => {
    var result = [];

    const keys = await redis.keys('*');
    console.log("keys finish");
    for (const key of keys) {
      const v = await redis.hget(key, field);
      console.log("hget finish");
      if (v.indexOf(value) != -1) {
        result.push(key);
      }
    }

    resolve(result);
  });
}