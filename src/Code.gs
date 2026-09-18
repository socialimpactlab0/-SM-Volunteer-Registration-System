const CONFIG = {
  TZ: 'Asia/Taipei',
  SHEET_EVENTS: '活動',
  SHEET_REGS: '報名',
  DEFAULT_ADMIN_PIN: '2027'
};

const EVENT_HEADERS = [
  '活動ID','活動名稱','日期','集合時間','開始時間','結束時間',
  '地點','地址','接洽人','需求人數','活動說明','狀態','建立時間','更新時間'
];

const REG_HEADERS = [
  '報名ID','活動ID','姓名','電話','報名狀態','報名時間','取消時間'
];

function doGet(e) {
  const params = (e && e.parameter) || {};
  if (params.admin === '1') {
    return HtmlService.createTemplateFromFile('Admin')
      .evaluate()
      .setTitle('志工報名系統－管理後台')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  const tpl = HtmlService.createTemplateFromFile('Event');
  tpl.eventId = params.event || '';
  return tpl.evaluate()
    .setTitle('義工活動')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/** 第一次使用時，先在 Apps Script 編輯器執行一次。 */
function setupSystem() {
  const ss = getSS_();
  ensureSheet_(ss, CONFIG.SHEET_EVENTS, EVENT_HEADERS);
  ensureSheet_(ss, CONFIG.SHEET_REGS, REG_HEADERS);

  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('ADMIN_PIN')) {
    props.setProperty('ADMIN_PIN', CONFIG.DEFAULT_ADMIN_PIN);
  }
  if (!props.getProperty('SPREADSHEET_ID')) {
    props.setProperty('SPREADSHEET_ID', ss.getId());
  }

  Logger.log('初始化完成');
  Logger.log('管理後台預設密碼：' + props.getProperty('ADMIN_PIN'));
  Logger.log('請再執行 setAdminPin("新密碼") 修改管理密碼。');
}

function setAdminPin(newPin) {
  const pin = String(newPin || '').trim();
  if (pin.length < 4) throw new Error('管理密碼至少 4 碼。');
  PropertiesService.getScriptProperties().setProperty('ADMIN_PIN', pin);
  return true;
}

/** 可選：建立 3 筆測試活動。 */
function seedDemoData() {
  const ss = getSS_();
  const sh = ensureSheet_(ss, CONFIG.SHEET_EVENTS, EVENT_HEADERS);
  if (sh.getLastRow() > 1) return '活動表已有資料，未寫入測試資料。';

  const y = 2027;
  const now = new Date();
  const demo = [
    ['E' + y + '0919', '北極殿健走', `${y}-09-19`, '05:30', '06:00', '07:00', '鹽埕北極殿廣場前', '台南市南區鹽埕路159巷1號', '榮琳', 5, '協助健走活動現場引導與簡單支援。', '開放', now, now],
    ['E' + y + '0920', '安平推廣', `${y}-09-20`, '08:30', '09:00', '11:00', '安平老街', '', '', 8, '', '開放', now, now],
    ['E' + y + '0925', '茶會接待', `${y}-09-25`, '13:00', '13:30', '16:30', '維悅酒店', '', '', 10, '', '開放', now, now]
  ];
  sh.getRange(2, 1, demo.length, EVENT_HEADERS.length).setValues(demo);
  return '測試活動已建立。';
}

// =============================
// 義工端 API
// =============================

function getPublicEvents() {
  const sh = getSS_().getSheetByName(CONFIG.SHEET_EVENTS);
  if (!sh) return [];

  const events = sheetObjects_(sh, EVENT_HEADERS)
    .map(ev => {
      const status = computeEventStatus_(ev);
      if (status !== '開放') return null;

      const regs = getActiveRegs_(ev['活動ID']);
      const positive = regs.filter(r => r['報名狀態'] === '正取').length;
      const wait = regs.filter(r => r['報名狀態'] === '候補').length;
      return publicEvent_(ev, positive, wait, status);
    })
    .filter(Boolean);

  events.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  return events;
}

function getEventPageData(eventId, phone) {
  const event = getEventById_(eventId);
  if (!event) return { ok: false, message: '找不到這個活動。' };

  const activeRegs = getActiveRegs_(eventId);
  const need = Number(event['需求人數'] || 0);
  const positive = activeRegs.filter(r => r['報名狀態'] === '正取');
  const waitlist = activeRegs.filter(r => r['報名狀態'] === '候補');

  const computedStatus = computeEventStatus_(event);
  const my = phone ? findActiveRegByPhone_(eventId, normalizePhone_(phone)) : null;

  return {
    ok: true,
    event: publicEvent_(event, positive.length, waitlist.length, computedStatus),
    roster: positive.map((r, i) => ({ no: i + 1, name: r['姓名'] })),
    waitlist: waitlist.map((r, i) => ({ no: i + 1, name: r['姓名'] })),
    my: my ? {
      regId: my['報名ID'],
      name: my['姓名'],
      phone: my['電話'],
      status: my['報名狀態']
    } : null
  };
}

function registerVolunteer(payload) {
  payload = payload || {};
  const eventId = String(payload.eventId || '').trim();
  const name = String(payload.name || '').trim();
  const phone = normalizePhone_(payload.phone);
  if (!eventId) throw new Error('缺少活動編號。');
  if (!name) throw new Error('請輸入姓名。');
  if (!phone || phone.length < 8) throw new Error('請輸入正確的手機號碼。');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const event = getEventById_(eventId);
    if (!event) throw new Error('找不到這個活動。');

    const status = computeEventStatus_(event);
    if (status !== '開放') {
      throw new Error(status === '已結束' ? '這個活動已經結束。' : '目前沒有開放報名。');
    }

    const existing = findActiveRegByPhone_(eventId, phone);
    if (existing) {
      return {
        ok: true,
        alreadyRegistered: true,
        regId: existing['報名ID'],
        status: existing['報名狀態'],
        message: `你已經是${existing['報名狀態']}，不需要重複報名。`
      };
    }

    const active = getActiveRegs_(eventId);
    const positiveCount = active.filter(r => r['報名狀態'] === '正取').length;
    const need = Number(event['需求人數'] || 0);
    const regStatus = positiveCount < need ? '正取' : '候補';

    const sh = getSS_().getSheetByName(CONFIG.SHEET_REGS);
    const regId = 'R' + Utilities.getUuid().replace(/-/g, '').slice(0, 12).toUpperCase();
    sh.appendRow([regId, eventId, name, phone, regStatus, new Date(), '']);

    return {
      ok: true,
      alreadyRegistered: false,
      regId,
      status: regStatus,
      message: regStatus === '正取' ? '報名成功。' : '活動已額滿，已加入候補。'
    };
  } finally {
    lock.releaseLock();
  }
}

function cancelRegistration(eventId, phone) {
  eventId = String(eventId || '').trim();
  phone = normalizePhone_(phone);
  if (!eventId || !phone) throw new Error('資料不完整。');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = getSS_().getSheetByName(CONFIG.SHEET_REGS);
    const rows = sheetObjects_(sh, REG_HEADERS);
    const target = rows.find(r => r['活動ID'] === eventId && normalizePhone_(r['電話']) === phone && ['正取','候補'].includes(r['報名狀態']));
    if (!target) throw new Error('查不到目前有效的報名紀錄。');

    const row = target.__row;
    sh.getRange(row, REG_HEADERS.indexOf('報名狀態') + 1).setValue('已取消');
    sh.getRange(row, REG_HEADERS.indexOf('取消時間') + 1).setValue(new Date());

    if (target['報名狀態'] === '正取') {
      promoteFirstWaitlist_(eventId);
    }

    return { ok: true, message: '已取消報名，名額已更新。' };
  } finally {
    lock.releaseLock();
  }
}

// =============================
// 管理端 API
// =============================

function checkAdmin(pin) {
  return validateAdmin_(pin);
}

function adminListEvents(pin) {
  requireAdmin_(pin);
  const sh = getSS_().getSheetByName(CONFIG.SHEET_EVENTS);
  const events = sheetObjects_(sh, EVENT_HEADERS);
  const result = events.map(ev => {
    const regs = getActiveRegs_(ev['活動ID']);
    const positive = regs.filter(r => r['報名狀態'] === '正取').length;
    const wait = regs.filter(r => r['報名狀態'] === '候補').length;
    const st = computeEventStatus_(ev);
    return publicEvent_(ev, positive, wait, st);
  });

  result.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  return result;
}

function adminSaveEvent(pin, payload) {
  requireAdmin_(pin);
  payload = payload || {};

  const name = String(payload.name || '').trim();
  const date = String(payload.date || '').trim();
  const need = Number(payload.need || 0);
  if (!name) throw new Error('請輸入活動名稱。');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('請選擇活動日期。');
  if (!need || need < 1) throw new Error('需求人數至少 1 人。');

  const sh = getSS_().getSheetByName(CONFIG.SHEET_EVENTS);
  const rows = sheetObjects_(sh, EVENT_HEADERS);
  const now = new Date();
  let eventId = String(payload.eventId || '').trim();

  const data = {
    '活動名稱': name,
    '日期': date,
    '集合時間': String(payload.meetTime || '').trim(),
    '開始時間': String(payload.startTime || '').trim(),
    '結束時間': String(payload.endTime || '').trim(),
    '地點': String(payload.place || '').trim(),
    '地址': String(payload.address || '').trim(),
    '接洽人': String(payload.contact || '').trim(),
    '需求人數': need,
    '活動說明': String(payload.description || '').trim(),
    '狀態': String(payload.status || '開放').trim()
  };

  if (eventId) {
    const old = rows.find(r => r['活動ID'] === eventId);
    if (!old) throw new Error('找不到要修改的活動。');
    const values = EVENT_HEADERS.map(h => {
      if (h === '活動ID') return eventId;
      if (h === '建立時間') return old['建立時間'] || now;
      if (h === '更新時間') return now;
      return Object.prototype.hasOwnProperty.call(data, h) ? data[h] : old[h];
    });
    sh.getRange(old.__row, 1, 1, EVENT_HEADERS.length).setValues([values]);
  } else {
    eventId = makeEventId_(date);
    sh.appendRow([
      eventId, data['活動名稱'], data['日期'], data['集合時間'], data['開始時間'], data['結束時間'],
      data['地點'], data['地址'], data['接洽人'], data['需求人數'], data['活動說明'], data['狀態'], now, now
    ]);
  }

  return { ok: true, eventId };
}

function adminGetEvent(pin, eventId) {
  requireAdmin_(pin);
  const ev = getEventById_(eventId);
  if (!ev) throw new Error('找不到活動。');
  const regs = getActiveRegs_(eventId);
  const positive = regs.filter(r => r['報名狀態'] === '正取').length;
  const wait = regs.filter(r => r['報名狀態'] === '候補').length;
  return publicEvent_(ev, positive, wait, computeEventStatus_(ev));
}

function adminGetRegistrations(pin, eventId) {
  requireAdmin_(pin);
  const rows = getRegsByEvent_(eventId);
  return rows.map(r => ({
    regId: r['報名ID'],
    name: r['姓名'],
    phone: r['電話'],
    status: r['報名狀態'],
    registeredAt: formatDateTime_(r['報名時間']),
    cancelledAt: formatDateTime_(r['取消時間'])
  }));
}

function adminGetLineMessage(pin, eventId) {
  requireAdmin_(pin);
  const ev = getEventById_(eventId);
  if (!ev) throw new Error('找不到活動。');

  const regs = getActiveRegs_(eventId);
  const positive = regs.filter(r => r['報名狀態'] === '正取').length;
  const wait = regs.filter(r => r['報名狀態'] === '候補').length;
  const need = Number(ev['需求人數'] || 0);
  const shortage = Math.max(need - positive, 0);
  const webUrl = ScriptApp.getService().getUrl() || '【部署後網址】';
  const link = `${webUrl}?event=${encodeURIComponent(eventId)}`;
  const statusLine = shortage > 0 ? `尚缺：${shortage} 人` : `目前：已額滿${wait ? `（候補 ${wait} 人）` : ''}`;

  const msg = [
    `【${formatMd_(ev['日期'])} ${ev['活動名稱']}】`,
    '',
    ev['集合時間'] ? `集合：${ev['集合時間']}` : '',
    (ev['開始時間'] || ev['結束時間']) ? `活動：${ev['開始時間'] || ''}${ev['結束時間'] ? '–' + ev['結束時間'] : ''}` : '',
    ev['地點'] ? `地點：${ev['地點']}` : '',
    `需求：${need} 人`,
    `目前：${positive} 人`,
    statusLine,
    '',
    `👉 報名／查看名單`,
    link
  ].filter((v, i, a) => v !== '' || (i > 0 && a[i - 1] !== '')).join('\n').replace(/\n{3,}/g, '\n\n');

  return { ok: true, message: msg, url: link };
}

// =============================
// 內部工具
// =============================

function getSS_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) throw new Error('找不到 Google Sheet。請先將 Apps Script 綁定到試算表後執行 setupSystem()。');
  return active;
}

function ensureSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  } else {
    const current = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), headers.length)).getValues()[0];
    headers.forEach((h, i) => {
      if (current[i] !== h) sh.getRange(1, i + 1).setValue(h);
    });
  }
  return sh;
}

function sheetObjects_(sheet, headers) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const vals = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
  return vals
    .map((row, idx) => {
      const obj = { __row: idx + 2 };
      headers.forEach((h, i) => obj[h] = normalizeCell_(h, row[i]));
      return obj;
    })
    .filter(obj => String(obj[headers[0]] || '').trim() !== '');
}

function normalizeCell_(header, v) {
  if (v instanceof Date) {
    if (header === '日期') return Utilities.formatDate(v, CONFIG.TZ, 'yyyy-MM-dd');
    if (['集合時間','開始時間','結束時間'].includes(header)) return Utilities.formatDate(v, CONFIG.TZ, 'HH:mm');
  }
  return v;
}

function getEventById_(eventId) {
  if (!eventId) return null;
  const sh = getSS_().getSheetByName(CONFIG.SHEET_EVENTS);
  if (!sh) return null;
  return sheetObjects_(sh, EVENT_HEADERS).find(r => String(r['活動ID']) === String(eventId)) || null;
}

function getRegsByEvent_(eventId) {
  const sh = getSS_().getSheetByName(CONFIG.SHEET_REGS);
  if (!sh) return [];
  return sheetObjects_(sh, REG_HEADERS).filter(r => r['活動ID'] === eventId);
}

function getActiveRegs_(eventId) {
  return getRegsByEvent_(eventId).filter(r => ['正取','候補'].includes(r['報名狀態']));
}

function findActiveRegByPhone_(eventId, phone) {
  return getActiveRegs_(eventId).find(r => normalizePhone_(r['電話']) === phone) || null;
}

function promoteFirstWaitlist_(eventId) {
  const sh = getSS_().getSheetByName(CONFIG.SHEET_REGS);
  const wait = getRegsByEvent_(eventId)
    .filter(r => r['報名狀態'] === '候補')
    .sort((a, b) => toTime_(a['報名時間']) - toTime_(b['報名時間']));
  if (!wait.length) return false;
  sh.getRange(wait[0].__row, REG_HEADERS.indexOf('報名狀態') + 1).setValue('正取');
  return true;
}

function computeEventStatus_(event) {
  const manual = String(event['狀態'] || '開放');
  if (manual === '取消') return '取消';
  if (manual === '關閉') return '關閉';
  if (isEventEnded_(event)) return '已結束';
  return '開放';
}

function isEventEnded_(event) {
  const date = String(event['日期'] || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const endTime = String(event['結束時間'] || '23:59');
  const safeTime = /^\d{2}:\d{2}$/.test(endTime) ? endTime : '23:59';
  const end = new Date(`${date}T${safeTime}:59+08:00`);
  return new Date().getTime() > end.getTime();
}

function publicEvent_(ev, positiveCount, waitCount, computedStatus) {
  const need = Number(ev['需求人數'] || 0);
  return {
    eventId: ev['活動ID'],
    name: ev['活動名稱'],
    date: ev['日期'],
    dateText: formatMd_(ev['日期']),
    weekday: weekdayZh_(ev['日期']),
    meetTime: ev['集合時間'] || '',
    startTime: ev['開始時間'] || '',
    endTime: ev['結束時間'] || '',
    place: ev['地點'] || '',
    address: ev['地址'] || '',
    contact: ev['接洽人'] || '',
    need,
    description: ev['活動說明'] || '',
    manualStatus: ev['狀態'] || '開放',
    status: computedStatus,
    positiveCount,
    waitCount,
    shortage: Math.max(need - positiveCount, 0),
    isFull: positiveCount >= need,
    canRegister: computedStatus === '開放'
  };
}

function validateAdmin_(pin) {
  const expected = PropertiesService.getScriptProperties().getProperty('ADMIN_PIN') || CONFIG.DEFAULT_ADMIN_PIN;
  return String(pin || '') === String(expected);
}

function requireAdmin_(pin) {
  if (!validateAdmin_(pin)) throw new Error('管理密碼錯誤。');
}

function normalizePhone_(phone) {
  return String(phone || '').replace(/[^0-9]/g, '');
}

function makeEventId_(date) {
  const prefix = 'E' + String(date || '').replace(/-/g, '');
  const suffix = Utilities.getUuid().replace(/-/g, '').slice(0, 4).toUpperCase();
  return prefix + suffix;
}

function formatMd_(date) {
  const m = String(date || '').match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (!m) return String(date || '');
  return `${Number(m[1])}/${Number(m[2])}`;
}

function weekdayZh_(date) {
  const m = String(date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00+08:00`);
  return ['日','一','二','三','四','五','六'][d.getDay()];
}

function formatDateTime_(v) {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return Utilities.formatDate(d, CONFIG.TZ, 'yyyy/MM/dd HH:mm');
}

function toTime_(v) {
  if (v instanceof Date) return v.getTime();
  const d = new Date(v);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}
