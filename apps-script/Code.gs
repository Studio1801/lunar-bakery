/**
 * Lunar Bakery database, modeled on the Baklava Story sheet.
 *
 * Paste this into the sheet: Extensions > Apps Script. Then:
 *   1. Project Settings > Script properties > add LUNAR_SECRET = any long random text.
 *   2. Run setup() once (approve the permissions).
 *   3. Deploy > New deployment > Web app > Execute as: Me, Who has access: Anyone.
 *   4. Put the /exec URL in Vercel as SHEETS_URL and the secret as SHEETS_SECRET.
 *
 * The "State" tab is what the website reads and writes (do not type in it).
 * Orders, Products, Menu, Closed, Days and Messages are rebuilt from it on every
 * change so Jennie can read, filter and print them. Edit the website, not these tabs.
 */
var STATE = "State";
var CHUNK = 40000;
var VIEWS = {
  Orders: ["id", "date", "time", "name", "phone", "items", "note", "status", "source", "pieces"],
  Products: ["code", "name", "pieces", "price", "on"],
  Menu: ["season", "position", "name", "price", "on site now"],
  Closed: ["date"],
  Days: ["date", "place", "from", "to"],
  Messages: ["when", "customer", "phone", "from", "message"]
};

function setup() { tabs_(); }

function tabs_() {
  var ss = SpreadsheetApp.getActive();
  var st = ss.getSheetByName(STATE) || ss.insertSheet(STATE);
  if (st.getRange("A1").getValue() !== "version") {
    st.getRange("A1:B1").setValues([["version", 0]]);
    st.getRange("A2").setValue("State, rebuilt by the website. Do not type in this tab.");
  }
  Object.keys(VIEWS).forEach(function (n) {
    var sh = ss.getSheetByName(n) || ss.insertSheet(n);
    if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, VIEWS[n].length).setValues([VIEWS[n]]).setFontWeight("bold");
    sh.setFrozenRows(1);
  });
  var old = ss.getSheetByName("Sheet1");
  if (old && old.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(old);
  return st;
}

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var body = JSON.parse(e.postData.contents);
    var secret = PropertiesService.getScriptProperties().getProperty("LUNAR_SECRET");
    if (!secret || body.key !== secret) return out_({ error: "forbidden" });
    lock.waitLock(20000);
    var st = tabs_();
    var version = Number(st.getRange("B1").getValue()) || 0;
    if (body.action === "version") return out_({ version: version });
    if (body.action === "load") {
      var n = st.getLastRow() - 2;
      if (version === 0 || n < 1) return out_({ version: 0, state: null });
      var parts = st.getRange(3, 1, n, 1).getValues().map(function (r) { return r[0]; });
      return out_({ version: version, state: JSON.parse(parts.join("")) });
    }
    if (body.action === "save") {
      if (Number(body.expected) !== version) return out_({ conflict: true, version: version });
      var json = JSON.stringify(body.state);
      var rows = [];
      for (var i = 0; i < json.length; i += CHUNK) rows.push([json.substr(i, CHUNK)]);
      if (st.getLastRow() > 2) st.getRange(3, 1, st.getLastRow() - 2, 1).clearContent();
      st.getRange(3, 1, rows.length, 1).setNumberFormat("@").setValues(rows);
      st.getRange("B1").setValue(version + 1);
      try { views_(body.state); } catch (err) { console.error("views failed: " + err); }
      return out_({ ok: true, version: version + 1 });
    }
    return out_({ error: "unknown action" });
  } catch (err) {
    return out_({ error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function hm_(m) { if (m == null) return ""; var h = Math.floor(m / 60); return (h % 12 || 12) + ":" + ("0" + (m % 60)).slice(-2) + (h < 12 ? " am" : " pm"); }

function put_(name, rows) {
  var sh = SpreadsheetApp.getActive().getSheetByName(name), w = VIEWS[name].length;
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, w).clearContent();
  if (rows.length) sh.getRange(2, 1, rows.length, w).setNumberFormat("@").setValues(rows);
}

function views_(s) {
  var tz = Session.getScriptTimeZone();
  var names = {}, sizes = {};
  (s.products || []).forEach(function (p) { (p.sizes || []).forEach(function (z) { names[z.code] = p.name; sizes[z.code] = z.pieces; }); });
  put_("Products", (s.products || []).reduce(function (a, p) {
    return a.concat((p.sizes || []).map(function (z) { return [z.code, p.name, z.pieces, z.price, z.on ? "yes" : "no"]; }));
  }, []));
  var done = s.done || {};
  put_("Orders", (s.orders || []).slice().sort(function (a, b) { return (a.date + ("0000" + a.time).slice(-4)) < (b.date + ("0000" + b.time).slice(-4)) ? -1 : 1; }).map(function (o) {
    var pcs = 0;
    var items = (o.items || []).map(function (i) { pcs += (sizes[i.code] || 0) * i.qty; return i.qty + " x " + (names[i.code] || i.code) + (sizes[i.code] ? " (" + sizes[i.code] + ")" : ""); }).join(", ");
    var status = o.cancelled ? "cancelled" : o.declined ? "declined" : o.pending ? "pending" : done[o.id] ? "picked up" : o.ready ? "ready" : "confirmed";
    return [o.id, o.date, hm_(o.time), o.name, o.phone, items, o.note || "", status, o.source, pcs];
  }));
  var m = s.menu || {}, now = s.season || "summer", mrows = [];
  ["spring", "summer", "fall", "winter"].forEach(function (k) {
    (m[k] || []).forEach(function (it, n) { mrows.push([k, n + 1, it.name, it.price, k === now ? "yes" : ""]); });
  });
  put_("Menu", mrows);
  put_("Closed", Object.keys(s.closed || {}).filter(function (d) { return s.closed[d]; }).sort().map(function (d) { return [d]; }));
  put_("Days", Object.keys(s.days || {}).sort().map(function (d) { var x = s.days[d]; return [d, x.place || "", hm_(x.from), hm_(x.to)]; }));
  var msgs = [];
  Object.keys(s.threads || {}).forEach(function (id) {
    var t = s.threads[id];
    (t.msgs || []).forEach(function (g) { msgs.push([g.at, Utilities.formatDate(new Date(g.at), tz, "yyyy-MM-dd HH:mm"), t.name, t.phone || "", g.from, g.text]); });
  });
  msgs.sort(function (a, b) { return a[0] - b[0]; });
  put_("Messages", msgs.map(function (r) { return r.slice(1); }));
}
