/**
 * Stellar Camera Rentals — Google Apps Script Web App
 * Tabs: Products, Rentals, Maintenance, ActivityLogs
 * Row 1 = headers (canonical names below; aliases supported when reading).
 */

var SPREADSHEET_ID_KEY = 'SPREADSHEET_ID';

/** Canonical headers — align new sheets; existing sheets matched via aliases + column position. */
var HEADERS_PRODUCTS = [
  'id', 'qrCode', 'productName', 'category', 'brand', 'modelNumber', 'serialNumber',
  'rentalPrice', 'image', 'status', 'currentCustomer', 'expectedReturnDate', 'lastUpdated',
];

/** Matches common sheet layouts; append missing columns at end via ensureExtraColumns_ */
var HEADERS_RENTALS = [
  'rentalId', 'productId', 'productName', 'customerName', 'phone', 'advanceAmount',
  'rentedAt', 'expectedReturn', 'returnedAt', 'billAmount', 'extraCharges', 'notes',
  'status', 'returnKind',
];

var HEADERS_MAINT = [
  'maintenanceId', 'productId', 'productName', 'givenTo', 'issue',
  'startedAt', 'expectedCompletion', 'completedAt', 'cost', 'notes', 'status',
];

var HEADERS_ACTIVITY = [
  'logId', 'type', 'productId', 'productName', 'message', 'meta', 'timestamp',
];

/** When obj[h] empty, try these sheet column names (same row object keyed by actual headers). */
var FIELD_ALIASES = {
  rentals: {
    rentalId: ['id', 'rental_id'],
    billAmount: ['finalBill', 'final_bill'],
    expectedReturn: ['expectedReturnDate', 'expected_return', 'due'],
    timestamp: ['createdAt', 'created_at', 'time'],
    type: ['action', 'event'],
    message: ['description', 'details'],
    logId: ['id'],
    maintenanceId: ['id', 'ticketId'],
    cost: ['repairCost', 'repair_cost', 'amount'],
    startedAt: ['createdAt', 'openedAt'],
    expectedCompletion: ['estimatedCompletion', 'estimated_completion', 'eta'],
  },
};

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function getSpreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty(SPREADSHEET_ID_KEY);
  if (!id) throw new Error('Set script property SPREADSHEET_ID to your Google Sheet ID');
  return SpreadsheetApp.openById(id);
}

function getOrCreateSheet_(name, headers) {
  var ss = getSpreadsheet_();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  ensureExtraColumns_(sh, headers);
  return sh;
}

/** Append missing headers at the end so older sheets gain billAmount, extraCharges, etc. */
function ensureExtraColumns_(sh, requiredHeaders) {
  var lc = sh.getLastColumn();
  if (lc < 1) return;
  var existing = sh.getRange(1, 1, 1, lc).getValues()[0].map(function (x) {
    return String(x || '').trim();
  });
  var toAdd = [];
  for (var i = 0; i < requiredHeaders.length; i++) {
    var h = requiredHeaders[i];
    if (existing.indexOf(h) < 0) toAdd.push(h);
  }
  if (toAdd.length === 0) return;
  var start = lc + 1;
  sh.getRange(1, start, 1, start + toAdd.length - 1).setValues([toAdd]);
}

function nk_(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

/** Build lookup from actual header row → column index */
function headerIndexMap_(sh) {
  var lc = sh.getLastColumn();
  var row = lc > 0 ? sh.getRange(1, 1, 1, lc).getValues()[0] : [];
  var map = {};
  for (var i = 0; i < row.length; i++) {
    var key = String(row[i]).trim();
    if (!key) continue;
    map[nk_(key)] = i + 1;
    map[key] = i + 1;
  }
  return map;
}

function pickAlias_(o, canonicalField, aliasGroup) {
  var alts = FIELD_ALIASES[aliasGroup] && FIELD_ALIASES[aliasGroup][canonicalField];
  var keys = Object.keys(o);
  var tryOrder = [canonicalField];
  if (alts) for (var a = 0; a < alts.length; a++) tryOrder.push(alts[a]);
  for (var t = 0; t < tryOrder.length; t++) {
    var name = tryOrder[t];
    for (var k = 0; k < keys.length; k++) {
      if (nk_(keys[k]) === nk_(name)) {
        var v = o[keys[k]];
        if (v !== '' && v !== undefined && v !== null) return v;
      }
    }
  }
  return undefined;
}

function normalizeCell_(h, v) {
  if (
    nk_(h).indexOf('price') >= 0 ||
    nk_(h).indexOf('amount') >= 0 ||
    nk_(h) === 'advanceamount' ||
    nk_(h) === 'billamount' ||
    nk_(h) === 'finalbill' ||
    nk_(h) === 'extracharges' ||
    nk_(h) === 'cost' ||
    nk_(h) === 'repaircost'
  ) {
    return v === '' || v === null ? null : Number(v);
  }
  if (nk_(h) === 'meta' && typeof v === 'string' && v) {
    try {
      return JSON.parse(v);
    } catch (e) {
      return {};
    }
  }
  if (v instanceof Date) return v.toISOString();
  return v === null || v === undefined ? '' : v;
}

/** Row object keyed by sheet headers → canonical record object for JSON arrays */
function rowToCanonical_(o, headers, sheetName) {
  var x = {};
  var keys = Object.keys(o);
  for (var i = 0; i < headers.length; i++) {
    var h = headers[i];
    var v = undefined;
    for (var k = 0; k < keys.length; k++) {
      if (nk_(keys[k]) === nk_(h)) {
        v = o[keys[k]];
        break;
      }
    }
    if (v === undefined || v === null || v === '') {
      v = pickAlias_(o, h, 'rentals');
    }
    x[h] = normalizeCell_(h, v === undefined || v === null ? '' : v);
  }
  return x;
}

function sheetToObjects_(sh, headers, sheetName) {
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var rowHeaders = values[0].map(function (x) {
    return String(x || '').trim();
  });
  var out = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var o = {};
    for (var c = 0; c < rowHeaders.length; c++) {
      var key = rowHeaders[c];
      if (!key) continue;
      o[key] = row[c];
    }
    out.push(rowToCanonical_(o, headers, sheetName));
  }
  return out;
}

/** Serialize canonical row for append/update using sheet header names */
function canonicalToRowArray_(sh, headers, obj) {
  ensureExtraColumns_(sh, headers);
  var lr = sh.getLastColumn();
  var headerRow = lr > 0 ? sh.getRange(1, 1, 1, lr).getValues()[0] : [];
  var arr = [];
  for (var c = 0; c < headerRow.length; c++) {
    var hc = String(headerRow[c] || '').trim();
    var v = '';
    var fn = '';
    for (var hi = 0; hi < headers.length; hi++) {
      if (nk_(headers[hi]) === nk_(hc)) {
        fn = headers[hi];
        v = obj[fn];
        break;
      }
    }
    if (v === undefined || v === null || v === '') {
      if (nk_(hc) === nk_('rentalId')) v = obj.rentalId || obj.id || '';
      else if (nk_(hc) === nk_('maintenanceId')) v = obj.maintenanceId || obj.id || '';
      else if (nk_(hc) === nk_('logId')) v = obj.logId || obj.id || '';
    }
    if (fn === 'meta' && typeof v === 'object' && v !== null) v = JSON.stringify(v || {});
    if (v === undefined || v === null) v = '';
    arr.push(v);
  }
  return arr;
}

function appendRowCanonical_(sh, headers, sheetName, obj) {
  ensureExtraColumns_(sh, headers);
  var arr = canonicalToRowArray_(sh, headers, obj);
  sh.appendRow(arr);
}

function updateRowCanonical_(sh, rowIndex, headers, sheetName, obj) {
  ensureExtraColumns_(sh, headers);
  var arr = canonicalToRowArray_(sh, headers, obj);
  sh.getRange(rowIndex, 1, rowIndex, arr.length).setValues([arr]);
}

function findRowByIdFlexible_(sh, id, idHeaders) {
  var hmap = headerIndexMap_(sh);
  var lc = sh.getLastColumn();
  var data = sh.getDataRange().getValues();
  var colIdx = -1;
  for (var i = 0; i < idHeaders.length; i++) {
    var h = idHeaders[i];
    var c = hmap[nk_(h)] || hmap[h];
    if (c) {
      colIdx = c - 1;
      break;
    }
  }
  if (colIdx < 0) colIdx = 0;
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][colIdx]) === String(id)) return r + 1;
  }
  return -1;
}

function nowIso_() {
  return new Date().toISOString();
}

function readProducts_() {
  var sh = getOrCreateSheet_('Products', HEADERS_PRODUCTS);
  return sheetToObjects_(sh, HEADERS_PRODUCTS, 'Products');
}

function readRentals_() {
  var sh = getOrCreateSheet_('Rentals', HEADERS_RENTALS);
  return sheetToObjects_(sh, HEADERS_RENTALS, 'Rentals');
}

function readMaintenance_() {
  var sh = getOrCreateSheet_('Maintenance', HEADERS_MAINT);
  return sheetToObjects_(sh, HEADERS_MAINT, 'Maintenance');
}

function readActivity_() {
  var sh = getOrCreateSheet_('ActivityLogs', HEADERS_ACTIVITY);
  return sheetToObjects_(sh, HEADERS_ACTIVITY, 'ActivityLogs');
}

function logActivity_(type, productId, productName, message, meta) {
  var sh = getOrCreateSheet_('ActivityLogs', HEADERS_ACTIVITY);
  appendRowCanonical_(sh, HEADERS_ACTIVITY, 'ActivityLogs', {
    logId: Utilities.getUuid(),
    type: type,
    productId: productId,
    productName: productName,
    message: message,
    meta: meta || {},
    timestamp: nowIso_(),
  });
}

function doGet(e) {
  try {
    var action = (e.parameter && e.parameter.action) || '';
    if (action === 'getDashboard') {
      return jsonResponse({
        products: readProducts_(),
        rentals: readRentals_(),
        maintenance: readMaintenance_(),
        activityLogs: readActivity_(),
      });
    }
    if (action === 'getProducts') return jsonResponse({ products: readProducts_() });
    if (action === 'getRentals') return jsonResponse({ rentals: readRentals_() });
    if (action === 'getMaintenance') return jsonResponse({ maintenance: readMaintenance_() });
    if (action === 'getActivities') return jsonResponse({ activityLogs: readActivity_() });
    return jsonResponse({ success: false, message: 'Invalid GET action' });
  } catch (err) {
    return jsonResponse({ success: false, message: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  try {
    var p = e.parameter;
    var action = p.action;
    if (!action) return jsonResponse({ success: false, message: 'Missing action' });

    if (action === 'addProduct') {
      handleAddProduct_(p);
    } else if (action === 'rentProduct') {
      handleRentProduct_(p);
    } else if (action === 'returnProduct') {
      handleReturnProduct_(p);
    } else if (action === 'markMaintenance') {
      handleMarkMaintenance_(p);
    } else if (action === 'completeMaintenance') {
      handleCompleteMaintenance_(p);
    } else if (action === 'resetDemo') {
      handleResetDemo_();
    } else {
      return jsonResponse({ success: false, message: 'Invalid POST action' });
    }

    return jsonResponse({
      success: true,
      products: readProducts_(),
      rentals: readRentals_(),
      maintenance: readMaintenance_(),
      activityLogs: readActivity_(),
    });
  } catch (err) {
    return jsonResponse({ success: false, message: String(err && err.message ? err.message : err) });
  }
}

function handleAddProduct_(p) {
  var id = Utilities.getUuid();
  var qrCode = 'STELLAR-' + id.replace(/-/g, '').substring(0, 10).toUpperCase();
  var sh = getOrCreateSheet_('Products', HEADERS_PRODUCTS);
  var row = {
    id: id,
    qrCode: qrCode,
    productName: p.productName || '',
    category: p.category || '',
    brand: p.brand || '',
    modelNumber: p.modelNumber || '',
    serialNumber: p.serialNumber || '',
    rentalPrice: Number(p.rentalPrice || 0),
    image: p.image || '',
    status: p.status || 'available',
    currentCustomer: '',
    expectedReturnDate: '',
    lastUpdated: nowIso_(),
  };
  appendRowCanonical_(sh, HEADERS_PRODUCTS, 'Products', row);
  logActivity_('product_added', id, row.productName, 'New product added — ' + row.productName, { category: row.category });
}

function handleRentProduct_(p) {
  var psh = getOrCreateSheet_('Products', HEADERS_PRODUCTS);
  var products = readProducts_();
  var prod = null;
  for (var i = 0; i < products.length; i++) {
    if (String(products[i].id) === String(p.productId)) {
      prod = products[i];
      break;
    }
  }
  if (!prod || prod.status !== 'available') throw new Error('Product not available');

  var rowIndex = findRowByIdFlexible_(psh, p.productId, ['id']);
  if (rowIndex < 0) throw new Error('Product row not found');

  prod.status = 'rented';
  prod.currentCustomer = p.customerName || '';
  var dueBack = p.expectedReturn || p.expectedReturnDate || '';
  prod.expectedReturnDate = dueBack;
  prod.lastUpdated = nowIso_();
  updateRowCanonical_(psh, rowIndex, HEADERS_PRODUCTS, 'Products', prod);

  var rentalId = Utilities.getUuid();
  var rsh = getOrCreateSheet_('Rentals', HEADERS_RENTALS);
  appendRowCanonical_(rsh, HEADERS_RENTALS, 'Rentals', {
    rentalId: rentalId,
    productId: p.productId,
    productName: prod.productName,
    customerName: p.customerName || '',
    phone: p.phone || '',
    advanceAmount: Number(p.advanceAmount || 0),
    rentedAt: nowIso_(),
    expectedReturn: dueBack,
    returnedAt: '',
    billAmount: '',
    extraCharges: '',
    notes: p.notes || '',
    status: 'active',
    returnKind: '',
  });
  logActivity_('rental_started', p.productId, prod.productName, 'Rented to ' + (p.customerName || ''), { rentalId: rentalId });
}

function handleReturnProduct_(p) {
  var psh = getOrCreateSheet_('Products', HEADERS_PRODUCTS);
  var products = readProducts_();
  var prod = null;
  for (var i = 0; i < products.length; i++) {
    if (String(products[i].id) === String(p.productId)) {
      prod = products[i];
      break;
    }
  }
  if (!prod) throw new Error('Product not found');

  var prodRow = findRowByIdFlexible_(psh, p.productId, ['id']);
  prod.status = 'available';
  prod.currentCustomer = '';
  prod.expectedReturnDate = '';
  prod.lastUpdated = nowIso_();
  updateRowCanonical_(psh, prodRow, HEADERS_PRODUCTS, 'Products', prod);

  var rsh = getOrCreateSheet_('Rentals', HEADERS_RENTALS);
  var rentRow = findRowByIdFlexible_(rsh, p.rentalId, ['rentalId', 'id']);
  if (rentRow < 0) throw new Error('Rental not found');

  var rentals = readRentals_();
  var rent = null;
  for (var j = 0; j < rentals.length; j++) {
    if (String(rentals[j].rentalId) === String(p.rentalId) || String(rentals[j].id) === String(p.rentalId)) {
      rent = rentals[j];
      break;
    }
  }
  if (!rent) throw new Error('Rental record not found');

  rent.status = 'closed';
  var billRaw = p.billAmount !== undefined && p.billAmount !== '' ? p.billAmount : p.finalBill;
  rent.billAmount = Number(billRaw || 0);
  rent.extraCharges = Number(p.extraCharges || 0);
  rent.notes = p.notes || rent.notes || '';
  rent.returnedAt = p.returnedAt || nowIso_();
  rent.returnKind = p.returnKind || 'on_time';

  updateRowCanonical_(rsh, rentRow, HEADERS_RENTALS, 'Rentals', rent);

  logActivity_('rental_closed', p.productId, prod.productName, 'Return completed (' + rent.returnKind + ')', {
    rentalId: p.rentalId,
    billAmount: rent.billAmount,
  });
}

function handleMarkMaintenance_(p) {
  var psh = getOrCreateSheet_('Products', HEADERS_PRODUCTS);
  var products = readProducts_();
  var prod = null;
  for (var i = 0; i < products.length; i++) {
    if (String(products[i].id) === String(p.productId)) {
      prod = products[i];
      break;
    }
  }
  if (!prod || prod.status !== 'available') throw new Error('Product not available for maintenance');

  var prodRow = findRowByIdFlexible_(psh, p.productId, ['id']);
  prod.status = 'maintenance';
  prod.lastUpdated = nowIso_();
  updateRowCanonical_(psh, prodRow, HEADERS_PRODUCTS, 'Products', prod);

  var mid = Utilities.getUuid();
  var msh = getOrCreateSheet_('Maintenance', HEADERS_MAINT);
  var eta =
    (p.estimatedCompletion !== undefined && String(p.estimatedCompletion).trim() !== ''
      ? p.estimatedCompletion
      : null) ||
    (p.expectedCompletion !== undefined && String(p.expectedCompletion).trim() !== ''
      ? p.expectedCompletion
      : null) ||
    '';
  appendRowCanonical_(msh, HEADERS_MAINT, 'Maintenance', {
    maintenanceId: mid,
    productId: p.productId,
    productName: prod.productName,
    givenTo: p.givenTo || '',
    issue: p.issue || '',
    startedAt: nowIso_(),
    expectedCompletion: eta,
    completedAt: '',
    cost: '',
    notes: p.notes || '',
    status: 'open',
  });
  logActivity_('maintenance_started', p.productId, prod.productName, 'Maintenance — ' + (p.issue || ''), {
    maintenanceId: mid,
  });
}

function handleCompleteMaintenance_(p) {
  var psh = getOrCreateSheet_('Products', HEADERS_PRODUCTS);
  var products = readProducts_();
  var prod = null;
  for (var i = 0; i < products.length; i++) {
    if (String(products[i].id) === String(p.productId)) {
      prod = products[i];
      break;
    }
  }
  if (!prod) throw new Error('Product not found');

  var prodRow = findRowByIdFlexible_(psh, p.productId, ['id']);
  prod.status = 'available';
  prod.lastUpdated = nowIso_();
  updateRowCanonical_(psh, prodRow, HEADERS_PRODUCTS, 'Products', prod);

  var msh = getOrCreateSheet_('Maintenance', HEADERS_MAINT);
  var mRow = findRowByIdFlexible_(msh, p.maintenanceId, ['maintenanceId', 'id']);
  if (mRow < 0) throw new Error('Maintenance not found');

  var maintenance = readMaintenance_();
  var rec = null;
  for (var k = 0; k < maintenance.length; k++) {
    if (String(maintenance[k].maintenanceId) === String(p.maintenanceId) || String(maintenance[k].id) === String(p.maintenanceId)) {
      rec = maintenance[k];
      break;
    }
  }
  if (!rec) throw new Error('Maintenance record not found');

  rec.status = 'closed';
  var costRaw =
    p.repairCost !== undefined && String(p.repairCost).trim() !== ''
      ? p.repairCost
      : p.cost !== undefined && String(p.cost).trim() !== ''
        ? p.cost
        : '';
  rec.cost = Number(costRaw !== '' ? costRaw : 0);
  rec.notes = p.notes || rec.notes || '';
  rec.completedAt = nowIso_();

  updateRowCanonical_(msh, mRow, HEADERS_MAINT, 'Maintenance', rec);

  logActivity_('maintenance_closed', p.productId, prod.productName, 'Maintenance completed', {
    maintenanceId: p.maintenanceId,
    cost: rec.cost,
  });
}

function handleResetDemo_() {
  var pairs = [
    ['Products', HEADERS_PRODUCTS],
    ['Rentals', HEADERS_RENTALS],
    ['Maintenance', HEADERS_MAINT],
    ['ActivityLogs', HEADERS_ACTIVITY],
  ];
  pairs.forEach(function (pair) {
    var sh = getOrCreateSheet_(pair[0], pair[1]);
    if (sh.getLastRow() > 1) {
      sh.deleteRows(2, sh.getLastRow() - 1);
    }
  });
}
