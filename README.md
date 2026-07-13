# MindGarden

每日幾分鐘,陪自己一陣。Offline-first PWA,粵語 AI 陪伴回應。

## 快速部署(唔使本地 toolchain)

1. **上載去 GitHub**
   - 開一個新 repo(private 都得)
   - 將呢個 folder 全部內容 push 上去(唔使包括 `node_modules` / `dist`)

2. **連接 Cloudflare Pages**
   - Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git
   - 揀個 repo,framework preset 揀 **Vite**
   - Build command: `npm run build`,output directory: `dist`

3. **AI 唔使另外設定**
   - AI 用嘅係 Cloudflare Workers AI(`wrangler.jsonc` 入面嘅 `ai` binding),
     同一個 Cloudflare 帳戶自動生效,唔使另外攞 API key
   - 之所以唔用 Gemini/Claude 直連:兩者官方 API 都未開放俾香港地區,
     Workers AI 行喺 Cloudflare 自己平台入面,冇呢個地區限制

4. **iPhone 安裝**
   - Safari 開你嘅 `xxx.pages.dev` → 分享 → 加至主畫面

之後每次 push 到 main 就自動 deploy;push 到其他 branch 會有獨立 preview URL。

## v0.2.2 — 調校 Notice(覺察)

Notice 而家真係做到「留意」而唔係「數數」:
- facts 計算層加入「情緒關聯」——某主題出現時,情緒同你平時基線比較(唔係「你講工作帶負面」,而係「你講工作嗰陣,情緒仲低過你平時」),呢個先係洞察。
- facts 按洞察價值排序:突然唔再提 > 突然多咗諗 > 情緒關聯 > 最常提 > 小確幸節奏 > 季節。model 優先揀對方自己冇為意嗰啲。
- Notice 改用專屬精簡系統提示(composeNoticeSystem),唔再背對話用嘅 INTENT/CRAFT layer —— 嗰啲會令佢加安慰、反問。
- prompt 明確要求:揀兩三樣、連成一小段流暢粵語、唔逐點列、唔加建議判斷問題、結尾唔硬塞總結。

## v0.2.1 — 修正 AI 崩潰(吐 prompt / 重複 loop)

症狀:AI 回應變成逐句吐返 system prompt、飄咗做普通話、卡喺重複。
成因:俾 Llama 3.3 70B 嘅 prompt 太長太重 + 逼佢砌 JSON,量化 model 頂唔順。
修正:
- 大幅精簡 system prompt(SAFETY/INTENT/CRAFT/coreRules 全部縮短,負面規則減到最少)
- 唔再逼 model 輸出 JSON,改成純文字;safety 改用 code 層 keyword 偵測(detectSafety)
- 加 frequency_penalty / presence_penalty 壓住重複
- 加崩潰偵測(isDegenerate):偵測到吐 prompt / 重複 / 低多樣性 → 用更簡 prompt + 更低溫重試一次 → 仍崩潰就俾一句安全 fallback,絕不將垃圾當回應顯示
- temperature 由 0.85 降到 0.7(重試 0.5)

## v0.2 — Awareness Companion 重新設計(見 REDESIGN.md)

- 開場改問「今晚你需要啲咩?」— 四張 need 卡直接帶你去啱嘅練習 + 風格
- 六種對話風格取代 persona 人物(安靜陪伴/反思/理性思考/深度對話/腦震盪/鼓勵),對話中途隨時轉
- 導航變成:今晚 / 隨手記 / 收藏庫 / 花園
- 🌱 Seeds:重要嘅一句話會喺花園慢慢生長(🌱→🌿→🌳)
- 季節 check-in(春夏秋冬)取代好/壞心情;只揀季節都算完成
- 花園分類:記錄自動歸入 🌸感恩 🌿學習 🌻工作 🌳關係 🌹回憶 🍃放低 🌼夢想
- 👁 覺察:AI 睇最近十四日,只講有記錄支持嘅 pattern,唔分析唔建議
- ⏳ 時間囊:寫俾一年/三年/五年後嘅自己,時間未到打唔開
- 🌙 Silence:逢星期日唔使寫,陪你坐一分鐘

## 已有功能(v0.1)

- 首頁植物:由種子開始,按累積活躍日數生長(唔係 streak,永遠唔會枯萎)
- 情緒簽到:多選情緒 + 強度 + 自由書寫
- AI 回應:三個 persona(阿晴/曉嵐/小澄),先反映後一問,永不說教
- 語音回應:iOS 系統粵語聲(免費、offline);「每次問我」模式會彈出來電畫面
- 對話延續:「想傾多啲」多輪對話,全 history 帶入每次請求
- 跨日記憶:最近七日記錄自動注入 prompt,AI 記得你講過嘅嘢
- 心情起伏:7/30日 valence 曲線,冇記錄嘅日子留 gap 唔會跌零
- 多空間:同一部機可開多個 profile,記錄完全隔離
- Safety layer:危機字眼觸發時停止提問,顯示香港支援熱線
- 匯出 JSON;所有數據只存本機 IndexedDB

## 未做(roadmap)

Body map、小確幸、日結/週結、Insights dashboard、Life Wiki、Growth Book、
Decision Journal、Future Me、cloud TTS 自然聲、加密雲端同步、跨裝置帳戶。

## 換 AI model

改 `functions/api/respond.ts` 入面嘅 `MODEL` / `GEMINI_URL` / `callModel` 部分。
所有 prompt 喺 `functions/lib/prompts.ts`,係唯一真相來源。

## 隱私

所有記錄存喺用戶裝置嘅 IndexedDB。只有觸發 AI 回應嗰刻,
當次內容 + 最近七日撮要會經 Cloudflare Function 送去 LLM。
上線前請覆核 `HK_CRISIS_RESOURCES` 嘅熱線號碼。

MindGarden 唔係醫療或心理治療產品。
