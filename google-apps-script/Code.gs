/**
 * StellarScan web app — compatible with the React client (googleScriptApi.ts).
 * Sheet tabs: Products, Rentals, Maintenance, ActivityLogs
 *
 * Spreadsheet: set script property SPREADSHEET_ID to the Sheet ID, OR deploy as
 * "Sheets add-on / container-bound" so getActiveSpreadsheet() is the inventory file.
 */

var SHEET_PRODUCTS = 'Products';
var SHEET_RENTALS = 'Rentals';
var SHEET_MAINTENANCE = 'Maintenance';
var SHEET_ACTIVITY = 'ActivityLogs';
var SPREADSHEET_ID_KEY = 'SPREADSHEET_ID';

/* =====================================================
   SPREADSHEET + JSON
===================================================== */

function getSpreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty(SPREADSHEET_ID_KEY);
  if (id && String(id).trim()) return SpreadsheetApp.openById(String(id).trim());
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error(
      'No spreadsheet: set Script property SPREADSHEET_ID to your Sheet ID, or deploy this script from the spreadsheet (Extensions → Apps Script).',
    );
  }
  return ss;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function dashboardSuccessPayload_() {
  return {
    success: true,
    products: readProducts_(),
    rentals: readRentals_(),
    maintenance: readMaintenance_(),
    activityLogs: readActivityLogs_(),
  };
}

/* =====================================================
   POST body merge (client sends URL-encoded body)
===================================================== */

function parseUrlEncodedForm_(raw) {
  var out = {};
  var pairs = String(raw == null ? '' : raw).split('&');
  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i];
    if (!pair && pair !== '0') continue;
    var eq = pair.indexOf('=');
    var encKey = eq === -1 ? pair : pair.substring(0, eq);
    var encVal = eq === -1 ? '' : pair.substring(eq + 1);
    var key;
    var val;
    try {
      key = decodeURIComponent(encKey.replace(/\+/g, ' '));
      val = decodeURIComponent(encVal.replace(/\+/g, ' '));
    } catch (ex) {
      continue;
    }
    if (key) out[key] = val;
  }
  return out;
}

function mergeRequestParams_(e) {
  var out = {};
  if (!e) return out;
  var k;
  if (e.parameter) {
    for (k in e.parameter) {
      if (Object.prototype.hasOwnProperty.call(e.parameter, k)) out[k] = e.parameter[k];
    }
  }
  var raw = e.postData && e.postData.contents;
  var ctype = e.postData && e.postData.type ? String(e.postData.type).toLowerCase() : '';
  if (raw != null && String(raw).trim()) {
    if (ctype.indexOf('application/json') >= 0) {
      try {
        var jobj = JSON.parse(String(raw));
        if (jobj && typeof jobj === 'object' && !Array.isArray(jobj)) {
          for (var kj in jobj) {
            if (!Object.prototype.hasOwnProperty.call(jobj, kj)) continue;
            var vj = jobj[kj];
            if (vj == null) out[kj] = '';
            else if (typeof vj === 'object') out[kj] = JSON.stringify(vj);
            else out[kj] = String(vj);
          }
        }
      } catch (jx) {}
    } else {
      var parsed = parseUrlEncodedForm_(String(raw));
      for (k in parsed) {
        if (Object.prototype.hasOwnProperty.call(parsed, k)) out[k] = parsed[k];
      }
    }
  }
  return out;
}

/* =====================================================
   Sheet → row objects (header row = keys)
===================================================== */

function getSheetData_(sheet) {
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0].map(function (x) {
    return String(x || '').trim();
  });
  var out = [];
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var o = {};
    for (var c = 0; c < headers.length; c++) {
      if (!headers[c]) continue;
      o[headers[c]] = row[c];
    }
    out.push(o);
  }
  return out;
}

function readProducts_() {
  return getSheetData_(getSpreadsheet_().getSheetByName(SHEET_PRODUCTS));
}

function readRentals_() {
  return getSheetData_(getSpreadsheet_().getSheetByName(SHEET_RENTALS));
}

function readMaintenance_() {
  return getSheetData_(getSpreadsheet_().getSheetByName(SHEET_MAINTENANCE));
}

function readActivityLogs_() {
  return getSheetData_(getSpreadsheet_().getSheetByName(SHEET_ACTIVITY));
}

/* =====================================================
   Product helpers (fixed columns — same as your script)
   Col A=0 id, …, col J=9 status, K=10 customer, L=11 expected, M=12 lastUpdated
===================================================== */

function nk_(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

function isRowAvailable_(statusCell) {
  var s = nk_(statusCell);
  if (!s) return true;
  return (
    s === 'available' ||
    s === 'avail' ||
    s === 'free' ||
    s === 'instock' ||
    s === 'in_stock' ||
    s === 'ready'
  );
}

function findProductRowIndex_(rows, productId) {
  var pid = String(productId).trim();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === pid) return i;
  }
  return -1;
}

/** StellarScan sends JSON array, base64 JSON, comma list, or single productId. */
function parseProductIdsForRent_(p) {
  p = p || {};
  var rawIds = p.productIds;
  if (rawIds != null && typeof rawIds !== 'string') {
    if (Array.isArray(rawIds)) {
      p.productIds = rawIds
        .map(function (x) {
          return String(x || '').trim();
        })
        .filter(Boolean)
        .join(',');
    } else {
      p.productIds = String(rawIds);
    }
  }
  var b64 = p.productIdsB64;
  if (b64 && String(b64).trim()) {
    try {
      var jsonStr = Utilities.newBlob(Utilities.base64Decode(b64)).getDataAsString();
      var arrB = JSON.parse(jsonStr);
      if (Array.isArray(arrB)) {
        return arrB
          .map(function (x) {
            return String(x || '').trim();
          })
          .filter(Boolean);
      }
    } catch (e1) {}
  }
  var j = p.productIdsJson;
  if (j && String(j).trim()) {
    try {
      var arr = JSON.parse(j);
      if (Array.isArray(arr)) {
        return arr
          .map(function (x) {
            return String(x || '').trim();
          })
          .filter(Boolean);
      }
    } catch (e2) {}
  }
  var s = p.productIds;
  if (s && String(s).trim()) {
    return String(s)
      .split(',')
      .map(function (x) {
        return x.trim();
      })
      .filter(Boolean);
  }
  if (p.productId) return [String(p.productId).trim()];
  return [];
}

/** Optional productNames: JSON array (productNamesJson), comma CSV, or derive from sheet col C. */
function resolveProductNames_(productRows, ids, explicitCsv, explicitJson) {
  var fromParam = [];
  var jstr = explicitJson == null || explicitJson === undefined ? '' : String(explicitJson).trim();
  if (jstr && jstr.charAt(0) === '[') {
    try {
      var jarr = JSON.parse(jstr);
      if (Array.isArray(jarr)) {
        fromParam = jarr.map(function (x) {
          return String(x || '').trim();
        });
      }
    } catch (je) {}
  }
  if (fromParam.length === 0) {
    var csv = explicitCsv == null || explicitCsv === undefined ? '' : String(explicitCsv);
    if (csv.trim()) {
      fromParam = csv.split(',').map(function (x) {
        return x.trim();
      });
    }
  }
  var out = [];
  for (var p = 0; p < ids.length; p++) {
    if (fromParam[p]) {
      out.push(fromParam[p]);
      continue;
    }
    var ix = findProductRowIndex_(productRows, ids[p]);
    var name = ix > 0 ? String(productRows[ix][2] || '').trim() : '';
    out.push(name || String(ids[p]));
  }
  return out;
}

/* =====================================================
   GET
===================================================== */

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || '';
    if (!action) {
      return jsonResponse({ success: false, message: 'No action provided' });
    }

    if (action === 'getDashboard') {
      return jsonResponse(dashboardSuccessPayload_());
    }

    if (action === 'getProducts') {
      return jsonResponse({ success: true, products: readProducts_() });
    }

    if (action === 'getRentals') {
      return jsonResponse({ success: true, rentals: readRentals_() });
    }

    if (action === 'getMaintenance') {
      return jsonResponse({ success: true, maintenance: readMaintenance_() });
    }

    if (action === 'getActivities') {
      return jsonResponse({ success: true, activityLogs: readActivityLogs_() });
    }

    return jsonResponse({ success: false, message: 'Invalid GET action' });
  } catch (err) {
    var em = err && err.message ? String(err.message) : String(err);
    return jsonResponse({ success: false, message: em || 'GET error' });
  }
}

/* =====================================================
   POST
===================================================== */

function doPost(e) {
  try {
    var p = mergeRequestParams_(e || {});
    var action = p.action;
    if (!action) {
      return jsonResponse({ success: false, message: 'Missing action' });
    }

    if (action === 'addProduct') {
      return addProduct_(p);
    }
    if (action === 'rentProduct') {
      return rentProduct_(p);
    }
    if (action === 'returnProduct') {
      return returnProduct_(p);
    }
    if (action === 'markMaintenance') {
      return markMaintenance_(p);
    }
    if (action === 'completeMaintenance') {
      return completeMaintenance_(p);
    }
    if (action === 'resetDemo') {
      return jsonResponse({ success: false, message: 'resetDemo is not enabled on this deployment.' });
    }

    return jsonResponse({ success: false, message: 'Invalid POST action' });
  } catch (err) {
    var em = err && err.message ? String(err.message) : String(err);
    return jsonResponse({ success: false, message: em || 'POST error' });
  }
}

/* =====================================================
   PRODUCTS
===================================================== */

function addProduct_(data) {
  var sheet = getSpreadsheet_().getSheetByName(SHEET_PRODUCTS);
  if (!sheet) throw new Error('Missing sheet: ' + SHEET_PRODUCTS);

  var id = (data.id && String(data.id).trim()) || Utilities.getUuid();
  var qr =
    (data.qrCode && String(data.qrCode).trim()) ||
    'STELLAR-' + String(id).replace(/-/g, '').substring(0, 10).toUpperCase();

  sheet.appendRow([
    id,
    qr,
    data.productName || '',
    data.category || '',
    data.brand || '',
    data.modelNumber || '',
    data.serialNumber || '',
    Number(data.rentalPrice || 0),
    data.image || '',
    'Available',
    '',
    '',
    new Date(),
  ]);

  addActivity_(id, 'product_added', (data.productName || 'Product') + ' added');

  var out = dashboardSuccessPayload_();
  out.message = 'Product added successfully';
  return jsonResponse(out);
}

/* =====================================================
   RENT (multi-product) — StellarScan–compatible
===================================================== */

function rentProduct_(data) {
  data = data || {};
  var productSheet = getSpreadsheet_().getSheetByName(SHEET_PRODUCTS);
  var rentalSheet = getSpreadsheet_().getSheetByName(SHEET_RENTALS);
  if (!productSheet || !rentalSheet) throw new Error('Missing Products or Rentals sheet');

  var ids = parseProductIdsForRent_(data);
  if (ids.length === 0) throw new Error('No products to rent (send productIds, productIdsJson, or productIdsB64)');

  var rentalGroupId =
    (data.rentalGroupId && String(data.rentalGroupId).trim()) ||
    (data.groupId && String(data.groupId).trim()) ||
    'RENT-' + Date.now();

  var productRows = productSheet.getDataRange().getValues();
  var productNames = resolveProductNames_(
    productRows,
    ids,
    data.productNames || '',
    data.productNamesJson || '',
  );

  for (var p = 0; p < ids.length; p++) {
    var productId = ids[p];
    var ix = findProductRowIndex_(productRows, productId);
    if (ix < 0) throw new Error('Product not found: ' + productId);
    if (!isRowAvailable_(productRows[ix][9])) throw new Error('Product not available: ' + productId);
  }

  var due = data.expectedReturn || data.expectedReturnDate || '';

  for (var t = 0; t < ids.length; t++) {
    var pid = ids[t];
    var pnm = productNames[t] || pid;

    for (var i = 1; i < productRows.length; i++) {
      if (String(productRows[i][0]).trim() !== String(pid).trim()) continue;

      productSheet.getRange(i + 1, 10).setValue('Rented');
      productSheet.getRange(i + 1, 11).setValue(data.customerName || '');
      productSheet.getRange(i + 1, 12).setValue(due);
      productSheet.getRange(i + 1, 13).setValue(new Date());
      break;
    }

    rentalSheet.appendRow([
      rentalGroupId,
      pid,
      pnm,
      data.customerName || '',
      data.phone || '',
      new Date(),
      due,
      '',
      '',
      'Active',
      ids.length,
    ]);

    addActivity_(pid, 'rental_started', 'Rented to ' + (data.customerName || ''));
  }

  var out = dashboardSuccessPayload_();
  out.rentalId = rentalGroupId;
  out.totalProducts = ids.length;
  out.message = 'Products rented successfully';
  return jsonResponse(out);
}

/* =====================================================
   RETURN
===================================================== */

function isOpenRentalRowStatus_(cell) {
  var st = nk_(cell);
  return (
    st === 'active' ||
    st === 'open' ||
    st === 'partialreturned' ||
    st === 'partial_returned' ||
    st === 'rented'
  );
}

function returnProduct_(data) {
  var productSheet = getSpreadsheet_().getSheetByName(SHEET_PRODUCTS);
  var rentalSheet = getSpreadsheet_().getSheetByName(SHEET_RENTALS);
  if (!productSheet || !rentalSheet) throw new Error('Missing Products or Rentals sheet');

  var productId = String(data.productId || '').trim();
  if (!productId) throw new Error('Missing productId');

  var matchLine = String(data.rentalLineId || data.lineId || data.rentalId || '').trim();
  var grp = '';
  var prodFromComposite = '';
  var sep = matchLine.indexOf('::');
  if (sep > 0) {
    grp = matchLine.substring(0, sep).trim();
    prodFromComposite = matchLine.substring(sep + 2).trim();
  }
  var matchPid = prodFromComposite ? prodFromComposite : productId;

  var productRows = productSheet.getDataRange().getValues();
  for (var i = 1; i < productRows.length; i++) {
    if (String(productRows[i][0]).trim() === productId) {
      productSheet.getRange(i + 1, 10).setValue('Available');
      productSheet.getRange(i + 1, 11).setValue('');
      productSheet.getRange(i + 1, 12).setValue('');
      productSheet.getRange(i + 1, 13).setValue(new Date());
      break;
    }
  }

  var rentalRows = rentalSheet.getDataRange().getValues();
  var rentalId = '';
  var hitRow = -1;

  for (var j = 1; j < rentalRows.length; j++) {
    var r0 = String(rentalRows[j][0] == null ? '' : rentalRows[j][0]).trim();
    var r1 = String(rentalRows[j][1] == null ? '' : rentalRows[j][1]).trim();
    if (r1 !== matchPid) continue;
    if (grp && r0 !== grp) continue;
    if (!isOpenRentalRowStatus_(rentalRows[j][9])) continue;
    rentalId = r0;
    hitRow = j + 1;
    rentalSheet.getRange(hitRow, 8).setValue(new Date());
    rentalSheet.getRange(hitRow, 9).setValue(data.billAmount || data.finalBill || 0);
    rentalSheet.getRange(hitRow, 10).setValue('Returned');
    break;
  }

  if (hitRow < 0) throw new Error('Rental line not found for return');

  var updatedRows = rentalSheet.getDataRange().getValues();
  var remainingProducts = 0;
  for (var u = 1; u < updatedRows.length; u++) {
    if (String(updatedRows[u][0]).trim() !== rentalId) continue;
    var ust = nk_(updatedRows[u][9]);
    if (ust === 'active' || ust === 'open' || ust === 'partialreturned' || ust === 'partial_returned' || ust === 'rented') {
      remainingProducts++;
    }
  }

  var overallStatus = remainingProducts === 0 ? 'Completed' : 'Partial Returned';
  for (var v = 1; v < updatedRows.length; v++) {
    if (String(updatedRows[v][0]).trim() !== rentalId) continue;
    var vst = nk_(updatedRows[v][9]);
    if (vst !== 'returned' && vst !== 'closed' && vst !== 'completed') {
      rentalSheet.getRange(v + 1, 10).setValue(overallStatus);
    }
  }

  addActivity_(productId, 'rental_closed', 'Product returned');

  var out = dashboardSuccessPayload_();
  out.rentalId = rentalId;
  out.remainingProducts = remainingProducts;
  out.status = overallStatus;
  out.message = 'Product returned successfully';
  return jsonResponse(out);
}

/* =====================================================
   MAINTENANCE
===================================================== */

function markMaintenance_(data) {
  var productSheet = getSpreadsheet_().getSheetByName(SHEET_PRODUCTS);
  var maintenanceSheet = getSpreadsheet_().getSheetByName(SHEET_MAINTENANCE);
  if (!productSheet || !maintenanceSheet) throw new Error('Missing sheet');

  var rows = productSheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(data.productId).trim()) {
      productSheet.getRange(i + 1, 10).setValue('Maintenance');
      productSheet.getRange(i + 1, 13).setValue(new Date());
      break;
    }
  }

  var issue = data.issue || data.description || '';
  var given = data.givenTo || data.vendor || '';
  var eta = data.expectedCompletion || data.estimatedCompletion || '';

  maintenanceSheet.appendRow([
    'MAIN-' + Date.now(),
    data.productId,
    given,
    issue,
    new Date(),
    eta,
    '',
    '',
    'Active',
  ]);

  addActivity_(data.productId, 'maintenance_started', 'Maintenance started');

  var out = dashboardSuccessPayload_();
  out.message = 'Maintenance started';
  return jsonResponse(out);
}

function completeMaintenance_(data) {
  var productSheet = getSpreadsheet_().getSheetByName(SHEET_PRODUCTS);
  var maintenanceSheet = getSpreadsheet_().getSheetByName(SHEET_MAINTENANCE);
  if (!productSheet || !maintenanceSheet) throw new Error('Missing sheet');

  var rows = productSheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(data.productId).trim()) {
      productSheet.getRange(i + 1, 10).setValue('Available');
      productSheet.getRange(i + 1, 13).setValue(new Date());
      break;
    }
  }

  var maintenanceRows = maintenanceSheet.getDataRange().getValues();
  for (var j = 1; j < maintenanceRows.length; j++) {
    if (String(maintenanceRows[j][1]).trim() === String(data.productId).trim() && nk_(maintenanceRows[j][8]) === 'active') {
      maintenanceSheet.getRange(j + 1, 7).setValue(new Date());
      maintenanceSheet.getRange(j + 1, 8).setValue(data.cost || data.repairCost || 0);
      maintenanceSheet.getRange(j + 1, 9).setValue('Completed');
      break;
    }
  }

  addActivity_(data.productId, 'maintenance_closed', 'Maintenance completed');

  var out = dashboardSuccessPayload_();
  out.message = 'Maintenance completed';
  return jsonResponse(out);
}

/* =====================================================
   ACTIVITY
===================================================== */

function addActivity_(productId, action, description) {
  var sheet = getSpreadsheet_().getSheetByName(SHEET_ACTIVITY);
  if (!sheet) return;
  sheet.appendRow(['LOG-' + Date.now(), productId, action, description, new Date()]);
}
