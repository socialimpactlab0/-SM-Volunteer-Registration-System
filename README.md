# 2027 台南神韻義工活動報名系統

第一版採最簡單架構：

- **LINE 群組**：只負責活動公告與報名連結。
- **義工活動頁**：查看活動、名單、報名、候補、取消。
- **管理後台**：新增/修改活動、查看名單、產生 LINE 公告。
- **Google Sheet**：儲存「活動」與「報名」兩張工作表。

## 專案結構

```text
-SM-Volunteer-Registration-System/
├─ src/
│  ├─ Code.gs
│  ├─ Event.html
│  ├─ Admin.html
│  └─ appsscript.json
├─ .claspignore
├─ .clasp.json.example
├─ .gitignore
├─ package.json
├─ 01_安裝_clasp.bat
├─ 02_登入_clasp.bat
├─ 03_建立_GAS專案.bat
├─ 04_上傳到_GAS.bat
├─ 05_開啟_GAS.bat
└─ 06_從_GAS下載.bat
```

## 第一次安裝（Windows）

### A. 還沒有 Google Apps Script 專案

依序執行：

1. `01_安裝_clasp.bat`
2. `02_登入_clasp.bat`
3. `03_建立_GAS專案.bat`
4. `04_上傳到_GAS.bat`
5. `05_開啟_GAS.bat`

`03_建立_GAS專案.bat` 會使用 clasp 建立一個新的 **Google Sheet + 綁定的 Apps Script 專案**，並自動產生本機 `.clasp.json`。

### B. 已經有既有 Google Apps Script 專案

1. 在 Apps Script → **專案設定** 找到 **指令碼 ID（Script ID）**。
2. 複製 `.clasp.json.example` 為 `.clasp.json`。
3. 將 `PASTE_YOUR_APPS_SCRIPT_ID_HERE` 改成實際 Script ID。
4. 執行 `04_上傳到_GAS.bat`。

> `.clasp.json` 與登入憑證不會上傳到 GitHub。

## GAS 第一次初始化

程式 push 完後，在 Apps Script 編輯器：

1. 執行 `setupSystem()` 一次並完成 Google 授權。
2. 系統會建立兩張工作表：`活動`、`報名`。
3. 預設管理密碼：`2027`。
4. 建議執行：`setAdminPin("你自己的密碼")`。
5. 如要測試，可執行 `seedDemoData()` 建立 3 筆測試活動。

## 部署為網頁應用程式

在 Apps Script 編輯器手動執行：

1. **部署 → 新增部署作業**。
2. 類型：**網頁應用程式**。
3. 執行身分：**我**。
4. 誰可以存取：選擇義工可以開啟的範圍。
5. 完成後取得 `/exec` 網址。

網址：

- 義工活動首頁：`部署網址`（直接顯示目前所有開放活動）
- 管理後台：`部署網址?admin=1`
- 單場活動直達：`部署網址?event=活動ID`（LINE 公告可用，非必要）

管理後台可直接產生 LINE 公告文字與正確活動連結。

## 日常更新流程

推薦以 GitHub/本機為程式主版本：

```text
GitHub pull
→ 修改 src 程式
→ 04_上傳到_GAS.bat
→ GAS 測試
→ Git commit / push
```

若在 GAS 網頁編輯器臨時修改，先執行 `06_從_GAS下載.bat`，再提交 GitHub，避免版本互相覆蓋。

## 第一版功能

- 活動新增/修改
- LINE 公告文字產生
- 義工報名
- 額滿後候補
- 正取取消後，候補第 1 位自動轉正
- 同一手機同一活動避免重複有效報名
- 活動時間過後自動顯示「已結束」
- 已結束活動資料保留，不刪除

目前刻意不做：LINE 自動推播、QR Code 簽到、義工時數、照片上傳、複雜會員登入。

## clasp 說明

本專案使用 `src` 作為 `rootDir`。目前 clasp 3.x 支援 `create-script`、`push`、`pull`、`open-script` 等命令；`.clasp.json` 用來指定 Apps Script 的 `scriptId` 與本機 `rootDir`。


## v0.2 速度優化

這一版主要改善 Google Sheet 讀取次數：

- 義工首頁：活動表只讀 1 次、報名表只讀 1 次。
- 管理後台列表：活動表只讀 1 次、報名表只讀 1 次。
- 首頁活動列表使用短時間快取。
- 報名、取消、修改活動後會立即清除快取，因此人數仍會更新。
- 報名時不再重複讀取同一張報名表。
- 取消正取時，候補轉正使用同一次讀取的資料。

## 模擬測試

在 Apps Script 編輯器中執行：

```javascript
createSimulationData()
```

它會建立 4 種測試情境，而且只使用 `SIM_` 開頭的測試資料，不會刪除正式資料：

1. **【測試】北極殿健走**：4 / 5 人，尚缺 1 人。
2. **【測試】安平推廣**：3 / 3 人，另外有 2 位候補。
3. **【測試】茶會接待**：1 / 6 人。
4. **【測試】昨日已結束活動**：只應出現在管理後台的已結束活動區。

### 建議測試流程

先開義工首頁：

```text
部署網址
```

測試北極殿健走：

- 應顯示 4 / 5、尚缺 1 人。
- 用一個新的手機號碼報名。
- 應變成 5 / 5、已額滿。
- 再用另一個新的手機號碼報名。
- 應變成候補。

測試取消與候補轉正：

- 安平推廣目前 3 / 3，候補 2 人。
- 可用正取測試手機：`0900000011`。
- 可用候補測試手機：`0900000014`。
- 查詢 `0900000011` 後取消報名。
- 原本候補第 1 位 `0900000014` 應自動變成正取。

測試已結束活動：

- 義工首頁不應顯示「昨日已結束活動」。
- 管理後台 `?admin=1` 的「已結束活動」應看得到。

測試完成後，在 Apps Script 執行：

```javascript
clearSimulationData()
```

只會清除 `SIM_` 開頭的模擬活動與模擬報名，不影響正式資料。
