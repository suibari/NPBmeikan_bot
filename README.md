NPB選手名鑑 LINE-bot
====

LINEトークの会話に応じて12球団現役プロ野球選手のリアルタイム情報を返信するLINE botです。

選手情報は、[NPB(日本プロ野球機構)ウェブサイト](https://npb.jp/)から引用させていただきました。

## Demo

![image](https://user-images.githubusercontent.com/61776220/90086377-4488dc00-dd55-11ea-8f20-7f7d08a77150.gif)

## Description

![npbmeikan](https://user-images.githubusercontent.com/61776220/90129304-5c874c80-dda3-11ea-8f72-c9756ffb93bc.png)

本アプリは以下の機能を持ちます。

### 1. プロ野球選手データの定期取得

* 1日1回、NPBのウェブサイトをスクレイピングする
* 現役プロ野球選手のプロフィール(氏名、生年月日、キャリアなど)および成績を取得する
* 現役選手とは支配下登録選手および育成選手である(2020/8/10現在、931名)
* NPBウェブサイトからは得られないが野球ファンの間で広く用いられている指標(OPS, WHIPなど)を計算する
* 取得・計算した選手データはRDBに格納する
* スクレイピングは、必ず1秒以上アクセス間隔を置くように制御する (サーバ負荷を考慮)

### 2. LINE-botとしてユーザに情報表示

* LINE-botの公開
* ユーザがbotに選手名をトークすると、botはその選手の情報をRDBから取得してユーザに返答する
* ユーザがbotにチーム名+背番号をトークすると、botはその選手の情報をRDBから取得してユーザに返答する
* 複数名の選手がRDBで検索hitした場合は、botは該当選手候補を一覧化してユーザに返答する
* ユーザが複数選手一覧をタップしたら、botはその選手の情報をRDBから取得してユーザに返答する
* 選手名検索では異体字を考慮する（斎藤が検索されたとき、斉藤と斎藤もOR検索する。山崎が検索されたとき、山﨑もOR検索する　など）

## VS. 

以下のLINE-botを拝見して影響を受け、開発着手しました。

[Bリーグの選手情報を返すLINE Botを作った](https://kta-basket.hatenablog.com/entry/2019/02/08/005551)

こちらのBリーグ選手情報botと本botで異なる点は以下となりました。

* スクレイピング対象のウェブサイトと構造が異なる
* 開発言語をpythonに対してnode.jsとした
* データ格納場所をGoogleスプレッドシートに対してRDB(heroku postgres)とした
* LINE-botサーバをGoogle Apps Scriptに対してherokuとした
* 選手名検索機能を追加した
* LINE flex messageを使用してみた

## Requirement

LINEアカウントが登録されたLINEインストール済みのすべてのデバイスで使えます。

※ただし一部デバイス(PC版, Apple Watch版など)だと、複数選手検索hit時の表示が制限されます。

## Usage

以下からLINE友達追加してご利用ください！

<a href="https://lin.ee/CqYJbKN"><img src="https://scdn.line-apps.com/n/line_add_friends/btn/ja.png" alt="友だち追加" height="36" border="0"></a>

※ちなみに、botが誰と友達になっているかは私からは分かりません。安心してご利用ください。

## Licence

MIT

## Author

[suibari](https://github.com/suibari)

