NPB選手名鑑 LINE-bot
====

本アプリは、[NPB(日本プロ野球機構)ウェブサイト](https://npb.jp/)から12球団現役プロ野球選手のリアルタイム情報を取得し、LINEトークの会話に応じた選手情報を表示するLINE botです。

現在、野球速報アプリや本などで選手情報を得ることはできますが、野球速報アプリだと欲しい情報までたどり着くのに数タップの時間がかかったり、本だと最新のデータは得られなかったりします。

なのでLINEという身近な媒体で最新データをすぐに得られるものがあればいいな　と思ったのが開発背景です。

## Description

本アプリは以下2種の機能を持ちます。

### 1. プロ野球選手データのリアルタイム取得

* 1日1回、NPBのウェブサイトをスクレイピングする
* 現役プロ野球選手のプロフィール(氏名、生年月日、キャリアなど)および成績を取得する
* 現役選手とは支配下登録選手および育成選手である(2020/8/10現在、931名)
* NPBウェブサイトからは得られないがネット上で広く用いられている指標(OPS, WHIPなど)を計算する
* 取得・計算した選手データはRDBに格納する
* NPBウェブサイトアクセスは、必ず1秒以上取得間隔を置くように制御する (サーバ負荷を考慮)

### 2. LINE-botとしてユーザに情報表示

* LINE-botの公開
* ユーザがbotを友達登録後に選手名をトークすると、botはその選手の情報をRDBから取得してユーザに返答する
* 複数名の選手がRDBで検索hitした場合は、botはLINEのカルーセルメッセージ形式で該当選手候補をユーザに返答する
* ユーザがカルーセルメッセージの選手名をタップすれば、botはその選手の情報をRDBから取得してユーザに返答する

## Demo

<blockquote class="twitter-tweet"><p lang="ja" dir="ltr">たのしい <a href="https://t.co/I5lnlHmJHd">pic.twitter.com/I5lnlHmJHd</a></p>&mdash; すいばり@&#39;19年度3勝4敗⚾️ (@Suibari_cha) <a href="https://twitter.com/Suibari_cha/status/1292715250593095682?ref_src=twsrc%5Etfw">August 10, 2020</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

## VS. 

本botは以下のLINE-botに影響を受けて、開発に着手しました。

[Bリーグの選手情報を返すLINE Botを作った](https://kta-basket.hatenablog.com/entry/2019/02/08/005551)

こちらのBリーグ選手情報botと本プロ野球選手名鑑botで異なる点は以下です。

* スクレイピング対象のウェブサイトと構造が異なる
* 開発言語をpythonに対してnode.jsとした
* データ格納場所をGoogleスプレッドシートに対してRDB(heroku postgres)とした
* LINE-botサーバをGoogle Apps Scriptに対してherokuとした

## Requirement

LINEアカウントが登録されたLINEインストール済みのすべてのデバイスで使えます。

※一部デバイス(Apple Watchなど)だと、複数選手検索hit時の表示に制限があるかもしれません。

## Usage

以下からLINE友達追加してご利用ください！

<a href="https://lin.ee/CqYJbKN"><img src="https://scdn.line-apps.com/n/line_add_friends/btn/ja.png" alt="友だち追加" height="36" border="0"></a>

※なお、誰と友達になっているかや何をトークしたかなどは、私からは一切わかりません。安心してご利用ください。

## Licence

MIT

## Author

[suibari](https://github.com/suibari)

