const PDFDocument = require("pdfkit");
const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
var mssql = require('../../function/mssql');
var mongodb = require('../../function/mongodb');

// รหัสฟอร์มมุมล่างขวาของทุกหน้ารายงาน
const QO_FORM_CODE = 'FR-CTC-04/006-01-01/09/26';

router.post("/QO/CreateReport", async (req, res) => {
  console.log("QO/CreateReport");
  try {
    let reportItems = [];
    if (req.body.dataRow) {
      const dataRow = typeof req.body.dataRow === 'string'
        ? JSON.parse(req.body.dataRow || '[]')
        : req.body.dataRow;
      reportItems = Array.isArray(dataRow) ? dataRow : Object.values(dataRow).flat();
    } else if (req.body.ReqNo) {
      const reqNo = (req.body.ReqNo || '').toString().trim();
      const sampleCode = (req.body.SampleCode || '').toString().trim();
      const whereSample = sampleCode ? `AND [SampleCode] = N'${qoEsc(sampleCode)}'` : '';
      const db = await mssql.qurey(`
        SELECT *
        FROM [QO].[dbo].[Request]
        WHERE [ReqNo] = N'${qoEsc(reqNo)}'
          ${whereSample}
          AND ISNULL(UPPER(LTRIM(RTRIM(CONVERT(NVARCHAR(4000), [RequestStatus])))), N'') NOT IN (N'REJECT', N'CANCEL')
        ORDER BY [SampleNo], [ItemNo];
      `);
      reportItems = db.recordsets?.[0] || [];
    }

    reportItems = (reportItems || []).filter(qoIsReportItemAllowed);

    const sampleFilter = (req.body.SampleCode || '').toString().trim();
    if (sampleFilter) {
      reportItems = reportItems.filter((item) => (item.SampleCode || '').toString() === sampleFilter);
    }

    if (!reportItems || reportItems.length === 0) {
      return res.status(400).json({ message: "No report data" });
    }

    const groups = qoGroupBy(reportItems, (item) => (item.SampleCode || item.ReqNo || '').toString());
    const first = reportItems[0];
    const reportFileBase = qoResolveReportFileBase(req.body, reportItems, first);
    const reportPath = qoBuildReportPath(first, reportFileBase);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });

    const doc = new PDFDocument({ margin: 18, size: "A4", layout: "landscape" });
    const writeStream = fs.createWriteStream(reportPath);
    doc.pipe(writeStream);

    qoRegisterFonts(doc);

    const signatures = await qoLoadSignatures(reportItems);

    let firstPage = true;
    for (const sampleRows of groups.values()) {
      if (!firstPage) doc.addPage({ size: "A4", layout: "landscape", margin: 18 });
      firstPage = false;
      await qoDrawResultPage(doc, sampleRows);

      doc.addPage({ size: "A4", layout: "landscape", margin: 18 });
      qoDrawGraphPage(doc, sampleRows, signatures);
    }

    doc.end();
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    return res.status(200).send(fs.readFileSync(reportPath).toString('base64'));
  } catch (error) {
    console.error("QO CreateReport Error:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
});

// ตารางที่อนุญาตให้ preview ได้ (กันการยิงชื่อตารางแปลกๆ เข้ามาใน query)
const QO_PREVIEW_TABLES = ['MasterPattern'];

// Preview report จาก master ที่บันทึกไว้แล้ว: ใช้ layout เดียวกับ QO/CreateReport
// แต่ไม่ใส่ค่าผลวิเคราะห์ เพื่อให้เห็นว่าแก้ master แล้ว report จะออกมาหน้าตาแบบไหน
router.post("/QO/PreviewMasterReport", async (req, res) => {
  console.log("QO/PreviewMasterReport");
  try {
    const custShort = (req.body.CustShort || '').toString().trim();
    if (!custShort) {
      return res.status(400).send('ERROR: ไม่พบ CustShort ของลูกค้า');
    }

    const requestedTable = (req.body.masterType || '').toString().trim();
    const tableName = QO_PREVIEW_TABLES.includes(requestedTable) ? requestedTable : QO_PREVIEW_TABLES[0];

    const db = await mssql.qurey(`
      SELECT *
      FROM [QO].[dbo].[${tableName}]
      WHERE [CustShort] = N'${qoEsc(custShort)}'
      ORDER BY [SampleNo], TRY_CONVERT(INT, [ItemNo]), [ItemNo];
    `);
    const masterRows = db.recordsets?.[0] || [];
    if (masterRows.length === 0) {
      return res.status(200).send('NODATA');
    }

    const previewRows = qoBuildPreviewRows(masterRows);
    const groups = qoGroupBy(previewRows, (item) => item.SampleCode);

    const doc = new PDFDocument({ margin: 18, size: "A4", layout: "landscape" });
    qoRegisterFonts(doc);

    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    const finished = new Promise((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);
    });

    let firstPage = true;
    for (const sampleRows of groups.values()) {
      if (!firstPage) doc.addPage({ size: "A4", layout: "landscape", margin: 18 });
      firstPage = false;
      await qoDrawResultPage(doc, sampleRows, { preview: true });

      doc.addPage({ size: "A4", layout: "landscape", margin: 18 });
      qoDrawGraphPage(doc, sampleRows, new Map(), { preview: true });
    }

    doc.end();
    await finished;

    return res.status(200).send(Buffer.concat(chunks).toString('base64'));
  } catch (error) {
    console.error("QO PreviewMasterReport Error:", error);
    return res.status(500).send(`ERROR: ${error.message || 'Server error'}`);
  }
});

// แปลงแถว master ให้อยู่ในรูปเดียวกับแถว Request ที่ report ใช้ โดยเว้นค่าผลวิเคราะห์
// และค่าที่ยังไม่เกิดจริง (วันที่ / ผู้ลงนาม / กราฟ) ไว้ว่างทั้งหมด
function qoBuildPreviewRows(masterRows) {
  return (masterRows || []).map((row) => {
    const sampleNo = String(row.SampleNo ?? '').trim();
    return {
      ...row,
      ReqNo: 'PREVIEW',
      SampleCode: `PREVIEW-${sampleNo || '01'}`,
      SamplingDate: '',
      SendDate: '',
      ReceivedDate: '',
      AnalysisDue: '',
      ReportApproveDate: '',
      Result: '',
      ResultApprove: '',
      RequestStatus: 'PREVIEW',
      SampleStatus: 'PREVIEW',
      ItemStatus: 'PREVIEW',
      UserAnalysis: '',
      ItemApprover: '',
      ReportApprover: '',
      Picture: '',
      Report_Graph: '',
    };
  });
}

function qoRegisterFonts(doc) {
  const fontNormal = path.join(__dirname, '../../assets/fonts/times.ttf');
  const fontBold = path.join(__dirname, '../../assets/fonts/timesbd.ttf');
  const fontThai = path.join(__dirname, '../../assets/fonts/THSarabunNew.ttf');
  const fontThaiBold = path.join(__dirname, '../../assets/fonts/THSarabunNew Bold.ttf');
  if (fs.existsSync(fontNormal)) doc.registerFont('QO-Times', fontNormal);
  if (fs.existsSync(fontBold)) doc.registerFont('QO-Times-Bold', fontBold);
  if (fs.existsSync(fontThai)) doc.registerFont('QO-Thai', fontThai);
  if (fs.existsSync(fontThaiBold)) doc.registerFont('QO-Thai-Bold', fontThaiBold);
}

function qoIsReportItemAllowed(item) {
  const status = String(item?.RequestStatus || '').trim().toUpperCase();
  return status !== 'REJECT' && status !== 'CANCEL';
}

function parseDMYFull(str) {
  if (!str) return null;
  const [datePart, timePart] = str.split(' ');
  const [d, m, y] = datePart.split('-');
  const [hh, mm, ss] = (timePart || '00:00:00').split(':');
  return new Date(`20${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${hh}:${mm}:${ss}`);
}

function qoEsc(value) {
  return String(value ?? '').replace(/'/g, "''");
}

function qoSafePathSegment(value) {
  return String(value || 'unknown')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\.+$/g, '')
    .trim() || 'unknown';
}

function qoGroupBy(items, keyOf) {
  const groups = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
}

function qoResolveReportFileBase(body, reportItems, first) {
  const explicitName = (body.ReportFileName || body.FileName || '').toString().trim();
  if (explicitName) return explicitName;

  const mode = (body.ReportMode || '').toString().trim().toUpperCase();
  const requestSampleCode = (body.SampleCode || '').toString().trim();
  if (mode === 'SAMPLECODE') return requestSampleCode || first.SampleCode || first.ReqNo || 'QO-Report';
  if (mode === 'REQNO') return first.ReqNo || requestSampleCode || first.SampleCode || 'QO-Report';

  if (requestSampleCode) return requestSampleCode;

  const sampleCodes = new Set(
    (reportItems || [])
      .map((item) => (item.SampleCode || '').toString().trim())
      .filter(Boolean)
  );

  return sampleCodes.size === 1
    ? [...sampleCodes][0]
    : first.ReqNo || first.SampleCode || 'QO-Report';
}

function qoBuildReportPath(first, fileBase) {
  const date = qoParseDate(first.ReportApproveDate || first.SamplingDate || new Date());
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const base = 'C:\\AutomationProject\\QO\\Report';
  const folder = path.join(
    base,
    qoSafePathSegment(first.CustFull || first.CustShort || 'Customer'),
    String(date.getFullYear()),
    monthNames[date.getMonth()]
  );
  const fileName = `${qoSafePathSegment(fileBase || first.ReqNo || 'QO-Report')}.pdf`;
  return path.join(folder, fileName);
}

function qoFont(doc, bold = false) {
  const font = bold ? 'QO-Times-Bold' : 'QO-Times';
  try {
    doc.font(font);
  } catch (_) {
    doc.font(bold ? 'Times-Bold' : 'Times-Roman');
  }
  return doc;
}

function qoThaiFont(doc, bold = false) {
  const font = bold ? 'QO-Thai-Bold' : 'QO-Thai';
  try {
    doc.font(font);
  } catch (_) {
    qoFont(doc, bold);
  }
  return doc;
}

function qoParseDate(value) {
  if (value instanceof Date) return value;
  const raw = String(value || '').trim();
  if (!raw) return new Date();
  const datePart = raw.split(' ')[0];
  const parts = datePart.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) return new Date(`${parts[0]}-${parts[1]}-${parts[2]}T00:00:00`);
    const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
    return new Date(`${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T00:00:00`);
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function qoParseDateTime(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const [datePart, timePart = '00:00:00'] = raw.split(' ');
  const parts = datePart.split('-');
  if (parts.length === 3) {
    const year = parts[0].length === 4 ? parts[0] : (parts[2].length === 2 ? `20${parts[2]}` : parts[2]);
    const month = parts[0].length === 4 ? parts[1] : parts[1];
    const day = parts[0].length === 4 ? parts[2] : parts[0];
    const parsed = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timePart}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function qoDateText(value) {
  if (String(value || '').trim() === '') return '';
  const d = qoParseDate(value);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function qoOrdinalDate(value) {
  const d = qoParseDate(value);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const day = d.getDate();
  const suffix = [11, 12, 13].includes(day) ? 'th' : day % 10 === 1 ? 'st' : day % 10 === 2 ? 'nd' : day % 10 === 3 ? 'rd' : 'th';
  return `${months[d.getMonth()]} ${day}${suffix}, ${d.getFullYear()}`;
}

function qoOrdinalDateNoYear(value) {
  const d = qoParseDate(value);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const day = d.getDate();
  const suffix = [11, 12, 13].includes(day) ? 'th' : day % 10 === 1 ? 'st' : day % 10 === 2 ? 'nd' : day % 10 === 3 ? 'rd' : 'th';
  return `${months[d.getMonth()]} ${day}${suffix}`;
}

function qoLatestDate(items, field) {
  const dates = items.map((item) => qoParseDateTime(item[field])).filter(Boolean);
  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map((date) => date.getTime())));
}

function qoEarliestDate(items, field) {
  const dates = items.map((item) => qoParseDateTime(item[field])).filter(Boolean);
  if (dates.length === 0) return null;
  return new Date(Math.min(...dates.map((date) => date.getTime())));
}

function qoTestingPeriod(items) {
  const start = qoEarliestDate(items, 'ReceivedDate');
  const end = qoLatestDate(items, 'ReportApproveDate');
  if (!start || !end) return '';
  if (start.toDateString() === end.toDateString()) return qoOrdinalDate(start);
  if (start.getFullYear() === end.getFullYear()) {
    return `${qoOrdinalDateNoYear(start)} - ${qoOrdinalDate(end)}`;
  }
  return `${qoOrdinalDate(start)} - ${qoOrdinalDate(end)}`;
}

function qoHeaderValue(items, field) {
  return (items.find((item) => String(item[field] || '').trim())?.[field] || '').toString();
}

function qoFormatRange(min, max) {
  const a = String(min || '').trim();
  const b = String(max || '').trim();
  const clean = (v) => (!v || v === '-' ? '' : v);
  const ca = clean(a);
  const cb = clean(b);
  if (ca && cb) return `${ca} - ${cb}`;
  // มีค่าเดียว: ใส่เครื่องหมายนำหน้า (ถ้ายังไม่มีเครื่องหมายอยู่แล้ว)
  // ยกเว้นคำว่า "Actual" ซึ่งเป็นข้อความล้วน ไม่ต้องใส่เครื่องหมายใดๆ
  const hasSymbol = (v) => /^[<>≤≥]/.test(v);
  const isActual = (v) => v.toLowerCase() === 'actual';
  if (ca) return hasSymbol(ca) || isActual(ca) ? ca : `≥ ${ca}`;
  if (cb) return hasSymbol(cb) || isActual(cb) ? cb : `≤ ${cb}`;
  return '-';
}

// นับจำนวน * ที่นำหน้า Remark ของ item นั้นๆ เช่น "* Water Content: ..." -> "*"
// และ "** Water Content: ..." -> "**" เพื่อเอาไปนำหน้าค่าในคอลัมน์ Control Range
function qoRemarkMarker(item) {
  const remark = String(item?.Remark || '').trim();
  const match = remark.match(/^\*+/);
  return match ? match[0] : '';
}

function qoControlRangeText(item) {
  const range = qoFormatRange(item?.Min, item?.Max);
  if (!range || range === '-') return range;
  return `${qoRemarkMarker(item)}${range}`;
}

function qoResultText(item) {
  const value = String(item?.ResultApprove || '').trim();
  return value || 'wait';
}

function qoNumber(value) {
  const text = String(value || '').replace(/,/g, '').trim();
  const match = text.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  return Number(match[0]);
}

function qoLimit(value) {
  const text = String(value || '').trim();
  if (!text || text === '-') return null;
  const num = qoNumber(text);
  if (num === null) return null;
  if (/[<≤]/.test(text)) return { type: 'max', value: num };
  if (/[>≥]/.test(text)) return { type: 'min', value: num };
  if (/min/i.test(text)) return { type: 'min', value: num };
  if (/max/i.test(text)) return { type: 'max', value: num };
  return { type: 'plain', value: num };
}

// หาขอบล่าง/ขอบบนของ Control Range: ถ้ามีเครื่องหมาย (< ≤ > ≥ / min / max) ให้ยึดตามเครื่องหมาย
// ถ้าเป็นตัวเลขเปล่าๆ ให้ยึดตามคอลัมน์ คือ Min = ขอบล่าง, Max = ขอบบน (ตรงกับที่แสดงใน qoFormatRange)
function qoControlBounds(item) {
  const bounds = {};
  const assign = (raw, plainRole) => {
    const limit = qoLimit(raw);
    if (!limit) return;
    const role = limit.type === 'plain' ? plainRole : (limit.type === 'min' ? 'lower' : 'upper');
    if (role === 'lower') {
      bounds.lower = bounds.lower === undefined ? limit.value : Math.max(bounds.lower, limit.value);
    } else {
      bounds.upper = bounds.upper === undefined ? limit.value : Math.min(bounds.upper, limit.value);
    }
  };
  assign(item?.Min, 'lower');
  assign(item?.Max, 'upper');
  return bounds;
}

// เช็คว่าค่าผลตรวจอยู่นอก Control Range หรือไม่ (ใช้ทำตัวหนังสือสีแดง)
// ค่าที่ไม่ใช่ตัวเลข เช่น "wait" หรือช่องว่าง ถือว่าไม่นอก spec
function qoIsOutOfSpec(item, value) {
  const result = qoNumber(value);
  if (result === null) return false;
  const { lower, upper } = qoControlBounds(item);
  if (lower !== undefined && result < lower) return true;
  if (upper !== undefined && result > upper) return true;
  return false;
}

function qoBuildComments(items) {
  const comments = [];
  for (const item of items) {
    const result = qoNumber(item.ResultApprove);
    if (result === null) continue;
    const { lower, upper } = qoControlBounds(item);
    if (lower !== undefined && result < lower) {
      comments.push(`${item.ItemName} is lower than Control Range`);
    } else if (upper !== undefined && result > upper) {
      comments.push(`${item.ItemName} is higher than Control Range`);
    }
  }
  return comments.length ? [...new Set(comments)].join(', ') : '-';
}

async function qoLoadHistoryForSample(sampleRows, maxColumns) {
  if (maxColumns <= 1) {
    return {
      samples: [{
        SampleCode: sampleRows[0].SampleCode,
        SamplingDate: sampleRows[0].SamplingDate,
        current: true,
      }],
      values: new Map(sampleRows.map((row) => [`${row.SampleCode}|${row.ItemName}`, qoResultText(row)])),
    };
  }

  const first = sampleRows[0];
  const itemNames = [...new Set(sampleRows.map((row) => String(row.ItemName || '').trim()).filter(Boolean))];
  const values = new Map(sampleRows.map((row) => [`${row.SampleCode}|${row.ItemName}`, qoResultText(row)]));
  const sampleNo = String(first.SampleNo || '').trim();
  const sampleNoFilter = sampleNo
    ? `AND CONVERT(NVARCHAR(4000), [SampleNo]) = N'${qoEsc(sampleNo)}'`
    : '';

  if (itemNames.length === 0) {
    return { samples: [], values };
  }

  const db = await mssql.qurey(`
    SELECT TOP 300
      [SampleCode],
      [ItemName],
      [ResultApprove],
      COALESCE(CONVERT(NVARCHAR(10), TRY_CONVERT(DATE, [SamplingDate]), 23), CONVERT(NVARCHAR(4000), [SamplingDate])) AS [SamplingDate]
    FROM [QO].[dbo].[Request]
    WHERE [CustFull] = N'${qoEsc(first.CustFull)}'
      ${sampleNoFilter}
      AND UPPER(LTRIM(RTRIM(CONVERT(NVARCHAR(4000), [RequestStatus])))) = N'COMPLETE'
      AND [ItemName] IN (${itemNames.map((name) => `N'${qoEsc(name)}'`).join(', ')})
      AND NULLIF(LTRIM(RTRIM(CONVERT(NVARCHAR(4000), [SamplingDate]))), N'') IS NOT NULL
    ORDER BY TRY_CONVERT(DATE, [SamplingDate]) DESC, [SampleCode] DESC, [ItemNo];
  `);

  const rows = db.recordsets?.[0] || [];
  for (const row of rows) {
    const key = `${row.SampleCode}|${row.ItemName}`;
    if (!values.has(key) && row.ResultApprove != null && String(row.ResultApprove).trim() !== '') {
      values.set(key, String(row.ResultApprove).trim());
    }
  }

  const bySample = new Map();
  for (const row of rows) {
    if (!bySample.has(row.SampleCode)) {
      bySample.set(row.SampleCode, {
        SampleCode: row.SampleCode,
        SamplingDate: row.SamplingDate,
        current: row.SampleCode === first.SampleCode,
      });
    }
  }

  bySample.set(first.SampleCode, {
    SampleCode: first.SampleCode,
    SamplingDate: first.SamplingDate,
    current: true,
  });

  const current = bySample.get(first.SampleCode);
  const previous = [...bySample.values()]
    .filter((sample) => sample.SampleCode !== first.SampleCode)
    .sort((a, b) => qoParseDate(b.SamplingDate) - qoParseDate(a.SamplingDate))
    .slice(0, maxColumns - 1)
    .sort((a, b) => qoParseDate(a.SamplingDate) - qoParseDate(b.SamplingDate));

  return { samples: [...previous, current], values };
}

async function qoDrawResultPage(doc, sampleRows, options = {}) {
  const isPreview = options.preview === true;
  const PAGE_W = doc.page.width;
  const PAGE_H = doc.page.height;
  const first = sampleRows[0];
  const formatReport = String(first.FormatReport || first.Format_Report || '').trim();
  const isFormat1 = formatReport === '1';
  const historyColumnCount = isFormat1 ? 7 : 1;
  // preview ยังไม่มี request จริง จึงไม่ต้องไปดึงผลย้อนหลังจาก DB (ทุกช่องผลเว้นว่างไว้)
  const history = isPreview
    ? { samples: [{ SampleCode: first.SampleCode, SamplingDate: '', current: true }], values: new Map() }
    : await qoLoadHistoryForSample(sampleRows, historyColumnCount);
  const displaySamples = qoPadHistorySamples(history.samples, historyColumnCount);
  const tableY = 190;
  const maxTableW = PAGE_W - 80;
  const fixedW = [170, 74, 82, 92];
  const fixedTotalW = fixedW.reduce((sum, value) => sum + value, 0);
  const format1HistoryW = (maxTableW - fixedTotalW) / 7;
  const historyW = isFormat1 ? format1HistoryW : 105;
  const tableW = fixedTotalW + historyW * displaySamples.length;
  const tableX = (PAGE_W - tableW) / 2;
  const rowH = 22;
  const headerH = 44;

  qoDrawPageFrame(doc);
  qoDrawLogoAndReportBox(doc, sampleRows);

  const labelX = 70;
  const valueX = 245;
  qoFont(doc, true).fontSize(11);
  doc.text('CUSTOMER NAME:', labelX, 112);
  doc.text('SAMPLE NAME:', labelX, 132);
  doc.text('FURNACE:', labelX, 152);
  doc.text('TEST DATE:', labelX, 172);
  qoFont(doc, true).fontSize(11);
  doc.text(first.CustFull || '-', valueX, 112, { width: 430 });
  doc.text(first.SampleName || '-', valueX, 132, { width: 430 });
  doc.text(first.Furnance || '-', valueX, 152, { width: 430 });
  qoDrawTestingPeriod(doc, sampleRows, valueX, 172, 'Times-Bold', 11);

  const cols = [
    { title: 'TEST ITEM', w: fixedW[0] },
    { title: 'Test\ncondition', w: fixedW[1] },
    { title: 'New Oil\n(Supplier)', w: fixedW[2] },
    { title: 'Control\nRange', w: fixedW[3] },
  ];
  let x = tableX;
  for (const col of cols) {
    qoCell(doc, x, tableY, col.w, headerH, col.title, { bg: '#DDEBF7', bold: true, align: 'center', fontSize: 10.5 });
    x += col.w;
  }
  qoCell(doc, x, tableY, historyW * displaySamples.length, 20, 'Sampling date', { bg: '#DDEBF7', bold: true, align: 'center', fontSize: 10.5 });
  let hx = x;
  for (const sample of displaySamples) {
    qoCell(doc, hx, tableY + 20, historyW, 24, qoDateText(sample.SamplingDate), {
      // bg: sample.current ? '#DDEBF7' : '#F3F8FC',
      bg: '#DDEBF7',
      align: 'center',
      bold: sample.current,
      fontSize: 9.5,
    });
    hx += historyW;
  }

  let y = tableY + headerH;
  qoFont(doc).fontSize(8.5);
  for (const item of sampleRows) {
    x = tableX;
    qoCell(doc, x, y, fixedW[0], rowH, item.ReportName || item.ItemName || '', { align: 'left' });
    x += fixedW[0];
    qoCell(doc, x, y, fixedW[1], rowH, item.TestCondition || '-', { align: 'center' });
    x += fixedW[1];
    qoCell(doc, x, y, fixedW[2], rowH, item.NewOil || '-', { align: 'center' });
    x += fixedW[2];
    qoCell(doc, x, y, fixedW[3], rowH, qoControlRangeText(item), { align: 'center' });
    x += fixedW[3];
    for (const sample of displaySamples) {
      const key = `${sample.SampleCode}|${item.ItemName}`;
      const value = isPreview
        ? ''
        : (sample.current ? qoResultText(item) : (history.values.get(key) || ''));
      qoCell(doc, x, y, historyW, rowH, value, {
        bg: sample.current ? '#DDEBF7' : null,
        align: 'center',
        color: qoIsOutOfSpec(item, value) ? '#FF0000' : null,
      });
      x += historyW;
    }
    y += rowH;
  }

  const samplingGroupW = historyW * displaySamples.length;
  const remarkText = `Remark:\n${qoRemarkText(sampleRows)}`;
  const commentText = `Comment: ${qoBuildComments(sampleRows)}`;
  const noteH = qoNoteHeight(doc, [
    { text: remarkText, w: fixedTotalW },
    { text: commentText, w: samplingGroupW },
  ], 46, PAGE_H - 80 - y);
  qoCell(doc, tableX, y, fixedTotalW, noteH, remarkText, { align: 'left', boldLabel: true, valign: 'top' });
  qoCell(doc, tableX + fixedTotalW, y, samplingGroupW, noteH, commentText, { align: 'left', boldLabel: true, valign: 'top' });

  qoFooter(doc, PAGE_W, PAGE_H);
}

// ความสูงของช่อง Remark / Comment ให้ยืดตามจำนวนบรรทัดจริง (ไม่ให้ข้อความโดนตัด)
function qoNoteHeight(doc, cells, minHeight, maxHeight) {
  qoFont(doc).fontSize(8.5);
  let needed = minHeight;
  for (const cell of cells) {
    const height = doc.heightOfString(String(cell.text ?? ''), { width: cell.w - 8, align: 'left' }) + 9;
    if (height > needed) needed = height;
  }
  const limit = Number.isFinite(maxHeight) ? Math.max(minHeight, maxHeight) : needed;
  return Math.min(Math.ceil(needed), limit);
}

// เติมข้อมูลจากคอลัมน์ซ้ายสุดไล่ไปทางขวา: history เก่าสุด -> ใหม่สุด แล้วต่อด้วย request ปัจจุบัน
// ช่องที่เหลือจึงว่างอยู่ทางขวา (สีพื้นหลังของคอลัมน์ปัจจุบันเลื่อนตามไปด้วย เพราะยึดจาก sample.current)
function qoPadHistorySamples(samples, desiredCount) {
  const safeSamples = Array.isArray(samples) ? samples : [];
  if (safeSamples.length >= desiredCount) return safeSamples;
  const current = safeSamples.find((sample) => sample.current);
  const previous = safeSamples.filter((sample) => sample !== current);
  const blanks = Array.from({ length: Math.max(0, desiredCount - safeSamples.length) }, (_, index) => ({
    SampleCode: `__blank_${index}`,
    SamplingDate: '',
    current: false,
  }));
  return current ? [...previous, current, ...blanks] : [...previous, ...blanks];
}

// รวม Remark ของทุก item ใน SampleNo เดียวกัน แยกคนละบรรทัด (ไม่ต่อท้ายกัน)
// และเรียงตามจำนวน * จากน้อยไปมาก เช่น "* ..." ก่อน แล้วค่อย "** ..."
function qoRemarkText(sampleRows) {
  const seen = new Set();
  const remarks = [];
  (sampleRows || []).forEach((item, index) => {
    const text = String(item?.Remark || '').trim();
    if (!text || text === '-' || seen.has(text)) return;
    seen.add(text);
    remarks.push({ text, stars: qoRemarkMarker(item).length, index });
  });
  if (remarks.length === 0) return '-';

  return remarks
    .sort((a, b) => (a.stars - b.stars) || (a.index - b.index))
    .map((remark) => qoFormatRemarkText(remark.text))
    .join('\n');
}

// Remark ที่เขียนเป็นข้อๆ ในบรรทัดเดียว เช่น "* 1. ... 2. ..." ให้ขึ้นบรรทัดใหม่ทุกข้อ
// (ตัดเฉพาะเลขข้อที่เรียงต่อกันจริงๆ เช่น 1. -> 2. -> 3. เพื่อไม่ให้ตัดผิดที่ตัวเลขทั่วไป)
function qoFormatRemarkText(text) {
  const raw = String(text || '').trim();
  if (!raw) return raw;

  const pattern = /(^|\s+)(\d+)\.\s/g;
  const marks = [];
  let match;
  while ((match = pattern.exec(raw)) !== null) {
    marks.push({ start: match.index + match[1].length, number: Number(match[2]) });
  }
  if (marks.length < 2) return raw;

  const chain = [];
  let expected = null;
  for (const mark of marks) {
    if (expected === null || mark.number === expected) {
      chain.push(mark);
      expected = mark.number + 1;
    }
  }
  if (chain.length < 2) return raw;

  const lines = [];
  for (let i = 0; i < chain.length; i++) {
    const start = i === 0 ? 0 : chain[i].start;
    const end = i + 1 < chain.length ? chain[i + 1].start : raw.length;
    const line = raw.slice(start, end).trim();
    if (line) lines.push(line);
  }
  return lines.join('\n');
}

// The cooling performance graph must come from an APPROVED / COMPLETE result
// only (never a "wait" one), mirroring how result values hide "wait". The
// latest analysed stage image is stored in each cooling row's Picture column,
// so use the Picture of the approved cooling item.
function qoCoolingGraphPath(sampleRows) {
  const approvedStatuses = new Set(['APPROVE ITEM', 'COMPLETE']);
  let graph = '';
  for (const item of sampleRows || []) {
    const instrument = String(item.Instrument || '').trim().toUpperCase();
    if (instrument !== 'COOLING CURVE MEASUREMENT') continue;
    const status = String(item.ItemStatus || '').trim().toUpperCase();
    const approved = approvedStatuses.has(status) || String(item.ResultApprove || '').trim() !== '';
    if (!approved) continue;
    const picture = String(item.Picture || '').trim();
    if (picture) graph = picture;
  }
  return graph;
}

function qoDrawGraphPage(doc, sampleRows, signatures, options = {}) {
  const isPreview = options.preview === true;
  const PAGE_W = doc.page.width;
  const PAGE_H = doc.page.height;
  const first = sampleRows[0];
  qoDrawPageFrame(doc);

  qoFont(doc, true).fontSize(13).text('Graph for cooling performance', 78, 68, { underline: true });

  const graphPath = qoResolveLocalPath(qoCoolingGraphPath(sampleRows) || qoHeaderValue(sampleRows, 'Report_Graph'));
  if (graphPath && fs.existsSync(graphPath)) {
    try {
      doc.image(graphPath, 82, 95, { fit: [470, 360], align: 'center', valign: 'center' });
    } catch (_) {
      qoFont(doc).fontSize(11).text('Graph image cannot be rendered.', 82, 160);
    }
  } else if (isPreview) {
    qoFont(doc).fontSize(11).text('Preview mode: the graph is created from the analysis result.', 82, 160);
  } else {
    qoFont(doc).fontSize(11).text('Graph image not found.', 82, 160);
  }

  const issueName = qoHeaderValue(sampleRows, 'UserAnalysis').trim();
  const checkedName = qoHeaderValue(sampleRows, 'ItemApprover').trim();
  const approvedName = qoHeaderValue(sampleRows, 'ReportApprover').trim();
  const signRows = [
    { title: 'Issued by', name: issueName, info: signatures.get(issueName) },
    { title: 'Checked By', name: checkedName, info: signatures.get(checkedName) },
    { title: 'Approved by', name: approvedName, info: signatures.get(approvedName) },
  ];
  qoDrawSignatureTable(doc, PAGE_W - 285, PAGE_H - 168, 240, 88, signRows);
  qoFooter(doc, PAGE_W, PAGE_H);
}

// ย่อชื่อผู้ลงนาม: อักษรตัวแรกของนามสกุล + "." + ชื่อ
// เช่น "Mr. Sirawit Kaewchoo" -> "K.Sirawit", "นายศิรวิทย์ แก้วชู" -> "แ.ศิรวิทย์"
function qoShortName(fullName) {
  const raw = String(fullName || '').trim();
  if (!raw) return '';
  if (/^\S\.\S/.test(raw)) return raw; // ย่ออยู่แล้ว เช่น "K.Sirawit"
  const withoutTitle = raw
    .replace(/^(mr|mrs|ms|miss|dr|prof|khun)\.?\s*/i, '')
    .replace(/^(นาย|นางสาว|นาง|ด\.ช\.|ด\.ญ\.|ดร\.|คุณ)\s*/, '')
    .trim();
  const parts = withoutTitle.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return raw;
  if (parts.length === 1) return parts[0];
  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  const initial = [...lastName][0];
  return `${initial.toUpperCase()}.${firstName}`;
}

function qoDrawSignatureTable(doc, x, y, w, h, rows) {
  const colW = w / 3;
  const headerH = 18;
  const signatureH = 38;
  const dividerY = y + headerH + signatureH;
  for (let i = 0; i < rows.length; i++) {
    const colX = x + colW * i;
    qoCell(doc, colX, y, colW, headerH, rows[i].title, { bg: '#B7D4EF', bold: true, align: 'center', fontSize: 9.5 });
    doc.rect(colX, y + headerH, colW, h - headerH).stroke();
    doc.moveTo(colX, dividerY).lineTo(colX + colW, dividerY).stroke();
    const signPath = qoResolveLocalPath(rows[i].info?.signaturePath);
    if (signPath && fs.existsSync(signPath)) {
      try {
        doc.image(signPath, colX + 5, y + headerH + 1, { fit: [colW - 10, signatureH - 2], align: 'center' });
      } catch (_) { }
    }
    qoThaiFont(doc, true).fontSize(10).fillColor('black')
      .text(qoShortName(rows[i].info?.fullName || rows[i].name || ''), colX + 2, dividerY + 3, { width: colW - 4, align: 'center' });
    qoThaiFont(doc, true).fontSize(9)
      .text(rows[i].info?.position || '', colX + 2, dividerY + 17, { width: colW - 4, align: 'center' });
  }
}

async function qoLoadSignatures(items) {
  const names = [...new Set([
    ...items.map((item) => item.UserAnalysis),
    ...items.map((item) => item.ItemApprover),
    ...items.map((item) => item.ReportApprover),
  ].map((value) => String(value || '').trim()).filter(Boolean))];
  const output = new Map();
  for (const name of names) {
    try {
      const db = await mssql.qurey(`
        SELECT TOP 1 [Name], [FullName], [QO_Position]
        FROM [SAR].[dbo].[Master_User]
        WHERE [QO_FullName] = N'${qoEsc(name)}';
      `);
      const row = db.recordsets?.[0]?.[0] || {};
      const signFileName = row.Name || name;
      output.set(name, {
        fullName: row.FullName || name,
        position: row.QO_Position || '',
        signaturePath: `\\\\172.23.10.51\\Sign_Pic\\${signFileName}.jpg`,
      });
    } catch (_) {
      output.set(name, {
        fullName: name,
        position: '',
        signaturePath: `\\\\172.23.10.51\\Sign_Pic\\${name}.jpg`,
      });
    }
  }
  return output;
}

function qoResolveLocalPath(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return path.resolve(raw);
}

function qoDrawPageFrame(doc) {
  doc.lineWidth(1).strokeColor('#555555').rect(24, 20, doc.page.width - 48, doc.page.height - 40).stroke();
  doc.strokeColor('black').lineWidth(0.5);
}

function qoDrawLogoAndReportBox(doc, sampleRowsOrFirst) {
  const PAGE_W = doc.page.width;
  const rows = Array.isArray(sampleRowsOrFirst) ? sampleRowsOrFirst : [sampleRowsOrFirst];
  const first = rows[0] || {};
  const logoPath = path.join(__dirname, '../../assets/logo/logoTPK.png');
  if (fs.existsSync(logoPath)) {
    const logoW = 150;
    doc.image(logoPath, PAGE_W / 2 - logoW / 2, 28, { width: logoW });
  }
  // qoFont(doc, true).fontSize(13).text('TP Analysis Department', 0, 84, { width: PAGE_W, align: 'center' });

  const boxW = 132;
  const boxX = PAGE_W - 170;
  const boxY = 38;
  qoCell(doc, boxX, boxY, boxW, 25, first.ReqNo || '', { align: 'center', bold: true, color: '#263C8D', fontSize: 11 });
  doc.strokeColor('black').lineWidth(0.45).rect(boxX, boxY + 25, boxW, 25).stroke();
  drawOrdinalDateInBox(doc, qoLatestDate(rows, 'ReportApproveDate') || new Date(), boxX, boxY + 25, boxW, 25, 'Times-Roman', 11);
  doc.fillColor('black');
}

function qoFooter(doc, pageW, pageH) {
  qoFont(doc, true).fontSize(14).fillColor('#4774FF')
    .text('T H A I   P A R K E R I Z I N G   C O., L T D.', 0, pageH - 70, { width: pageW, align: 'center' });
  qoFont(doc).fontSize(6).fillColor('#4774FF')
    .text('570 Moo 4 Bangpoo Industrial Estate Soi 12, Sukhumvit Rd., Prakasa, Muang, Samutprakarn 10280 Tel.0-2324-6600, Fax.0-2324-6687', 0, pageH - 50, { width: pageW, align: 'center' });
  qoFont(doc).fontSize(7).fillColor('black')
    .text(QO_FORM_CODE, 0, pageH - 40, { width: pageW - 40, align: 'right' });
  doc.fillColor('black');
}

function qoCell(doc, x, y, w, h, text, options = {}) {
  if (options.bg) {
    doc.save().fillColor(options.bg).rect(x, y, w, h).fill().restore();
  }
  doc.strokeColor('black').lineWidth(0.45).rect(x, y, w, h).stroke();
  qoFont(doc, options.bold).fontSize(options.fontSize || 8.5).fillColor(options.color || 'black');
  const align = options.align || 'center';
  const valign = options.valign || 'center';
  const padding = 4;
  const content = String(text ?? '');
  const textWidth = w - padding * 2;
  const explicitLines = content.split('\n');
  const shouldCenterExplicitLines = valign !== 'top' &&
    explicitLines.length > 1 &&
    explicitLines.every((line) => doc.widthOfString(line) <= textWidth);

  if (shouldCenterExplicitLines) {
    const lineHeight = doc.currentLineHeight();
    const totalLineHeight = lineHeight * explicitLines.length;
    const startY = y + Math.max(2, (h - totalLineHeight) / 2);
    doc.save();
    doc.rect(x + padding, y + 1, textWidth, h - 2).clip();
    explicitLines.forEach((line, index) => {
      doc.text(line, x + padding, startY + lineHeight * index, {
        width: textWidth,
        height: lineHeight,
        align,
        ellipsis: true,
      });
    });
    doc.restore();
    doc.fillColor('black');
    return;
  }

  const textHeight = Math.min(
    doc.heightOfString(content, {
      width: textWidth,
      align,
      ellipsis: true,
    }),
    h - 6
  );
  const textY = valign === 'top'
    ? y + 4
    : y + Math.max(2, (h - textHeight) / 2);
  doc.save();
  doc.rect(x + padding, y + 1, textWidth, h - 2).clip();
  doc.text(content, x + padding, textY, {
    width: textWidth,
    height: h - 6,
    align,
    ellipsis: true,
  });
  doc.restore();
  doc.fillColor('black');
}

function drawOrdinalDate(doc, dt, x, y, font, fontSize, boxW) {
  if (!dt) return;

  const day = dt.getDate();
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const suffix = [11, 12, 13].includes(day) ? 'th'
    : day % 10 === 1 ? 'st'
      : day % 10 === 2 ? 'nd'
        : day % 10 === 3 ? 'rd' : 'th';
  const year = dt.getFullYear();
  const supSize = Math.round(fontSize * 0.6);

  const part1 = `${months[dt.getMonth()]} ${day}`;
  const part2 = suffix;
  const part3 = `, ${year}`;

  // คำนวณ total width ก่อน
  doc.font(font).fontSize(fontSize);
  const w1 = doc.widthOfString(part1);
  doc.font(font).fontSize(supSize);
  const w2 = doc.widthOfString(part2);
  doc.font(font).fontSize(fontSize);
  const w3 = doc.widthOfString(part3);

  const totalW = w1 + w2 + w3;

  // ถ้ามี boxW → center, ถ้าไม่มี → ใช้ x เดิม
  const startX = boxW ? x + (boxW - totalW) / 2 : x;

  doc.font(font).fontSize(fontSize).text(part1, startX, y, { lineBreak: false });
  doc.font(font).fontSize(supSize).text(part2, startX + w1, y - supSize * 0.45, { lineBreak: false });
  doc.font(font).fontSize(fontSize).text(part3, startX + w1 + w2, y, { lineBreak: false });
}

// ✅ เพิ่ม function วาด method text พร้อม Cr6+ superscript
function drawOrdinalDateInBox(doc, dt, x, y, w, h, font, fontSize) {
  const textHeight = fontSize * 1.15;
  drawOrdinalDate(doc, dt, x, y + (h - textHeight) / 2 + 1, font, fontSize, w);
}

function qoDrawTestingPeriod(doc, items, x, y, font, fontSize) {
  const start = qoEarliestDate(items, 'ReceivedDate');
  const end = qoLatestDate(items, 'ReportApproveDate');
  if (!start || !end) {
    return;
  }
  if (start.toDateString() === end.toDateString()) {
    drawOrdinalDate(doc, start, x, y, font, fontSize);
    return;
  }

  const sameYear = start.getFullYear() === end.getFullYear();
  const separator = ' - ';
  let tx = qoDrawOrdinalParts(doc, qoOrdinalParts(start, !sameYear), x, y, font, fontSize);
  doc.font(font).fontSize(fontSize).text(separator, tx, y, { lineBreak: false });
  tx += doc.widthOfString(separator);
  qoDrawOrdinalParts(doc, qoOrdinalParts(end, true), tx, y, font, fontSize);
}

function qoOrdinalParts(dt, includeYear) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const day = dt.getDate();
  const suffix = [11, 12, 13].includes(day) ? 'th' : day % 10 === 1 ? 'st' : day % 10 === 2 ? 'nd' : day % 10 === 3 ? 'rd' : 'th';
  return {
    main: `${months[dt.getMonth()]} ${day}`,
    suffix,
    tail: includeYear ? `, ${dt.getFullYear()}` : '',
  };
}

function qoDrawOrdinalParts(doc, parts, x, y, font, fontSize) {
  const supSize = Math.round(fontSize * 0.6);
  doc.font(font).fontSize(fontSize).text(parts.main, x, y, { lineBreak: false });
  const mainW = doc.font(font).fontSize(fontSize).widthOfString(parts.main);
  doc.font(font).fontSize(supSize).text(parts.suffix, x + mainW, y - supSize * 0.45, { lineBreak: false });
  const suffixW = doc.font(font).fontSize(supSize).widthOfString(parts.suffix);
  doc.font(font).fontSize(fontSize).text(parts.tail, x + mainW + suffixW, y, { lineBreak: false });
  return x + mainW + suffixW + doc.font(font).fontSize(fontSize).widthOfString(parts.tail);
}

function drawMethodTextWithCr6(doc, x, y, F, FS) {
  const supSize = Math.round(FS * 0.65);
  const parts = [
    { text: 'Screening by XRF (In-House method) and Cr', font: F, size: FS, sup: false },
    { text: '6+', font: F, size: supSize, sup: true },
    { text: ' by Colorimetric method', font: F, size: FS, sup: false },
  ];

  let tx = x;
  const baseY = y;

  for (const p of parts) {
    const ty = p.sup ? baseY - supSize * 0.1 : baseY;
    doc.font(p.font).fontSize(p.size).text(p.text, tx, ty, { lineBreak: false });
    tx += doc.widthOfString(p.text);
  }
}

// ✅ เพิ่ม function นี้ไว้ด้านล่างร่วมกับ function อื่นๆ
function drawCr6PlusCell(doc, x, y, w, h, F, FB, FS) {
  doc.rect(x, y, w, h).stroke();

  const mainText = 'Cr';
  const supText = '6+';
  const supSize = Math.round(FS * 0.65);

  doc.font(F).fontSize(FS);
  const mainW = doc.widthOfString(mainText);
  doc.font(F).fontSize(supSize);
  const supW = doc.widthOfString(supText);

  const totalW = mainW + supW;
  const startX = (x + (w - totalW) / 2) + 3;

  // baseline ของ Cr (vertically centered)
  const mainH = FS * 1.2;
  const mainY = y + (h - mainH) / 2;

  // 6+ อยู่ด้านบน Cr (superscript)
  const supY = mainY - supSize * 0.1;

  doc.font(F).fontSize(FS).text(mainText, startX, mainY, { lineBreak: false });
  doc.font(F).fontSize(supSize).text(supText, startX + mainW, supY, { lineBreak: false });
}

function formatShortDate(str) {
  if (!str) return '';
  const [d, m, y] = str.split(' ')[0].split('-');
  return `${d}/${m}/${y}`;
}

function drawMixedTextCell(doc, x, y, w, h, text, F, FS) {
  doc.rect(x, y, w, h).stroke();
  if (!text) return;

  const specialFont = 'cambria-math';
  const normalFont = F;

  // ⭐ scale สำหรับ font พิเศษ (ปรับได้)
  const specialScale = 0.8; // ลอง 1.1 ถ้ารู้สึกเล็ก

  // แยกตัวอักษร
  let parts = [];
  for (let ch of text) {
    if (/[αβγδεζηθλμνξοπρστυφχψω≥≤→←]/.test(ch)) {
      parts.push({ font: specialFont, text: ch, size: FS * specialScale });
    } else {
      parts.push({ font: normalFont, text: ch, size: FS });
    }
  }

  // รวมตัวอักษรที่ font + size เหมือนกัน
  let merged = [];
  for (let p of parts) {
    if (
      merged.length > 0 &&
      merged[merged.length - 1].font === p.font &&
      merged[merged.length - 1].size === p.size
    ) {
      merged[merged.length - 1].text += p.text;
    } else {
      merged.push(p);
    }
  }

  // คำนวณความกว้าง
  let totalWidth = 0;
  for (let m of merged) {
    doc.font(m.font).fontSize(m.size);
    totalWidth += doc.widthOfString(m.text);
  }

  // ใช้ lineHeight จาก FS (fix ไม่ให้เพี้ยน)
  const lineHeight = FS * 1.2;

  let tx = x + (w - totalWidth) / 2;
  let ty = y + (h - lineHeight) / 2;

  // วาด text
  for (let i = 0; i < merged.length; i++) {
    const m = merged[i];
    const yOffset = (FS - m.size) * 0.8; // ⭐ ปรับค่าได้

    doc.font(m.font).fontSize(m.size).text(m.text, tx, ty + yOffset, {
      lineBreak: false,
      continued: i !== merged.length - 1,
    });
    tx += doc.widthOfString(m.text);
  }
}

function drawSymbol(doc, symbol) {
  return doc.font('cambria-math').text(symbol, { continued: true });
}

module.exports = router;
