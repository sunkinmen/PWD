/* =====================================================================
 * pwd-portal.js ── 工務局完整資訊（移植自 https://pwd.gov.taipei/ 首頁所有可見內容）
 *
 *  ● 資料：window.PWD_PORTAL（下方），改文字、加連結只要改這裡
 *  ● 日期一律寫西元 YYYY-MM-DD，畫面會自動同時顯示民國年
 *  ● zone：該項目歸屬的工程處（hub/nco/heo/pkl/sso/geo），決定配色與徽章
 *  ● 開啟：UI.openPortal('分頁 id')，分頁：home / notice / service / about / business / honor / media / integrity / links
 * ===================================================================== */
(function () {
  const P = 'https://pwd.gov.taipei/';
  const NC = (n, sms, s) => `${P}News_Content.aspx?n=${n}&sms=${sms}&s=${s}`;
  const NL = (n, sms) => `${P}News.aspx?n=${n}&sms=${sms}`;
  const CL = n => `${P}Content_List.aspx?n=${n}`;
  const CP = n => `${P}cp.aspx?n=${n}`;
  const ST = c => `https://service.taipei/case-detail/${c}`;

  window.PWD_PORTAL = {
    source: P, synced: '2026-11-01',
    contact: { address: '110204 臺北市信義區市府路1號4樓西南區', phone: '02-2720-8889', hotline: '1999（臺北市民當家熱線，外縣市請撥 02-2720-8889）', fax: '02-2759-6990', hours: '週一至週五 08:30–17:30' },

    /* ---------- 上方工具列 ---------- */
    top: [
      { t: '網站導覽', u: `${P}sitemap.aspx?n=47B2D5A17AFFD005`, i: 'map' }, { t: 'English', u: 'http://english.pwd.gov.taipei/', i: 'ext' },
      { t: '台北通', u: 'https://id.taipei', i: 'person' }, { t: '台北服務通', u: 'https://service.taipei/', i: 'tasks' },
      { t: '常見問答', u: NL('A5517D0D050295AE', '9CAA7B2B865356CB'), i: 'list' }, { t: '雙語詞彙', u: 'https://bilingual.gov.taipei/', i: 'search' },
      { t: '陳情系統 1999', u: 'https://1999.gov.taipei/', i: 'smile' }
    ],

    /* ---------- 首頁輪播：工程亮點（zone 決定配色）---------- */
    highlights: [
      { t: '再現歷史風華！「川端橋」修復再利用完工啟用', z: 'nco', i: 'bridge' }, { t: '中正橋改建工程完工', z: 'nco', i: 'bridge' },
      { t: '中正橋新北永和端夜間照明', z: 'nco', i: 'bulb' }, { t: '「國家生技園區聯外道路」北洞口現況', z: 'nco', i: 'road' },
      { t: '「國家生技園區聯外道路」南洞口現況', z: 'nco', i: 'road' }, { t: '114年度災害搶修暨災防工程開口契約(第3標)－劍南路204巷邊坡搶修完工', z: 'geo', i: 'mountain' },
      { t: '114年度一般道路更新工程開口契約(第6標)－浦城街行人友善區改造', z: 'nco', i: 'road' }, { t: '松隆路人行道拓寬完工', z: 'nco', i: 'road' },
      { t: '和平高中教學大樓新建工程校舍外觀', z: 'nco', i: 'building' }, { t: '南港高中綜合教學大樓建築物外觀', z: 'nco', i: 'building' },
      { t: '陽明教養院永福之家西南向建築透視圖', z: 'nco', i: 'building' }, { t: '成功市場地面層建築透視圖', z: 'nco', i: 'building' },
      { t: '臺北水岸新亮點！民權大橋景觀橋正式啟用', z: 'nco', i: 'bridge', u: NC('6AE9B4DE5F957F40', '72544237BBE4C5F6', 'A9F7CCC251D9DFEF') },
      { t: '大安國中學校外觀', z: 'nco', i: 'building' }, { t: '雙溪濕地', z: 'heo', i: 'drop' }, { t: '磺溪水岸復舊暨景觀營造工程', z: 'heo', i: 'drop' },
      { t: '磺溪', z: 'heo', i: 'drop' }, { t: '明鏡池步徑', z: 'geo', i: 'mountain' }, { t: '紫明溪', z: 'geo', i: 'drop' },
      { t: '牛稠坑溪下游整體環境營造工程', z: 'geo', i: 'drop' }, { t: '臺北市登山步道改善及維護工程', z: 'geo', i: 'mountain' },
      { t: '山坡地遊憩場域及山區道路', z: 'geo', i: 'mountain' }, { t: '軍墓園區水土保持設施工程', z: 'geo', i: 'mountain' },
      { t: '臺北玫瑰展', z: 'pkl', i: 'park' }, { t: '蝶舞派對', z: 'pkl', i: 'park' },
      { t: '日日春、狐尾武竹、金露華高低錯落，營造有節奏感的街道綠意', z: 'pkl', i: 'tree' }, { t: '象徵守護與祝福的大冠鷲地景', z: 'pkl', i: 'park' },
      { t: '匠心獨菊', z: 'pkl', i: 'park' }, { t: '青年公園5號公廁全新完工', z: 'pkl', i: 'building' },
      { t: '觀山河濱公園的基6疏散門', z: 'heo', i: 'drop' }, { t: '景美溪及指南溪匯流口護岸再造工程完工', z: 'heo', i: 'drop' },
      { t: '彩虹河濱輪狀車練習場', z: 'heo', i: 'bike' }, { t: '社子島濕地解說小築', z: 'heo', i: 'tree' }, { t: '松山堤壁美化「松和樂曲」', z: 'heo', i: 'drop' },
      { t: '四分溪支流暨九如綠地環境營造改善工程', z: 'heo', i: 'drop' }, { t: '大佳河濱向日葵花海盛開', z: 'heo', i: 'park' },
      { t: '文山區力行國小活動中心新建工程完工願景圖', z: 'nco', i: 'building' }, { t: '忠孝東路4段地下通廊連通口新建工程竣工', z: 'nco', i: 'building' },
      { t: '瑠公綠廊人行環境改造工程', z: 'nco', i: 'road' }, { t: '中山區錦州街基地公共住宅工程', z: 'nco', i: 'building' },
      { t: '消防局大湖分隊完工後外觀模擬圖', z: 'nco', i: 'building' }, { t: '南港立體連通平臺工程主橋及副橋全景空拍', z: 'nco', i: 'bridge' },
      { t: '消防局興隆分隊新建工程模擬圖', z: 'nco', i: 'building' }, { t: '濱江水資源再生中心示意圖', z: 'sso', i: 'pipe' },
      { t: '迪化休閒運動公園跨堤人行道', z: 'sso', i: 'bridge' }, { t: '民生水資源再生中心暨環境教育館', z: 'sso', i: 'pipe' },
      { t: '瑠公綠廊夜間水波紋燈', z: 'pkl', i: 'bulb' }, { t: '金瑞治水園區', z: 'heo', i: 'drop' }, { t: '大佳河濱公園', z: 'heo', i: 'park' }
    ],
    highlightsMore: `${P}News_Link.aspx?n=877085D1248AAEBA&sms=72BAB1DCD1549678`,

    /* ---------- 新聞發佈 ---------- */
    press: {
      more: NL('5C3C29C78077C93E', '72544237BBE4C5F6'),
      items: [
        { t: '象山步道原址翻新 完工鋪設花崗岩板', z: 'geo', s: '5BCDC9065FB79D96' },
        { t: '臺北市持續推動河濱綠化 提升河岸環境品質', z: 'heo', s: '7461593CC164CDF8' },
        { t: '重現古道風華！2026 淡蘭百年山徑北北基宜會師 淡蘭古道入口意象正式啟動', z: 'geo', s: 'F7FE4000E62F9B28' },
        { t: '木新路抽水站至遊戲場堤外自行車道 11/3–4 因施工封閉', z: 'heo', s: 'E1098831C6E0946D' },
        { t: '雙料肯定 北市水利處「磺港溪再造」連獲台北設計獎、天下城市治理卓越獎', z: 'heo', s: '0859FA21D30BA700' }
      ].map(x => Object.assign(x, { u: NC('5C3C29C78077C93E', '72544237BBE4C5F6', x.s) }))
    },

    /* ---------- 公告資訊（四個分頁）---------- */
    notices: [
      { id: 'latest', t: '最新消息', more: NL('7DDF43AE70CEED14', '78D644F2755ACCAA'), n: '7DDF43AE70CEED14', sms: '78D644F2755ACCAA', items: [
        { d: '2026-11-01', tag: '公告', t: '公告本市115年度「北投6號行義公園整建工程」範圍內有（無）主墳墓遷葬事項', s: 'C14318731D66DA2A' },
        { d: '2026-10-21', tag: '公告', t: '艋舺公園廣場水舞表演時間', s: 'DEA9E6407F7F89D4' },
        { d: '2026-10-21', tag: '公告', t: '2026士林官邸菊展市集攤商錄取結果', s: '1F865B545FEFFEC7' },
        { d: '2026-10-14', tag: '法規公告', t: '優良下水道用戶排水設備承裝商審查辦法', s: 'D846E2F56AE2EDD9' },
        { d: '2026-10-01', tag: '公告', t: '「臺北市內湖區0625暴雨泡水車輛慰助申請」已於115年9月30日17時30分停止受理，台北服務通同時下架', s: '3C363E36BF7479A6' }] },
      { id: 'event', t: '活動訊息', more: NL('1E8085DB69373A96', '9D72E82EC16F3E64'), n: '1E8085DB69373A96', sms: '9D72E82EC16F3E64', items: [
        { d: '2026-10-14', tag: '活動進行中', live: true, t: '2026生態博覽會將於11/7登場！', s: 'D24C784D4B66823C' },
        { d: '2026-08-24', tag: '活動已結束', t: '內湖休閒運動公園 8月限定免費環教活動，解鎖都市淨水密碼', s: '119E9973E9772609' },
        { d: '2026-07-21', tag: '活動已結束', t: '民生水資源再生廠環境教育館啟用 首批參訪團驚呼大開眼界', s: '7F17B50AD9FBA502' },
        { d: '2026-07-21', tag: '活動已結束', t: '內湖運動公園全新戲水區盛大開放 隱形設施華麗轉身，構築城市共榮新價值', s: 'C1273942BABC689E' },
        { d: '2026-02-15', tag: '活動已結束', t: '迪化運動公園花祭登場 富士櫻接力綻放中！', s: 'B6B1ABA1B191E17E' }] },
      { id: 'promo', t: '協助宣導', more: NL('6CA358D79BAF9229', 'A3C6046864BEEE2D'), n: '6CA358D79BAF9229', sms: 'A3C6046864BEEE2D', items: [
        { d: '2026-10-28', tag: '影片', t: '《讓城市，自在呼吸》中英字幕版', u: 'https://youtu.be/D_uVR8hB1LQ', yt: 'D_uVR8hB1LQ' },
        { d: '2026-10-28', tag: '影片', t: '《你的臺北，聞起來是什麼味道》中英字幕版', u: 'https://youtu.be/__8sR1hbkZA', yt: '__8sR1hbkZA' },
        { d: '2026-10-14', tag: '考選部', t: '116年公務人員初等考試報名訊息', s: '2FA483B30FD594B4' },
        { d: '2026-10-14', tag: '宣導', t: '臺北市政府警察局打詐臺北隊 115年10月反詐宣導', s: 'E07A3F454A3F1868' },
        { d: '2026-10-07', tag: '宣導', t: '115年「國軍守護．榮耀同行」敬軍活動宣傳影片', s: '08CE6199DECB9704' }] },
      { id: 'jobs', t: '人事徵才', more: NL('15DB5D0D2F59B520', '276202B31BFE11B9'), n: '15DB5D0D2F59B520', sms: '276202B31BFE11B9', items: [
        { d: '2026-10-29', tag: '徵才', t: '資訊室資訊處理職系管理師職缺徵才公告', s: 'C70AAF1231E19203' },
        { d: '2026-10-29', tag: '徵才', t: '公開甄選聘用幫工程司1名（道管中心職務代理）', s: 'CD89CA4C5A7A032B' },
        { d: '2026-10-05', tag: '錄取', t: '秘書室綜合行政職系股長錄取名單', s: 'EBA63C0538458E17' },
        { d: '2026-06-01', tag: '徵才', t: '品管及職安科土木工程職系工程員職缺徵才公告', s: '937A26380F673CCC' },
        { d: '2026-03-26', tag: '徵才', t: '公園大地科綜合行政職系書記職缺徵才公告', s: '8B3E52BC9D5B6915' }] }
    ],

    /* ---------- 市民服務（10 類線上申辦，連到台北服務通）---------- */
    services: [
      { t: '道路維護', z: 'nco', i: 'road', more: CL('825DAD6B3FC95883'), items: [['管線申挖證明', 'AG004'], ['建築物施工損壞道路等附屬公共設施複勘申請', 'CI001'], ['道路挖掘許可（不含堤內水防道路）', 'AG003'], ['使用道路集會申請', 'CI008'], ['道路土地捐贈', 'CI009'], ['橋梁隧道附設纜線申請', 'CI002'], ['公共工程拆除合法建築物賸餘部分就地整建申請', 'CI010'], ['市區道路架空管線設置許可', 'AG005']] },
      { t: '人行道及天橋', z: 'nco', i: 'walk', more: CL('963DCF3691375AD2'), items: [['人行道設置斜坡道申請', 'CI003'], ['人行道無償認養', 'CI006'], ['人行道設置露天座申請', 'CI007'], ['人行道設置斜坡道展延申請', 'CI004'], ['人行道設置斜坡道竣工查驗申請', 'CI005']] },
      { t: '雨水下水道', z: 'heo', i: 'drop', more: CL('7427681A26DA85B9'), items: [['市區排水審查', 'CK005'], ['市區雨水下水道管線資料申請', 'CK007'], ['有線纜線申請暫掛雨水下水道', 'CK006'], ['河防建造物附掛纜線作業', 'CK003'], ['市區排水案件完工查驗', 'CK010']] },
      { t: '污水下水道', z: 'sso', i: 'pipe', more: CL('567774176F524CD9'), items: [['建築物既有化糞池廢除或改設為污水坑補助申請', 'CN014'], ['污水下水道投肥證核發', 'CN010'], ['污水管渠現場會勘案件申請', 'CN009'], ['污水管渠套繪圖案件申請', 'CN008'], ['用戶排水設備設置竣工備查', 'CN007'], ['用戶排水設備設置竣工查驗', 'CN006'], ['用戶排水設備設置核轉免配合統一申挖證明', 'CN005'], ['用戶排水設備設置施工核轉挖掘道路證明', 'CN004'], ['用戶排水設備設置變更設計審查', 'CN003'], ['既有房屋申請用戶排水設備設置設計審查', 'CN002'], ['新建房屋申請用戶排水設備設置設計審查', 'CN001'], ['參觀污水處理廠', 'CN011'], ['化糞池廢除或改設污水坑補助資格鑑定', 'CN012'], ['化糞池廢除或改設污水坑補助竣工審查', 'CN015'], ['例假日及國定假日進場投肥', 'CN013']] },
      { t: '公園場地及行道樹', z: 'pkl', i: 'tree', more: CL('C6B4458DD65A31D0'), items: [['行道樹懸掛燈飾申請', 'CL006'], ['公園及行道樹認養申請', 'CL005'], ['申請分期攤繳5年無權占用使用補償金', 'CL008'], ['公園處場地使用（一般性活動）', 'CL002'], ['公園處場地使用（營利性活動）', 'CL003'], ['行道樹移植申請', 'CL004'], ['永樂廣場場地申請', 'CL010']] },
      { t: '路燈遷移及裝設', z: 'pkl', i: 'bulb', items: [['路燈桿遷移', 'CL007'], ['裝設路燈', 'CL001']] },
      { t: '河濱公園', z: 'heo', i: 'bike', more: CL('C7FE5B3F14001810'), items: [['河濱公園街頭藝人展演場地使用登記', 'CK004'], ['河濱公園場地使用申請（營利性及非營利性活動）', 'CK002'], ['河川（排水設施範圍）公私地一般使用申請', 'CK008'], ['轄管河川區域認養', 'CK001'], ['河濱公園車輛臨時通行證申請', 'CK009']] },
      { t: '科研及再生水', z: 'sso', i: 'chart', items: [['再生水經營業籌設許可審查', 'AG001'], ['工務建設科學研究創新計畫補助', 'AG002']] },
      { t: '水土保持', z: 'geo', i: 'mountain', more: CL('A2B790182A9D012C'), items: [['水土保持計畫申請（含變更設計）', 'CP001'], ['簡易水土保持申報書申請（含變更設計）', 'CP002'], ['水土保持施工許可證申請（申報開工）', 'CP003'], ['簡易水土保持申報書申報開工', 'CP004'], ['水土保持計畫完工申請', 'CP005'], ['簡易水土保持申報書完工申請', 'CP006'], ['貴子坑水土保持教學園區解說申請', 'CP007'], ['私有林採伐', 'CP009'], ['非保安林範圍之查察', 'CP010'], ['水土保持計畫及簡易申報書展延工期', 'CP011'], ['山坡地水土保持諮詢服務', 'CP012']] },
      { t: '露營場地', z: 'geo', i: 'park', items: [['北投貴子坑露營場及內湖碧山露營場申請使用', 'CP015'], ['大地工程處轄管場地租借', 'CP013'], ['大地工程處所轄場域影視拍攝申請', 'CP014']] }
    ].map(c => Object.assign(c, { items: c.items.map(([t, code]) => ({ t, u: ST(code), code })) })),
    servicesMore: CL('C9049AA756058F1A'),

    /* ---------- 機關介紹 ---------- */
    about: [
      ['首長介紹', NL('F5E3CC292A7E9FA7', '7CAF6BD4D3E48630')], ['副首長簡介', NL('B1FF4F6119F8A5B8', '7CAF6BD4D3E48630')], ['認識工務局', CP('D5949764E8E2126B')],
      ['組織架構', CP('2E68443353FB1EB0')], ['業務職掌', NL('4BD34EA290F36A51', '3A536686879521D3')], ['分層負責明細表', NL('B738B1C03B0E12ED', 'A3B121595D04D8FE')],
      ['機關工作報告', NL('602CF2D48E9E337E', '346B14D66187A9C9')], ['聯絡資訊', NL('6547330FAEB8433C', '1AF8D4799C869656')], ['歷史沿革', CP('69853E60FC257511')],
      ['歷任首長', CP('AE82951E77C14555')], ['大事紀', NL('259E2C406F668E32', '085A64D2DB4B0CC1')]
    ],
    offices: [
      { z: 'nco', t: '新建工程處', a: '臺北市信義區市府路1號南區4、5、6樓', p: '(02)2720-8889', u: 'https://nco.gov.taipei/' },
      { z: 'heo', t: '水利工程處', a: '臺北市信義區市府路1號南區6、7、8樓', p: '(02)2720-8889', u: 'https://heo.gov.taipei/' },
      { z: 'pkl', t: '公園路燈工程管理處', a: '臺北市中正區懷寧街109號', p: '(02)2381-5132', u: 'https://pkl.gov.taipei/' },
      { z: 'sso', t: '衛生下水道工程處', a: '臺北市松山區塔悠路328號', p: '(02)2597-3185', u: 'https://sso.gov.taipei/' },
      { z: 'geo', t: '大地工程處', a: '臺北市信義區松德路300號3樓', p: '(02)2759-3001', u: 'https://geo.gov.taipei/' }
    ],
    units: [   // 局本部科室分機（經 1999，外縣市 02-2720-8889 轉接）
      ['土木建築科', '市府路1號4樓東南區', '綜合規劃 6721・交通道路橋隧 6789・公共建築 6791'],
      ['水利科', '市府路1號4樓東南區', '河川工程／管理、雨水下水道 6797・衛生下水道 6753'],
      ['公園大地科', '市府路1號4樓東南區', '公園 6760・補償 6755・大地 6756'],
      ['採購管理科', '市府路1號3樓南區', '1052'],
      ['品管及職安科', '建國南路1段63-1號', '查核 (02)2781-7969 #121・試驗 #128'],
      ['聯合採購發包中心', '市府路1號3樓南區', '工程 1115・財物勞務 1400'],
      ['道路挖掘管理中心', '中正區和平西路一段59號', '(02)8978-8900 綜合 #8227・架空線 #8217・道路挖掘 #8240'],
      ['工程管理工務所', '市府路1號3樓南區', '1446、1447・傳真 (02)2758-3187'],
      ['資訊室', '市府路1號10樓西南區', '6815'], ['秘書室', '市府路1號4樓東南區', '研考 6776・文書 6770・總務 6787・出納 6780'],
      ['會計室', '市府路1號4樓西南區', '6716'], ['統計室', '市府路1號10樓西南區', '6720'], ['人事室', '市府路1號4樓西南區', '6804'],
      ['政風室', '市府路1號4樓西南區', '6813、6814・傳真 (02)2759-5773']
    ],

    /* ---------- 業務資訊 ---------- */
    business: [
      ['局務會議紀錄', NL('F4D5E390A83DF060', '259070741E10F72A')], ['工務建設', CL('3E75B3A4C672D316')], ['統計資訊', CL('7DEDF2D8ED0114F3')],
      ['預決算', CL('B75A076B2A8FA67F')], ['會計月報', CL('02F1593DDD824C7E')], ['政策及業務宣導專區', CL('FD49481D5EFF37B4')],
      ['機關內部規範專區', NL('D75A5B1EE17F492A', 'AED2800A45396385')], ['個人資料保護專區', NL('FA3FF718BE73754C', 'DB38A68F252B781E')],
      ['品質管理', NL('AD78A6929A61283B', '8161CC3100CB6EB8')], ['檔案應用', CL('28B201A15400E840')],
      ['機關採購案件一覽表', NL('A5E19A825BC0F6D7', '9E893D1261DC83E3')], ['機關辦理工程應申辦事項', CL('C326FCC8544D820C')],
      ['歲出預算案新興繼續性計畫說明書', NL('23FE344AEA426836', '0C1FE52D30BC3091')], ['施政計畫', NL('D4B417C23621F671', '2B5A7D248A30D8A6')],
      ['施政計畫績效報告', NL('B942C23864F9E1DF', '7A6FBAC19CD5B8A9')], ['公共設施維護管理情形', NL('3A71DC38742794C2', 'F722D713E21A3CC9')],
      ['臺北市政府公共工程督導會報', NL('8BA22E976FE60EBD', '6897BA40F885FBE2')], ['府級任務編組公開透明作業原則', NL('BEFF18544011D036', '2E3EE2790113BC8A')],
      ['歷史成果', CL('AEB5BD7E55017C25')], ['政府資訊公開', CP('739106B633434079')],
      ['道路挖掘資訊', CP('BE5E181E4AB50623')], ['聯合發包中心', 'https://ubc.gov.taipei/'],
      ['獎勵補助：工務建設科學研究創新計劃補助要點', NL('35A32F9E70E37094', 'D3798E7CBD051224')], ['獎勵補助：種植景觀作物獎勵要點', NL('C7BF98EAB1A4EE22', '0CC079409AD49067')]
    ],

    /* ---------- 優良事蹟（截至 115 年 9 月底，局 4 樓展示牆）---------- */
    honors: { asOf: '截至115年9月底', items: [
      { t: '國際獎項', n: 42, u: NC('3F87D9E9A0FC0699', 'D3D4384CBC667357', 'C062A15C7505C6B1'), c: '#e0a526' },
      { t: '中央獎項', n: 184, u: NC('8CF6039048C2FDEF', 'D3D4384CBC667357', 'FA54953A6C1C344A'), c: '#d9667a' },
      { t: '臺北市政府獎項', n: 277, u: NC('43A2FD87F6D03046', 'D3D4384CBC667357', '0B83F8E5841DCC2F'), c: '#4a7fd4' },
      { t: '學會協會獎項', n: 246, u: NC('83056A1BA0DE4939', 'D3D4384CBC667357', 'D9F0EADBF006645A'), c: '#3fae6a' },
      { t: '其他獎項', n: 21, u: NC('AA0C13A29C447783', 'D3D4384CBC667357', '1CD5D53980D524EF'), c: '#8a6fd1' }], more: CL('E403F02445C55835') },

    /* ---------- 影音專區＋專欄 ---------- */
    media: [['主題影音', NL('8324459693934401', 'E0BA5EBA89E27E9B')], ['工務局工作成果', NL('641228E73D252F54', 'A5E9CB613FB8107D')]],
    columns: { more: NL('CA1A400257B97384', '122B365AA0766534'), items: [
      { d: '2018-06-30', z: 'nco', t: '路平安臺北好：路平橋安－臺北好行', s: '11382EE170E41448' },
      { d: '2018-06-13', z: 'heo', t: '治川渠活水岸', s: '5EBD233E523C9DE7' },
      { d: '2018-06-13', z: 'pkl', t: '路燈亮公園美：公園與行道樹打造綠美化生活', s: 'EF8257B98D14ACD1' },
      { d: '2018-06-13', z: 'sso', t: '清污水淨河川', s: 'BACD66852ABB3E97' },
      { d: '2018-06-01', z: 'geo', t: '保山林護坡地', s: 'ED658DF8BCC59255' }].map(x => Object.assign(x, { u: NC('CA1A400257B97384', '122B365AA0766534', x.s) })) },

    /* ---------- 廉政園地／性別平等／便民服務 ---------- */
    integrity: [
      ['廉政平臺專區', CP('851E851FA7755A78')], ['遊說法專區', CL('73346EAEEEB7B492')], ['安全、機密宣導', NL('70842BB411BD3C13', '88666E8A687D49C2')],
      ['廉政宣導', NL('B17920AEAFD051E3', 'ACD6A04337ADB2FB')], ['檢舉管道', CL('A30F6D1B0627839A')], ['勞務承攬派駐勞工申訴機制專區', NL('7255D050F73C0BA0', '95C6BA6D25ABF49D')],
      ['公職人員利益衝突迴避專區', CL('5A0CCB6920193CAB')], ['透明晶質獎專區', CP('420DEB362CC84B44')]
    ],
    gender: [['性別主流化', CL('789781BA76349B18')], ['性騷擾防治', NL('6BB7FD1E1A4EAF2D', '27D3858DBE0619B7')]],
    convenience: [
      ['標誌下載', CP('277F01857B0E1A4D')], ['陳情系統', 'https://1999.gov.taipei/'], ['熱門電話', NL('149422F40694862B', '6A12E356DE7A1B19')],
      ['常見問答', NL('A5517D0D050295AE', '87415A8B9CE81B16')], ['115年度提升服務品質執行計畫（ODT）', CL('87FD2CED4899F5BC')], ['工程專家諮詢服務團', CP('66FE829905B2C5E6')]
    ],

    /* ---------- 快速連結／市府宣導／頁尾 ---------- */
    quick: [
      ['工務話台北（Facebook）', 'https://www.facebook.com/TaipeiPublicWork'], ['臺北市政府採購業務資訊網', 'https://gpis.taipei/RWD/'],
      ['工程技術資訊服務平台', 'https://eisop.gov.taipei/'], ['臺北市水綠地圖', 'https://pwdgis.taipei/wg/'],
      ['私有建築設置防水閘門建議廠商名冊', NC('D6FBFC09A0622E55', '78D644F2755ACCAA', 'CE3992F5796356F5').replace(P, 'https://heo.gov.taipei/')], ['防災臺北', 'https://eoc.gov.taipei/']
    ],
    quickMore: `${P}News_Link.aspx?n=9422EB2029B91CEA&sms=B4A547B5AC62ED8F`,
    city: [
      ['165打詐儀表板', 'https://165dashboard.tw/'], ['CRPD 身心障礙者權利公約資訊網', 'https://crpd.sfaa.gov.tw/'], ['臺北市志工管理整合平台', 'https://newcv101.gov.taipei/'],
      ['臺北惜物網', 'https://shwoo.gov.taipei/shwoo/newhome/newhome00/index'], ['機關檔案目錄查詢網', 'https://near.archives.gov.tw/home'], ['臺北智慧城市', 'https://smartcity.taipei/']
    ],
    footer: [
      ['政府網站資料開放宣告', `${P}ct.asp?xItem=111462750&ctNode=23024&mp=106001`], ['隱私權及資訊安全政策', `${P}ct.asp?xItem=987452&ctNode=23024&mp=106001`],
      ['聯絡方式', `${P}ct.asp?xItem=987438&CtNode=23032&mp=106001`], ['本局暨所屬各處聯絡電話', NC('6547330FAEB8433C', '1AF8D4799C869656', 'E992220470EE45FE')]
    ]
  };
  // 公告項目補完整網址
  PWD_PORTAL.notices.forEach(g => g.items.forEach(x => { if (!x.u) x.u = NC(g.n, g.sms, x.s); }));

  /* =====================================================================
   * 畫面
   * ===================================================================== */
  const D = window.PWD_PORTAL, $ = s => document.querySelector(s);
  const ico = n => window.ICONS ? ICONS.svg(n) : '';
  const zc = z => ((window.ZONES || []).find(x => x.id === z) || { color: '#4a7fd4', soft: '#dbe8ff' });
  const em = z => (window.EMBLEMS || {})[z] || '';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const roc = d => { if (!d) return ''; const [y, m, dd] = d.split('-'); return `${y - 1911}.${m}.${dd}`; };
  const A = (u, inner, cls = '') => `<a class="${cls}" href="${u}" target="_blank" rel="noopener">${inner}</a>`;
  const linkGrid = (arr, icon = 'ext') => `<div class="pp-links">${arr.map(([t, u]) => A(u, `${ico(icon)}<span>${esc(t)}</span>`)).join('')}</div>`;
  const more = (u, label = '看更多') => A(u, `${label} ${ico('ext')}`, 'pp-more');
  const TAGCOLOR = { 公告: '#4a7fd4', 法規公告: '#7a5cd6', 活動進行中: '#e8833a', 活動已結束: '#9aa3bb', 影片: '#d9667a', 考選部: '#1f9b8f', 宣導: '#3fae6a', 徵才: '#d6a12a', 錄取: '#3fae6a' };

  const TABS = [
    ['home', '總覽', 'building'], ['notice', '公告資訊', 'list'], ['service', '市民服務', 'tasks'], ['about', '機關介紹', 'person'],
    ['business', '業務資訊', 'chart'], ['honor', '優良事蹟', 'stamp'], ['media', '影音・專欄', 'play'], ['integrity', '廉政・便民', 'smile'], ['links', '快速連結', 'share']
  ];

  function noticeList(items, max) {
    return `<ul class="pp-news">${items.slice(0, max || 99).map(x => `<li>${A(x.u, `<time><b>${x.d.slice(5).replace('-', '/')}</b><small>${roc(x.d)}</small></time>
      <span class="pp-n-body"><em style="--tc:${TAGCOLOR[x.tag] || '#4a7fd4'}" class="${x.live ? 'live' : ''}">${esc(x.tag)}</em>${esc(x.t)}</span>${ico('ext')}`)}</li>`).join('')}</ul>`;
  }
  const R = {
    home() {
      const latest = D.notices[0].items[0], hi = D.highlights;
      return `<div class="pp-hero">
          <div class="pp-hero-txt"><small>TAIPEI CITY PUBLIC WORKS DEPARTMENT</small><h2>臺北市政府工務局</h2>
          <p>統籌道路橋樑、防洪治水、公園綠地、污水處理與坡地保育，五大工程處一起守護臺北。</p>
          <div class="pp-chips">${D.top.map(x => A(x.u, `${ico(x.i)}${esc(x.t)}`, 'pp-chip')).join('')}</div></div>
          <div class="pp-alert">${A(latest.u, `<em>最新公告</em><span>${esc(latest.t)}</span>`)}</div>
        </div>
        <h4>${ico('eye')} 工程亮點 <small>${hi.length} 項</small></h4>
        <div class="pp-gallery">${hi.map(x => { const z = zc(x.z), inner = `<span class="pp-g-ico">${ico(x.i)}</span><span class="pp-g-em">${em(x.z)}</span><b>${esc(x.t)}</b>`;
          return x.u ? A(x.u, inner, 'pp-g').replace('class="pp-g"', `class="pp-g" style="--c:${z.color};--s:${z.soft}"`) : `<div class="pp-g" style="--c:${z.color};--s:${z.soft}">${inner}</div>`; }).join('')}</div>
        ${more(D.highlightsMore, '更多工程照片')}
        <div class="pp-2col">
          <section><h4>${ico('chart')} 新聞發佈</h4><ul class="pp-press">${D.press.items.map(x => `<li style="--c:${zc(x.z).color}">${A(x.u, `<span class="pp-dot"></span>${esc(x.t)}`)}</li>`).join('')}</ul>${more(D.press.more)}</section>
          <section><h4>${ico('list')} 最新消息</h4>${noticeList(D.notices[0].items, 4)}<button class="pp-more" onclick="UI.openPortal('notice')">全部公告 ›</button></section>
        </div>
        <h4>${ico('stamp')} 優良事蹟</h4>${honorBlock(true)}
        <h4>${ico('tasks')} 熱門線上申辦</h4>
        <div class="pp-svc-mini">${D.services.map((c, i) => `<button style="--c:${zc(c.z).color};--s:${zc(c.z).soft}" onclick="UI.openPortal('service',${i})">${ico(c.i)}<b>${esc(c.t)}</b><small>${c.items.length} 項</small></button>`).join('')}</div>`;
    },
    notice(sub) {
      const g = D.notices.find(x => x.id === sub) || D.notices[0];
      return `<div class="pp-subtabs" role="tablist">${D.notices.map(x => `<button role="tab" aria-selected="${x === g}" class="${x === g ? 'on' : ''}" onclick="UI.openPortal('notice','${x.id}')">${esc(x.t)}</button>`).join('')}
          ${A(D.press.more, '新聞發佈 ' + ico('ext'), 'pp-subtab-link')}</div>
        ${g.id === 'promo' ? `<div class="pp-videos">${g.items.filter(x => x.yt).map(x => A(x.u, `<img loading="lazy" src="https://i.ytimg.com/vi/${x.yt}/mqdefault.jpg" alt="" onerror="this.style.visibility='hidden'"><span>${ico('play')}</span><b>${esc(x.t)}</b>`, 'pp-video')).join('')}</div>` : ''}
        ${noticeList(g.items)}${more(g.more, `更多${g.t}`)}`;
    },
    service(open) {
      const o = typeof open === 'number' ? open : -1;
      return `<div class="pp-search">${ico('search')}<input id="pp-q" placeholder="搜尋申辦項目，例如：投肥、斜坡道、露營、路燈" oninput="UI.portalFilter(this.value)" aria-label="搜尋申辦項目"></div>
        <p class="pp-note">以下項目皆可在「台北服務通」線上申辦（需台北通登入）。</p>
        <div class="pp-svc">${D.services.map((c, i) => { const z = zc(c.z);
          return `<details ${i === o ? 'open' : ''} style="--c:${z.color};--s:${z.soft}" data-i="${i}"><summary><span class="pp-svc-ico">${ico(c.i)}</span><b>${esc(c.t)}</b><span class="pp-svc-em">${em(c.z)}</span><small>${c.items.length} 項</small></summary>
            <div class="pp-svc-list">${c.items.map(x => A(x.u, `<span>${esc(x.t)}</span><code>${x.code}</code>${ico('ext')}`)).join('')}${c.more ? more(c.more, `${c.t}說明`) : ''}</div></details>`; }).join('')}</div>
        ${more(D.servicesMore, '更多服務資訊')}`;
    },
    about() {
      const c = D.contact;
      return `<div class="pp-contact">
          <div>${ico('building')}<small>地址</small><b>${c.address}</b></div><div>${ico('smile')}<small>總機</small><b><a href="tel:0227208889">${c.phone}</a></b></div>
          <div>${ico('soundOn')}<small>市民熱線</small><b><a href="tel:1999">1999</a></b></div><div>${ico('sun')}<small>服務時間</small><b>${c.hours}</b></div>
          <div>${ico('list')}<small>傳真</small><b>${c.fax}</b></div></div>
        <h4>${ico('person')} 認識工務局</h4>${linkGrid(D.about, 'ext')}
        <h4>${ico('map')} 所屬五大工程處</h4>
        <div class="pp-offices">${D.offices.map(o => { const z = zc(o.z); return `<div class="pp-office" style="--c:${z.color};--s:${z.soft}">${em(o.z)}<div><b>${o.t}</b><small>${o.a}</small>
          <span><a href="tel:${o.p.replace(/\D/g, '')}">${o.p}</a> ・ ${A(o.u, '官網 ' + ico('ext'))} ・ <button onclick="UI.closePortal();UI.goSearch('${o.z}')">在 3D 中前往</button></span></div></div>`; }).join('')}</div>
        <h4>${ico('tasks')} 局本部科室分機 <small>撥 1999（外縣市 02-2720-8889）轉接</small></h4>
        <div class="pp-table" role="table">${D.units.map(([n, a, e]) => `<div role="row"><b role="cell">${n}</b><span role="cell">${e}</span><small role="cell">${a}</small></div>`).join('')}</div>`;
    },
    business() { return `<p class="pp-note">施政、預算、統計、採購與工程管理等公開資訊。</p>${linkGrid(D.business, 'chart')}`; },
    honor() { return honorBlock(false) + more(D.honors.more, '優良事蹟專區'); },
    media() {
      const v = D.notices.find(x => x.id === 'promo').items.filter(x => x.yt);
      return `<h4>${ico('play')} 影音專區</h4><div class="pp-videos">${v.map(x => A(x.u, `<img loading="lazy" src="https://i.ytimg.com/vi/${x.yt}/mqdefault.jpg" alt="" onerror="this.style.visibility='hidden'"><span>${ico('play')}</span><b>${esc(x.t)}</b>`, 'pp-video')).join('')}</div>
        ${linkGrid(D.media, 'play')}
        <h4>${ico('list')} 工務專欄</h4>
        <div class="pp-columns">${D.columns.items.map(x => { const z = zc(x.z); return A(x.u, `<span class="pp-col-em">${em(x.z)}</span><b>${esc(x.t)}</b><small>${x.d}（${roc(x.d)}）</small>`, 'pp-col').replace('class="pp-col"', `class="pp-col" style="--c:${z.color};--s:${z.soft}"`); }).join('')}</div>${more(D.columns.more, '更多專欄')}`;
    },
    integrity() { return `<h4>${ico('eye')} 廉政園地</h4>${linkGrid(D.integrity, 'eye')}<h4>${ico('person')} 性別平等</h4>${linkGrid(D.gender, 'person')}<h4>${ico('smile')} 便民服務</h4>${linkGrid(D.convenience, 'smile')}`; },
    links() { return `<h4>${ico('share')} 快速連結</h4>${linkGrid(D.quick, 'ext')}${more(D.quickMore, '更多快速連結')}<h4>${ico('building')} 市府宣導</h4>${linkGrid(D.city, 'ext')}<h4>${ico('list')} 網站資訊</h4>${linkGrid(D.footer, 'list')}`; }
  };
  function honorBlock(compact) {
    const H = D.honors.items, tot = H.reduce((a, b) => a + b.n, 0), mx = Math.max(...H.map(h => h.n));
    return `<div class="pp-honor ${compact ? 'compact' : ''}"><div class="pp-honor-total"><b data-count="${tot}">${tot}</b><small>座獎項・${D.honors.asOf}</small></div>
      <div class="pp-honor-bars">${H.map(h => A(h.u, `<span class="pp-hb-l">${h.t}</span><span class="pp-hb"><i style="width:${h.n / mx * 100}%;background:${h.c}"></i></span><b>${h.n}</b>`, 'pp-hrow')).join('')}</div></div>`;
  }

  let cur = 'home';
  function open(tab, arg) {
    const m = $('#portal'); cur = TABS.some(t => t[0] === tab) ? tab : 'home';
    $('#portal-tabs').innerHTML = TABS.map(([id, t, i]) => `<button role="tab" aria-selected="${id === cur}" class="${id === cur ? 'on' : ''}" onclick="UI.openPortal('${id}')">${ico(i)}<span>${t}</span></button>`).join('');
    const body = $('#portal-body'); body.innerHTML = R[cur](arg); body.scrollTop = 0;
    $('#portal-foot').innerHTML = `${D.contact.address}｜總機 ${D.contact.phone}｜${D.contact.hours}<br>內容同步自 ${A(D.source, 'pwd.gov.taipei')}（${D.synced}）`;
    if (m.hidden) { m.hidden = false; setTimeout(() => { const f = m.querySelector('.portal-tabs .on'); f && f.focus(); }, 40); }
    const on = $('#portal-tabs .on'); on && on.scrollIntoView({ inline: 'center', block: 'nearest' });
    if (cur === 'honor' || cur === 'home') countUp();
    if (typeof arg === 'number') setTimeout(() => { const d = body.querySelector(`details[data-i="${arg}"]`); d && d.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60);
    window.Extras && Extras.track('portal_open', { tab: cur });
  }
  function countUp() {
    const el = document.querySelector('#portal [data-count]'); if (!el || document.body.classList.contains('reduce-motion')) return;
    const n = +el.dataset.count, t0 = performance.now();
    (function f(t) { const k = Math.min(1, (t - t0) / 900); el.textContent = Math.round(n * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); })(t0);
  }
  function filter(q) {
    q = q.trim().toLowerCase();
    document.querySelectorAll('#portal .pp-svc details').forEach(d => {
      let hit = 0; d.querySelectorAll('.pp-svc-list a').forEach(a => { const ok = !q || a.textContent.toLowerCase().includes(q) || d.querySelector('summary b').textContent.includes(q); a.hidden = !ok && !a.classList.contains('pp-more'); if (ok) hit++; });
      d.hidden = q && !hit; if (q && hit) d.open = true;
    });
  }
  function close() { $('#portal').hidden = true; }
  window.Portal = { open, close, filter, data: D };

  // 讓全站搜尋也找得到每一項線上申辦
  if (window.SEARCH_INDEX) D.services.forEach((c, i) => c.items.forEach(x => SEARCH_INDEX.push({ keywords: c.t + ' ' + x.t, zone: c.z, title: x.t, portal: ['service', i] })));
})();
