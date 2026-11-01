/* =====================================================================
 * content.js ── 網站「內容檔」：日常更新只改這一個檔案
 * ---------------------------------------------------------------------
 *  ● 改文字／數據／連結／公告：直接修改下面 ZONES 內對應欄位
 *  ● 新增一則公告：在該處 news 陣列最前面加一行 { date, tag, title, url }
 *  ● 更換背景圖：把新圖放到 assets/，再改 SITE.skyImage 檔名
 *  ● 不需要懂 3D，不需要重新建置，存檔後上傳即可
 * ===================================================================== */

window.SITE = {
  orgName: '臺北市政府工務局',
  orgNameEn: 'Public Works Department, Taipei City Government',
  siteTitle: '臺北工務 探索世界',
  siteSubtitle: '走進道路、水利、公園、下水道與山坡地的五大工程世界',
  officialUrl: 'https://pwd.gov.taipei/',
  phone: '1999（外縣市請撥 02-2720-8889）',
  address: '110204 臺北市信義區市府路1號4樓西南區',
  siteUrl: 'https://sunkinmen.github.io/PWD/',   // 正式網址（分享連結用）
  // ── 內容自動更新：Google 試算表「檔案 → 共用 → 發布到網路 → CSV」的網址貼這裡，留空則只用本檔內容
  //    欄位：type(news/metric), zone(hub/nco/heo/pkl/sso/geo), date, tag, title, url, label, value, unit
  sheetCsv: '',
  // ── 使用數據：Google Analytics 4 評估 ID（G-XXXXXXX），留空則不追蹤
  ga4Id: '',
  voiceFiles: false,                   // 有 ElevenLabs 等錄好的 mp3 放進 assets/voice/ 後改成 true（檔名見 README）
  skyImage: 'assets/sky-taipei.jpg',   // Nano Banana 2 生成的台北全景（找不到時自動改用程式繪製天空）
  updated: '2026-10-31'
};

/* 六個世界：hub = 工務局（中央），其餘五個工程處環繞
 * pos：在 3D 地圖上的位置 [x, z]（單位：公尺感，0,0 為市中心）——一般不需改
 * color：主題色（標籤、按鈕、卡片） */
window.ZONES = [
  {
    id: 'hub',
    shortName: '工務局',
    title: '工務局',
    tagline: '五大工程的指揮中樞',
    badge: '市政核心',
    color: '#4a7fd4',
    soft: '#dbe8ff',
    pos: [0, 0],
    subtitle: '統籌臺北市道路橋樑、防洪治水、公園綠地、污水處理與坡地保育五大工程領域，以環狀路網與水系串連五大工程處，守護永續臺北。',
    officialUrl: 'https://pwd.gov.taipei/',
    metrics: [
      { ico: 'building', trend: 'flat', label: '所屬工程處', value: '5', unit: '處' },
      { ico: 'stamp', trend: 'up', label: '累計獲獎', value: '770', unit: '座' },
      { ico: 'tasks', trend: 'up', label: '線上申辦', value: '63', unit: '項' }
    ],
    portal: true,   // 有「工務局完整資訊」（js/pwd-portal.js）
    services: [
      { name: '台北服務通 線上申辦', icon: '🧾', url: 'https://service.taipei/' },
      { name: '道路挖掘資訊', icon: '🚧', url: 'https://pwd.gov.taipei/cp.aspx?n=BE5E181E4AB50623' },
      { name: '聯合發包中心（招標）', icon: '📄', url: 'https://ubc.gov.taipei/' },
      { name: '1999 陳情系統', icon: '☎️', url: 'https://1999.gov.taipei/' }
    ],
    news: [
      { date: '2026-11-01', tag: '公告', title: '公告本市115年度「北投6號行義公園整建工程」範圍內有（無）主墳墓遷葬事項', url: 'https://pwd.gov.taipei/News_Content.aspx?n=7DDF43AE70CEED14&sms=78D644F2755ACCAA&s=C14318731D66DA2A' },
      { date: '2026-10-29', tag: '人事徵才', title: '資訊室資訊處理職系管理師職缺徵才公告', url: 'https://pwd.gov.taipei/News_Content.aspx?n=15DB5D0D2F59B520&sms=276202B31BFE11B9&s=C70AAF1231E19203' },
      { date: '2026-10-21', tag: '公告', title: '艋舺公園廣場水舞表演時間', url: 'https://pwd.gov.taipei/News_Content.aspx?n=7DDF43AE70CEED14&sms=78D644F2755ACCAA&s=DEA9E6407F7F89D4' },
      { date: '2026-10-14', tag: '活動', title: '2026生態博覽會將於11/7登場！', url: 'https://pwd.gov.taipei/News_Content.aspx?n=1E8085DB69373A96&sms=9D72E82EC16F3E64&s=D24C784D4B66823C' }
    ]
  },
  {
    id: 'nco',
    shortName: '新建工程處',
    title: '新建工程處',
    tagline: '道路與橋樑的世界',
    badge: '道路・橋樑',
    color: '#e0707e',
    soft: '#ffe0e4',
    pos: [-50, 28],
    subtitle: '掌管全市道路鋪面品質、跨河橋樑新建與耐震補強、人行無障礙改善及共同管道，以微創刨鋪守護市民行的安全與平坦。',
    officialUrl: 'https://nco.gov.taipei/',
    metrics: [
      { ico: 'road', trend: 'up', label: '道路養護面積', value: '2,380', unit: '萬㎡' },
      { ico: 'bridge', trend: 'flat', label: '管養橋樑', value: '351', unit: '座' },
      { ico: 'pipe', trend: 'up', label: '共同管道', value: '142.8', unit: 'km' }
    ],
    services: [
      { name: '路平專案施工預告', icon: '🛣️', url: 'https://nco.gov.taipei/' },
      { name: '人行道無障礙改善', icon: '♿', url: 'https://nco.gov.taipei/' },
      { name: '道路挖掘整合查詢', icon: '⛑️', url: 'https://nco.gov.taipei/' },
      { name: '共同管道介紹', icon: '🔌', url: 'https://nco.gov.taipei/' }
    ],
    news: [
      { date: '2026-10-29', tag: '路平專案', title: '林蔭大道微創刨鋪完工，平坦度指標大幅優化' },
      { date: '2026-10-22', tag: '橋樑安全', title: '跨河橋樑智慧感測器全面連線監測' }
    ]
  },
  {
    id: 'heo',
    shortName: '水利工程處',
    title: '水利工程處',
    tagline: '河濱與防汛的世界',
    badge: '防汛・河濱',
    color: '#4aa8d8',
    soft: '#d9f1ff',
    pos: [52, 28],
    subtitle: '守護臺北盆地防洪安全，操控全市抽水站與疏散門，同時經營河濱公園與水岸自行車道，讓市民親水又安心。',
    officialUrl: 'https://heo.gov.taipei/',
    metrics: [
      { ico: 'drop', trend: 'up', label: '抽水站', value: '89', unit: '座' },
      { ico: 'bike', trend: 'up', label: '河濱自行車道', value: '112', unit: 'km' },
      { ico: 'park', trend: 'flat', label: '河濱公園', value: '29', unit: '座' }
    ],
    services: [
      { name: '河濱場地租借', icon: '🗓️', url: 'https://heo.gov.taipei/' },
      { name: '疏散門啟閉資訊', icon: '🚪', url: 'https://heo.gov.taipei/' },
      { name: '河濱自行車道地圖', icon: '🚲', url: 'https://heo.gov.taipei/' },
      { name: '即時水位資訊', icon: '📈', url: 'https://heo.gov.taipei/' }
    ],
    news: [
      { date: '2026-10-30', tag: '水岸花海', title: '大佳河濱公園花海盛開，結合單車道吸引市民同遊' },
      { date: '2026-10-19', tag: '智慧防汛', title: '抽水站導入水位預測，強降雨應變時間縮短' }
    ]
  },
  {
    id: 'pkl',
    shortName: '公園路燈工程管理處',
    title: '公園路燈工程管理處',
    tagline: '公園、綠樹與路燈的世界',
    badge: '公園・路燈',
    color: '#5cb87a',
    soft: '#dcf5e3',
    pos: [-54, -26],
    subtitle: '打造四季花展與共融公園，撫育隨風搖曳的都市樹木，並以智慧 LED 路燈溫暖守護每一條街道。',
    officialUrl: 'https://pkl.gov.taipei/',
    metrics: [
      { ico: 'park', trend: 'up', label: '都市公園', value: '1,020+', unit: '處' },
      { ico: 'bulb', trend: 'up', label: '智慧路燈', value: '17.6', unit: '萬盞' },
      { ico: 'tree', trend: 'up', label: '行道樹', value: '10.8', unit: '萬株' }
    ],
    services: [
      { name: '花展活動資訊', icon: '🌸', url: 'https://pkl.gov.taipei/' },
      { name: '共融式遊戲場', icon: '🛝', url: 'https://pkl.gov.taipei/' },
      { name: '路燈故障報修', icon: '💡', url: 'https://pkl.gov.taipei/' },
      { name: '行道樹資訊', icon: '🌳', url: 'https://pkl.gov.taipei/' }
    ],
    news: [
      { date: '2026-10-28', tag: '花展', title: '士林官邸菊展接力登場，打造清新賞花環境' },
      { date: '2026-10-15', tag: '共融公園', title: '新一批共融式遊戲場完工啟用' }
    ]
  },
  {
    id: 'sso',
    shortName: '衛生下水道工程處',
    title: '衛生下水道工程處',
    tagline: '地底水循環的世界',
    badge: '污水・再生水',
    color: '#8a7fd8',
    soft: '#e8e4ff',
    pos: [52, -30],
    subtitle: '城市地底的淨化師！建置綿密污水管網與水資源回收中心，由「烏龜工程師」巡檢人孔，推動菸蒂不落水溝，守護河川水質。',
    officialUrl: 'https://sso.gov.taipei/',
    metrics: [
      { ico: 'pipe', trend: 'up', label: '用戶接管率', value: '88.7', unit: '%' },
      { ico: 'drop', trend: 'flat', label: '每日處理污水', value: '72', unit: '萬噸' },
      { ico: 'drop', trend: 'up', label: '再生水供應', value: '4.5', unit: '萬噸/日' }
    ],
    services: [
      { name: '用戶污水接管查詢', icon: '🏠', url: 'https://sso.gov.taipei/' },
      { name: '後巷美化', icon: '🎨', url: 'https://sso.gov.taipei/' },
      { name: '迪化休閒運動公園', icon: '⚽', url: 'https://sso.gov.taipei/' },
      { name: '再生水取用', icon: '♻️', url: 'https://sso.gov.taipei/' }
    ],
    news: [
      { date: '2026-10-27', tag: '水環境', title: '「菸蒂不落水溝」宣導，攔截微塑膠守護河川' },
      { date: '2026-10-14', tag: '後巷美化', title: '老舊社區污水接管結合彩繪，後巷變微藝廊' }
    ]
  },
  {
    id: 'geo',
    shortName: '大地工程處',
    title: '大地工程處',
    tagline: '山坡地與步道的世界',
    badge: '坡地・步道',
    color: '#c9984a',
    soft: '#fbefd6',
    pos: [0, -52],
    subtitle: '與「山神爺爺」一起守護全市山坡地與溪溝安全，串聯臺北大縱走山徑，引領市民親山近自然。',
    officialUrl: 'https://geo.gov.taipei/',
    metrics: [
      { ico: 'mountain', trend: 'flat', label: '臺北大縱走', value: '130', unit: 'km' },
      { ico: 'drop', trend: 'up', label: '溪溝近自然整治', value: '68', unit: '條' },
      { ico: 'chart', trend: 'up', label: '坡地監測站', value: '100', unit: '% 連線' }
    ],
    services: [
      { name: '臺北大縱走', icon: '🥾', url: 'https://geo.gov.taipei/' },
      { name: '山坡地範圍查詢', icon: '⛰️', url: 'https://geo.gov.taipei/' },
      { name: '露營場預約', icon: '🏕️', url: 'https://geo.gov.taipei/' },
      { name: '水土保持申報', icon: '🛡️', url: 'https://geo.gov.taipei/' }
    ],
    news: [
      { date: '2026-10-31', tag: '臺北大縱走', title: '大縱走 8 大路段年度認證活動進行中' },
      { date: '2026-10-20', tag: '坡地保育', title: '導入衛星與微地動感測，全天候掌握坡地安全' }
    ]
  }
];

/* 市民快速搜尋：keywords 用空白分隔，命中後飛到對應世界 */
window.SEARCH_INDEX = [
  { keywords: '河濱 場地 租借 烤肉 單車 自行車 水位 抽水 防汛 疏散門', zone: 'heo', title: '河濱場地租借・自行車道・防汛資訊' },
  { keywords: '路燈 不亮 故障 報修 公園 樹 花展 遊戲場', zone: 'pkl', title: '路燈報修・公園與花展' },
  { keywords: '坑洞 路平 刨鋪 挖掘 橋 人行道 無障礙 共同管道', zone: 'nco', title: '路平專案・道路挖掘・橋樑' },
  { keywords: '污水 接管 下水道 後巷 菸蒂 水溝 再生水 烏龜', zone: 'sso', title: '污水接管・後巷美化・再生水' },
  { keywords: '登山 步道 大縱走 露營 山坡地 水土保持 山神', zone: 'geo', title: '臺北大縱走・山坡地查詢・露營' },
  { keywords: '招標 施政 工務局 1999 陳情', zone: 'hub', title: '工務局・招標・1999 熱線' }
];

/* =====================================================================
 * NPC 角色與對話（第一人稱探索時，走近會打招呼；按 E 或點對話框聽下一句）
 *  ● outfit：服裝樣式 hub(西裝背心)｜road(反光背心＋黃帽)｜water(藍色雨衣)｜park(園藝草帽)｜sewer(深藍工作服)｜geo(卡其巡山員)
 *  ● voice：pitch 音高 0.5–2、rate 語速 0.5–2、prefer 'female'|'male'
 *  ● 每句可加 audio: 'assets/voice/xxx.mp3'（例如 ElevenLabs 生成的檔案），有檔案就播檔案，沒有就用瀏覽器內建台灣國語語音
 * ===================================================================== */
window.NPCS = [
  { id: 'hub-1', zone: 'hub', name: '小工', role: '工務局服務員', outfit: 'hub', voice: { pitch: 1.15, rate: 1.0, prefer: 'female' },
    greet: ['歡迎來到工務局！今天天氣很好，要不要到處走走？', '嗨～第一次來嗎？五個工程處都在環狀道路旁邊喔！'],
    lines: ['工務局統籌道路、水利、公園、下水道跟山坡地，五個工程處一起守護臺北。',
            '市政府前面這條彩虹步道很好拍喔，記得順便看看 101！',
            '有路面坑洞、路燈不亮，都可以打 1999 市民當家熱線。',
            '我們的工程招標資訊都公開在網站上，歡迎廠商多多參與。'] },
  { id: 'nco-1', zone: 'nco', name: '阿鋪', role: '新工處路平工程師', outfit: 'road', voice: { pitch: .9, rate: 1.0, prefer: 'male' },
    greet: ['您好！小心腳步，前面正在刨鋪路面喔！', '辛苦路過啦！我們晚上施工，白天就還給大家平平的路。'],
    lines: ['路平專案用微創刨鋪，施工時間短，對交通影響也比較小。',
            '人行道我們會順便整平、拓寬，推嬰兒車跟輪椅都好走。',
            '那座斜張橋每年都會做安全檢測，感測器全天候監看。',
            '道路挖掘我們有整合平台，管線單位要一起挖，才不會一直挖同一段。'] },
  { id: 'heo-1', zone: 'heo', name: '小汛', role: '水利處防汛工程師', outfit: 'water', voice: { pitch: 1.1, rate: 1.02, prefer: 'female' },
    greet: ['哈囉！河邊的風好舒服，要不要騎一段單車？', '午安～今天水位很穩定，可以放心到河濱玩。'],
    lines: ['大雨的時候，抽水站會把市區的雨水抽到河裡，守護大家不淹水。',
            '疏散門關閉前都會先發通知，記得把車移出河濱停車場喔。',
            '河濱自行車道串起好多公園，假日很適合全家一起騎。',
            '河濱場地可以線上申請租借，辦活動、運動都可以。'] },
  { id: 'pkl-1', zone: 'pkl', name: '花姐', role: '公園處園藝師', outfit: 'park', voice: { pitch: 1.2, rate: .96, prefer: 'female' },
    greet: ['你好呀～這季的花開得正漂亮，慢慢逛！', '嗨！聽，樹上的鳥在唱歌呢。'],
    lines: ['行道樹我們都有建檔照顧，修剪也會避開鳥類築巢的季節。',
            '路燈不亮的話，記下燈桿上的編號，報修會更快喔。',
            '共融式遊戲場讓不同能力的孩子都能一起玩。',
            '公園是大家的客廳，垃圾記得帶走，一起保持乾淨。'] },
  { id: 'sso-1', zone: 'sso', name: '阿淨', role: '衛工處下水道工程師', outfit: 'sewer', voice: { pitch: .95, rate: 1.0, prefer: 'male' },
    greet: ['嘿！別看下面黑黑的，水在這裡會變乾淨喔！', '您好～那隻烏龜是我們的巡檢夥伴，常常探頭打招呼。'],
    lines: ['家裡的污水接進下水道，經過處理後才回到河川，河才會越來越乾淨。',
            '菸蒂千萬不要丟水溝，濾嘴是塑膠，會一路流到河裡跟海裡。',
            '處理過的再生水可以拿來洗街、澆花，省下很多自來水。',
            '老社區接管時，我們也會順便把後巷整理得漂漂亮亮。'] },
  { id: 'geo-1', zone: 'geo', name: '山哥', role: '大地處巡山員', outfit: 'geo', voice: { pitch: .88, rate: .97, prefer: 'male' },
    greet: ['爬山辛苦啦！喝口水再走，山上空氣很棒喔。', '歡迎上山！步道有點陡，慢慢來。'],
    lines: ['臺北大縱走串起好幾座山，分段走、集章，很有成就感。',
            '下大雨後如果看到坡地有裂縫或落石，請馬上通報我們。',
            '山坡地蓋房子、整地都要先申請水土保持，安全第一。',
            '溪溝我們用近自然工法整治，魚和螢火蟲都回來了。'] },
  { id: 'turtle', zone: 'sso', name: '烏龜工程師', role: '下水道巡檢員', outfit: 'turtle', voice: { pitch: 1.5, rate: 1.08, prefer: 'female' },
    greet: ['嗨嗨！我剛巡完下面的管線，一切都很順暢喔！'],
    lines: ['我每天在人孔下面巡檢，看看管子有沒有堵住。', '拜託不要把油倒進水槽，管子會塞住，我會很頭痛的！'] },
  { id: 'god', zone: 'geo', name: '山神爺爺', role: '坡地守護神', outfit: 'god', voice: { pitch: .7, rate: .88, prefer: 'male' },
    greet: ['呵呵呵，年輕人，歡迎來到山上。'],
    lines: ['山要有樹，土才抓得住；大家愛護山林，山也會保護大家。', '下雨天別往溪邊走，看見落石就繞道，平安最重要啊。'] },
  // 101 一樓觀景台兌換處（special: 'ticket' → 對話框出現兌換按鈕；pos/yaw 指定位置）
  { id: 'obs-1', zone: 'hub', name: '小雲', role: '101 觀景台兌換處服務員', outfit: 'obs', special: 'ticket', pos: [24, 1.0], yaw: 0, voice: { pitch: 1.2, rate: 1.02, prefer: 'female' },
    greet: ['歡迎光臨臺北 101！集滿六枚工務章，就能免費兌換 89 樓觀景台門票喔！'],
    ready: '哇，六枚工務章都集滿了！恭喜你～這張觀景台門票請收下，電梯就在後面！',
    notYet: n => `目前蓋了 ${6 - n} 枚，還差 ${n} 枚喔！請先到各工程處走走蓋章再回來。`,
    lines: ['觀景台在 89 樓，電梯每分鐘 1010 公尺，一下子就到了！', '到了頂樓可以按按鈕放煙火，晚上看更漂亮喔！', '從上面看，五大工程處的位置一目了然。'] }
];

/* =====================================================================
 * 「我要辦」常用服務（首頁一鍵直達）
 * ===================================================================== */
window.TASKS = [
  { icon: '💡', title: '路燈不亮報修', zone: 'pkl', url: 'https://pkl.gov.taipei/' },
  { icon: '🕳️', title: '路面坑洞・路平施工', zone: 'nco', url: 'https://nco.gov.taipei/' },
  { icon: '🏞️', title: '河濱場地租借', zone: 'heo', url: 'https://heo.gov.taipei/' },
  { icon: '🚪', title: '疏散門開關資訊', zone: 'heo', url: 'https://heo.gov.taipei/' },
  { icon: '🏠', title: '污水接管查詢', zone: 'sso', url: 'https://sso.gov.taipei/' },
  { icon: '⛰️', title: '山坡地範圍查詢', zone: 'geo', url: 'https://geo.gov.taipei/' },
  { icon: '🥾', title: '臺北大縱走', zone: 'geo', url: 'https://geo.gov.taipei/' },
  { icon: '☎️', title: '1999 市民熱線', zone: 'hub', url: 'https://pwd.gov.taipei/' }
];

/* =====================================================================
 * 節慶／季節版本：日期到了自動切換（月-日；可跨年），沒有對應期間就依月份自動選季節
 *  ● season：spring/summer/autumn/winter　● banner：頂部提示　● lines：追加到 NPC 的台詞
 * ===================================================================== */
window.FESTIVALS = [
  { id: 'flower', from: '02-01', to: '04-15', season: 'spring', banner: '🌸 臺北花季登場！到公園處賞杜鵑、櫻花',
    lines: { 'pkl-1': ['花季到了！大安森林公園的杜鵑花開得正美，歡迎來走走。'] } },
  { id: 'flood', from: '05-01', to: '11-30', banner: '☔ 防汛期間：豪雨時請遠離河濱與溪邊，留意疏散門關閉通知',
    lines: { 'heo-1': ['現在是防汛期，颱風來之前我們會先檢查所有抽水站。'], 'geo-1': ['颱風天請不要上山，等坡地巡查完成再來喔。'], 'god': ['風雨將至，年輕人且在家中安歇，山林自有老夫守護。'] } },
  { id: 'xmas', from: '12-15', to: '01-02', season: 'winter', banner: '🎄 聖誕跨年快樂！市府周邊交通管制請留意公告',
    lines: { 'hub-1': ['跨年活動在市府前，記得搭捷運最方便！'] } }
];
