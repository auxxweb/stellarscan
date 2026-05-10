/**
 * Stellar Camera Rentals — Google Apps Script Web App
 * Deploy: Deploy > New deployment > Web app
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * Script property (Project Settings > Script properties):
 *   SPREADSHEET_ID = your Google Sheet ID
 *
 * The sheet must have tabs named: Products, Rentals, Maintenance, ActivityLogs
 * Row 1 on each tab = headers (see HEADER_* constants below).
 */

var SPREADSHEET_ID_KEY = 'SPREADSHEET_ID';

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function getSpreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty(SPREADSHEET_ID_KEY);
  if (!id) {
    throw new Error('Set script property SPREADSHEET_ID to your Google Sheet ID');
  }
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
  return sh;
}

var HEADERS_PRODUCTS = [
  'id', 'qrCode', 'productName', 'category', 'brand', 'modelNumber', 'serialNumber',
  'rentalPrice', 'image', 'status', 'currentCustomer', 'phone', 'expectedReturnDate', 'lastUpdated',
];
var HEADERS_RENTALS = [
  'id', 'productId', 'productName', 'customerName', 'phone', 'advanceAmount', 'expectedReturnDate',
  'finalBill', 'extraCharges', 'notes', 'status', 'rentedAt', 'returnedAt', 'returnKind',
];
var HEADERS_MAINT = [
  'id', 'productId', 'productName', 'givenTo', 'issue', 'estimatedCompletion', 'repairCost',
  'notes', 'status', 'createdAt', 'completedAt',
];
var HEADERS_ACTIVITY = ['id', 'type', 'productId', 'productName', 'message', 'meta', 'createdAt'];

function sheetToObjects_(sh, headers) {
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var rowHeaders = values[0].map(String);
  var out = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var o = {};
    for (var c = 0; c < rowHeaders.length; c++) {
      var key = rowHeaders[c];
      if (!key) continue;
      o[key] = row[c];
    }
    out.push(normalizeRow_(o, headers));
  }
  return out;
}

function normalizeRow_(o, headers) {
  var x = {};
  for (var i = 0; i < headers.length; i++) {
    var h = headers[i];
    var v = o[h];
    if (h === 'rentalPrice' || h === 'advanceAmount' || h === 'finalBill' || h === 'extraCharges' || h === 'repairCost') {
      x[h] = v === '' || v === null ? (h === 'finalBill' || h === 'extraCharges' || h === 'repairCost' ? null : 0) : Number(v);
    } else if (h === 'meta' && typeof v === 'string' && v) {
      try {
        x[h] = JSON.parse(v);
      } catch (e) {
        x[h] = {};
      }
    } else if (v instanceof Date) {
      x[h] = v.toISOString();
    } else {
      x[h] = v === null || v === undefined ? '' : v;
    }
  }
  return x;
}

function readProducts_() {
  var sh = getOrCreateSheet_('Products', HEADERS_PRODUCTS);
  return sheetToObjects_(sh, HEADERS_PRODUCTS);
}

function readRentals_() {
  var sh = getOrCreateSheet_('Rentals', HEADERS_RENTALS);
  return sheetToObjects_(sh, HEADERS_RENTALS);
}

function readMaintenance_() {
  var sh = getOrCreateSheet_('Maintenance', HEADERS_MAINT);
  return sheetToObjects_(sh, HEADERS_MAINT);
}

function readActivity_() {
  var sh = getOrCreateSheet_('ActivityLogs', HEADERS_ACTIVITY);
  return sheetToObjects_(sh, HEADERS_ACTIVITY);
}

function appendRow_(sh, headers, obj) {
  var row = headers.map(function (h) {
    var v = obj[h];
    if (h === 'meta' && typeof v === 'object') return JSON.stringify(v || {});
    return v === null || v === undefined ? '' : v;
  });
  sh.appendRow(row);
}

function findRowById_(sh, id, idCol) {
  idCol = idCol || 1;
  var data = sh.getDataRange().getValues();
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][idCol - 1]) === String(id)) return r + 1;
  }
  return -1;
}

function updateProductRow_(sh, rowIndex, obj, headers) {
  var row = headers.map(function (h) {
    var v = obj[h];
    if (h === 'meta' && typeof v === 'object') return JSON.stringify(v || {});
    return v === null || v === undefined ? '' : v;
  });
  sh.getRange(rowIndex, 1, rowIndex, headers.length).setValues([row]);
}

function nowIso_() {
  return new Date().toISOString();
}

function logActivity_(type, productId, productName, message, meta) {
  var sh = getOrCreateSheet_('ActivityLogs', HEADERS_ACTIVITY);
  appendRow_(sh, HEADERS_ACTIVITY, {
    id: Utilities.getUuid(),
    type: type,
    productId: productId,
    productName: productName,
    message: message,
    meta: meta || {},
    createdAt: nowIso_(),
  });
}

function doGet(e) {
  try {
    var action = (e.parameter && e.parameter.action) || '';
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
    phone: '',
    expectedReturnDate: '',
    lastUpdated: nowIso_(),
  };
  appendRow_(sh, HEADERS_PRODUCTS, row);
  logActivity_('product_added', id, row.productName, 'New product added — ' + row.productName, { category: row.category });
}

function handleRentProduct_(p) {
  var sh = getOrCreateSheet_('Products', HEADERS_PRODUCTS);
  var products = readProducts_();
  var prod = null;
  for (var i = 0; i < products.length; i++) {
    if (String(products[i].id) === String(p.productId)) {
      prod = products[i];
      break;
    }
  }
  if (!prod || prod.status !== 'available') throw new Error('Product not available');

  var rowIndex = findRowById_(sh, p.productId, 1);
  if (rowIndex < 0) throw new Error('Product row not found');

  prod.status = 'rented';
  prod.currentCustomer = p.customerName || '';
  prod.phone = p.phone || '';
  prod.expectedReturnDate = p.expectedReturnDate || '';
  prod.lastUpdated = nowIso_();
  updateProductRow_(sh, rowIndex, prod, HEADERS_PRODUCTS);

  var rentalId = Utilities.getUuid();
  var rsh = getOrCreateSheet_('Rentals', HEADERS_RENTALS);
  appendRow_(rsh, HEADERS_RENTALS, {
    id: rentalId,
    productId: p.productId,
    productName: prod.productName,
    customerName: p.customerName || '',
    phone: p.phone || '',
    advanceAmount: Number(p.advanceAmount || 0),
    expectedReturnDate: p.expectedReturnDate || '',
    finalBill: '',
    extraCharges: '',
    notes: p.notes || '',
    status: 'active',
    rentedAt: nowIso_(),
    returnedAt: '',
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

  var rowIndex = findRowById_(psh, p.productId, 1);
  prod.status = 'available';
  prod.currentCustomer = '';
  prod.phone = '';
  prod.expectedReturnDate = '';
  prod.lastUpdated = nowIso_();
  updateProductRow_(psh, rowIndex, prod, HEADERS_PRODUCTS);

  var rsh = getOrCreateSheet_('Rentals', HEADERS_RENTALS);
  var rdata = rsh.getDataRange().getValues();
  var rh = rdata[0];
  var rentRow = -1;
  for (var r = 1; r < rdata.length; r++) {
    if (String(rdata[r][0]) === String(p.rentalId)) {
      rentRow = r + 1;
      break;
    }
  }
  if (rentRow < 0) throw new Error('Rental not found');

  var rent = {};
  for (var c = 0; c < rh.length; c++) rent[String(rh[c])] = rdata[rentRow - 1][c];
  rent.status = 'closed';
  rent.finalBill = Number(p.finalBill || 0);
  rent.extraCharges = Number(p.extraCharges || 0);
  rent.notes = p.notes || rent.notes || '';
  rent.returnedAt = p.returnedAt || nowIso_();
  rent.returnKind = p.returnKind || 'on_time';
  updateProductRow_(rsh, rentRow, rent, HEADERS_RENTALS);

  logActivity_('rental_closed', p.productId, prod.productName, 'Return completed (' + rent.returnKind + ')', {
    rentalId: p.rentalId,
    finalBill: rent.finalBill,
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

  var rowIndex = findRowById_(psh, p.productId, 1);
  prod.status = 'maintenance';
  prod.lastUpdated = nowIso_();
  updateProductRow_(psh, rowIndex, prod, HEADERS_PRODUCTS);

  var mid = Utilities.getUuid();
  var msh = getOrCreateSheet_('Maintenance', HEADERS_MAINT);
  appendRow_(msh, HEADERS_MAINT, {
    id: mid,
    productId: p.productId,
    productName: prod.productName,
    givenTo: p.givenTo || '',
    issue: p.issue || '',
    estimatedCompletion: p.estimatedCompletion || '',
    repairCost: '',
    notes: p.notes || '',
    status: 'open',
    createdAt: nowIso_(),
    completedAt: '',
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

  var rowIndex = findRowById_(psh, p.productId, 1);
  prod.status = 'available';
  prod.lastUpdated = nowIso_();
  updateProductRow_(psh, rowIndex, prod, HEADERS_PRODUCTS);

  var msh = getOrCreateSheet_('Maintenance', HEADERS_MAINT);
  var mdata = msh.getDataRange().getValues();
  var mh = mdata[0];
  var mRow = -1;
  for (var r = 1; r < mdata.length; r++) {
    if (String(mdata[r][0]) === String(p.maintenanceId)) {
      mRow = r + 1;
      break;
    }
  }
  if (mRow < 0) throw new Error('Maintenance not found');

  var rec = {};
  for (var c = 0; c < mh.length; c++) rec[String(mh[c])] = mdata[mRow - 1][c];
  rec.status = 'closed';
  rec.repairCost = Number(p.repairCost || 0);
  rec.notes = p.notes || rec.notes || '';
  rec.completedAt = nowIso_();
  updateProductRow_(msh, mRow, rec, HEADERS_MAINT);

  logActivity_('maintenance_closed', p.productId, prod.productName, 'Maintenance completed', {
    maintenanceId: p.maintenanceId,
    repairCost: rec.repairCost,
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
