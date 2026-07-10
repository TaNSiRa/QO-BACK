const express = require("express");
const router = express.Router();
var mssql = require('../../function/mssql');
const { ISOToLocal } = require('../../function/formatDateTime');
var mongodb = require('../../function/mongodb');
var httpreq = require('../../function/axios');
var axios = require('axios');
const e = require("express");
const logger = require("../../function/logFile");
const multer = require('multer');
const nodePath = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const { push } = require("pdfkit");
const COOLING_PDF_DIR = 'C:\\AutomationProject\\QO\\Cooling PDF';
const coolingPdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf'
      || nodePath.extname(file.originalname || '').toLowerCase() === '.pdf';
    cb(isPdf ? null : new Error('Only PDF files are allowed'), isPdf);
  },
});

//-------------------------------------------------SQL Server Zone-------------------------------------------------//
router.post('/QO/master-pattern', async (req, res) => {
  //-------------------------------------
  console.log("--master-pattern--");
  //-------------------------------------
  let output = [];
  let query = `
    SELECT DISTINCT [CustFull]
    FROM [QO].[dbo].[MasterPattern]
    WHERE NULLIF(LTRIM(RTRIM([CustFull])), '') IS NOT NULL AND CustFull != 'Master'
    ORDER BY [CustFull];
  `;
  let db = await mssql.qurey(query);
  if (db["recordset"].length > 0) {
    output = db["recordsets"][0];
    return res.status(200).json(output);
  } else {
    return res.status(400).json({ message: 'ไม่พบข้อมูล' });
  }
  //-------------------------------------

});

router.post('/QO/master-pattern/by-customer', async (req, res) => {
  //-------------------------------------
  console.log("--master-pattern-by-customer--");
  //-------------------------------------
  const custFull = (req.body.CustFull || '').toString().replace(/'/g, "''");
  let output = [];
  let query = custFull
    ? `
      SELECT *
      FROM [QO].[dbo].[MasterPattern]
      WHERE [CustFull] = N'${custFull}'
      ORDER BY [SampleNo], [ItemNo];
    `
    : `
      SELECT DISTINCT [CustFull]
      FROM [QO].[dbo].[MasterPattern]
      WHERE NULLIF(LTRIM(RTRIM([CustFull])), '') IS NOT NULL AND CustFull != 'Master'
      ORDER BY [CustFull];
    `;
  let db = await mssql.qurey(query);
  if (db["recordset"].length > 0) {
    output = db["recordsets"][0];
    return res.status(200).json(output);
  } else {
    return res.status(400).json({ message: 'ไม่พบข้อมูล' });
  }
  //-------------------------------------

});

router.post('/QO/master-pattern/by-instrument', async (req, res) => {
  //-------------------------------------
  console.log("--master-pattern-by-instrument--");
  //-------------------------------------
  const instrument = (req.body.Instrument || '').toString().replace(/'/g, "''");
  let output = [];
  let query = `
    SELECT *
    FROM [QO].[dbo].[MasterPattern]
    WHERE [CustFull] = 'Master'
    ORDER BY [CustFull], [SampleNo], [ItemNo];
  `;
  let db = await mssql.qurey(query);
  if (db["recordset"].length > 0) {
    output = db["recordsets"][0];
    return res.status(200).json(output);
  } else {
    return res.status(400).json({ message: 'ไม่พบข้อมูล' });
  }
  //-------------------------------------

});

router.post('/QO/DropdownInstrument', async (req, res) => {
  //-------------------------------------
  console.log("--DropdownInstrument--");
  //-------------------------------------
  let output = [];
  let query = `
    SELECT DISTINCT [Instrument]
    FROM [QO].[dbo].[MasterInstrument]
    WHERE NULLIF(LTRIM(RTRIM([Instrument])), '') IS NOT NULL
    ORDER BY [Instrument];
  `;
  let db = await mssql.qurey(query);
  if (db["recordset"].length > 0) {
    output = db["recordsets"][0];
    return res.status(200).json(output);
  } else {
    return res.status(400).json({ message: 'ไม่พบข้อมูล' });
  }
  //-------------------------------------
});

// ── physical-properties ────────────────────────────────────────────────────
router.post('/QO/master-instrument', async (req, res) => {
  //-------------------------------------
  console.log("--master-instrument--");
  //-------------------------------------
  let output = [];
  let query = `SELECT * From [QO].[dbo].[MasterInstrument]`;
  let db = await mssql.qurey(query);
  if (db["recordset"].length > 0) {
    output = db["recordsets"][0];
    return res.status(200).json(output);
  } else {
    return res.status(400).json({ message: 'ไม่พบข้อมูล' });
  }
  //-------------------------------------

});

// ── INSERT ────────────────────────────────────────────────────
router.post('/QO/master-instrument/insert', async (req, res) => {
  console.log('-- master-instrument INSERT --');
  const { Instrument, Cost } = req.body;

  // Validate
  if (!Instrument || Instrument.trim() === '') {
    return res.status(400).json({ message: 'Instrument ห้ามว่าง' });
  }

  try {
    const costValue = Cost === null || Cost === undefined || `${Cost}`.trim() === ''
      ? 'NULL'
      : `N'${_esc(`${Cost}`.replace(/,/g, '').trim())}'`;
    const query = `
      INSERT INTO [QO].[dbo].[MasterInstrument]
        (Instrument, Cost)
      VALUES
        (N'${_esc(Instrument)}', ${costValue})
    `;
    await mssql.qurey(query);
    return res.status(200).json({ message: 'เพิ่มข้อมูลสำเร็จ' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// ── UPDATE ────────────────────────────────────────────────────
router.post('/QO/master-instrument/update', async (req, res) => {
  console.log('-- master-instrument UPDATE --');
  const { Id, Instrument, Cost } = req.body;

  if (!Id) {
    return res.status(400).json({ message: 'ต้องระบุ Id' });
  }
  if (!Instrument || Instrument.trim() === '') {
    return res.status(400).json({ message: 'Instrument ห้ามว่าง' });
  }

  try {
    const costValue = Cost === null || Cost === undefined || `${Cost}`.trim() === ''
      ? 'NULL'
      : `N'${_esc(`${Cost}`.replace(/,/g, '').trim())}'`;
    const query = `
      UPDATE [QO].[dbo].[MasterInstrument]
      SET
        Instrument = N'${_esc(Instrument)}',
        Cost = ${costValue}
      WHERE Id = ${Number(Id)}
    `;
    const db = await mssql.qurey(query);
    if (db['rowsAffected'][0] === 0) {
      return res.status(404).json({ message: `ไม่พบ Id: ${Id}` });
    }
    return res.status(200).json({ message: 'แก้ไขข้อมูลสำเร็จ' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// ── DELETE ────────────────────────────────────────────────────
router.post('/QO/master-instrument/delete', async (req, res) => {
  console.log('-- master-instrument DELETE --');
  const { Id } = req.body;

  if (!Id) {
    return res.status(400).json({ message: 'ต้องระบุ Id' });
  }

  try {
    const query = `
      DELETE FROM [QO].[dbo].[MasterInstrument]
      WHERE Id = ${Number(Id)}
    `;
    const db = await mssql.qurey(query);
    if (db['rowsAffected'][0] === 0) {
      return res.status(404).json({ message: `ไม่พบ Id: ${Id}` });
    }
    return res.status(200).json({ message: 'ลบข้อมูลสำเร็จ' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// ── physical-properties ────────────────────────────────────────────────────
router.post('/QO/master-item-name', async (req, res) => {
  //-------------------------------------
  console.log("--master-item-name--");
  //-------------------------------------
  let output = [];
  let query = `SELECT * From [QO].[dbo].[MasterItemName]`;
  let db = await mssql.qurey(query);
  if (db["recordset"].length > 0) {
    output = db["recordsets"][0];
    return res.status(200).json(output);
  } else {
    return res.status(400).json({ message: 'ไม่พบข้อมูล' });
  }
  //-------------------------------------

});

// ── INSERT ────────────────────────────────────────────────────
router.post('/QO/master-item-name/insert', async (req, res) => {
  console.log('-- master-item-name INSERT --');
  const { ItemName } = req.body;

  // Validate
  if (!ItemName || ItemName.trim() === '') {
    return res.status(400).json({ message: 'ItemName ห้ามว่าง' });
  }

  try {
    const query = `
      INSERT INTO [QO].[dbo].[MasterItemName]
        (ItemName)
      VALUES
        (N'${_esc(ItemName)}')
    `;
    await mssql.qurey(query);
    return res.status(200).json({ message: 'เพิ่มข้อมูลสำเร็จ' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// ── UPDATE ────────────────────────────────────────────────────
router.post('/QO/master-item-name/update', async (req, res) => {
  console.log('-- master-item-name UPDATE --');
  const { Id, ItemName } = req.body;

  if (!Id) {
    return res.status(400).json({ message: 'ต้องระบุ Id' });
  }
  if (!ItemName || ItemName.trim() === '') {
    return res.status(400).json({ message: 'ItemName ห้ามว่าง' });
  }

  try {
    const query = `
      UPDATE [QO].[dbo].[MasterItemName]
      SET
        ItemName = N'${_esc(ItemName)}'
      WHERE Id = ${Number(Id)}
    `;
    const db = await mssql.qurey(query);
    if (db['rowsAffected'][0] === 0) {
      return res.status(404).json({ message: `ไม่พบ Id: ${Id}` });
    }
    return res.status(200).json({ message: 'แก้ไขข้อมูลสำเร็จ' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// ── DELETE ────────────────────────────────────────────────────
router.post('/QO/master-item-name/delete', async (req, res) => {
  console.log('-- master-item-name DELETE --');
  const { Id } = req.body;

  if (!Id) {
    return res.status(400).json({ message: 'ต้องระบุ Id' });
  }

  try {
    const query = `
      DELETE FROM [QO].[dbo].[MasterItemName]
      WHERE Id = ${Number(Id)}
    `;
    const db = await mssql.qurey(query);
    if (db['rowsAffected'][0] === 0) {
      return res.status(404).json({ message: `ไม่พบ Id: ${Id}` });
    }
    return res.status(200).json({ message: 'ลบข้อมูลสำเร็จ' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

router.post('/QO/getAllCustomer', async (req, res) => {
  //-------------------------------------
  console.log("--getAllCustomer--");
  //-------------------------------------
  let output = [];
  let query = `SELECT 
                CustShort,
                MAX(Id) AS Id,
                MAX(CustFull) AS CustFull,
                MAX(FormatReport) AS FormatReport

            FROM [QO].[dbo].[MasterPattern]
            GROUP BY CustShort
            ORDER BY CustFull;
            `;

  let db = await mssql.qurey(query);
  if (db["recordsets"].length > 0) {
    let buffer = db["recordsets"][0];
    output = buffer;
    return res.status(200).json(output);
  } else {
    return res.status(400).json('ไม่พบข้อมูล');
  }
});

router.post('/QO/getMasterPattern', async (req, res) => {
  //-------------------------------------
  console.log("--getMasterPattern--");
  //-------------------------------------
  let output = [];
  let query = `SELECT
                [Id],
                [CustFull],
                [CustShort],
                [SampleNo],
                [SampleName],
                [Furnance],
                [Instrument],
                [ItemNo],
                [ItemName],
                [ReportName],
                [NewOil],
                [Min],
                [Max],
                [Remark],
                [FormatReport],
                [LOQ_Karlfischer]
              FROM [QO].[dbo].[MasterPattern]
              ORDER BY [CustFull], [SampleNo], [ItemNo];`;
  let db = await mssql.qurey(query);
  if (db["recordsets"].length > 0) {
    let buffer = db["recordsets"][0];
    output = buffer;
    return res.status(200).json(output);
  } else {
    return res.status(400).json('ไม่พบข้อมูล');
  }
});

router.post('/QO/addNewCustomer', async (req, res) => {
  try {
    //-------------------------------------
    console.log("--addNewCustomer--");
    //-------------------------------------
    const {
      CustFull,
      CustShort,
      FormatReport
    } = req.body.data;

    let fields = [];
    function pushField(name, value) {
      if (value !== '') {
        const escapedValue = value.toString().replace(/'/g, "''");
        fields.push(`[${name}] = '${escapedValue}'`);
      } else {
        fields.push(`[${name}] = NULL`);
      }
    }

    pushField("CustFull", CustFull);
    pushField("CustShort", CustShort);
    pushField("FormatReport", FormatReport);

    let query = `
        INSERT INTO [QO].[dbo].[MasterPattern]
        (
        ${fields.map(field => field.split('=')[0].trim()).join(',\n')}
        )
        VALUES (
        ${fields.map(field => field.split('=').slice(1).join('=').trim()).join(',\n')}
        )
        `;
    let insertResult = await mssql.qurey(query);
    if (insertResult.rowsAffected[0] === 0) {
      return res.status(400).json({ message: 'เพิ่มข้อมูลไม่สําเร็จ' });
    }
    return res.status(200).json({ message: 'เพิ่มข้อมูลสําเร็จ' });

  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: "Server Error", error: err.message });
  }
});

router.post('/QO/masterDetail', async (req, res) => {
  //-------------------------------------
  console.log("--masterDetail--");
  //-------------------------------------
  let output = [];
  let query = `SELECT * From [QO].[dbo].[${req.body.masterType}] 
                 WHERE CustShort = '${req.body.CustShort}'
                 order by SampleNo, ItemNo;`;
  let db = await mssql.qurey(query);
  if (db["recordsets"].length > 0) {
    let buffer = db["recordsets"][0];
    output = buffer;
    return res.status(200).json(output);
  } else {
    return res.status(400).json('ไม่พบข้อมูล');
  }
});

router.post('/QO/getDropdown', async (req, res) => {
  try {
    //-------------------------------------
    console.log("--getDropdown--");
    //-------------------------------------
    const instrumentQuery = `
      SELECT DISTINCT [Instrument]
      FROM [QO].[dbo].[MasterInstrument]
      WHERE NULLIF(LTRIM(RTRIM([Instrument])), '') IS NOT NULL
      ORDER BY [Instrument];
    `;
    const itemNameQuery = `
      SELECT DISTINCT [ItemName]
      FROM [QO].[dbo].[MasterItemName]
      WHERE NULLIF(LTRIM(RTRIM([ItemName])), '') IS NOT NULL
      ORDER BY [ItemName];
    `;
    const [instrumentDb, itemNameDb] = await Promise.all([
      mssql.qurey(instrumentQuery),
      mssql.qurey(itemNameQuery),
    ]);

    if (instrumentDb["recordsets"].length > 0 || itemNameDb["recordsets"].length > 0) {
      const groupInstrument = (instrumentDb["recordsets"][0] || []).map(row => row.Instrument);
      const groupItemName = (itemNameDb["recordsets"][0] || []).map(row => row.ItemName);

      return res.status(200).json({
        groupInstrument,
        groupItemName,
        instruments: groupInstrument,
        itemNames: groupItemName,
      });
    } else {
      return res.status(400).json('ไม่พบข้อมูล');
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server Error", error: err.message });
  }
});

router.post('/QO/confirmEditData', async (req, res) => {
  //-------------------------------------
  console.log("--confirmEditData--");
  //-------------------------------------
  try {
    let tableName = req.body.masterType;
    let data = JSON.parse(req.body.data);
    console.log(data);
    if (!tableName || !Array.isArray(data)) {
      return res.status(400).json({ error: "Missing tableName or data array" });
    }

    // 1. ดึงข้อมูลเดิมจาก SQL
    const selectQuery = `SELECT * FROM [QO].[dbo].[${tableName}] WHERE CustShort = '${data[0]?.CustShort || ''}' ORDER BY SampleNo, ItemNo;`;
    const db = await mssql.qurey(selectQuery);
    const oldData = db.recordsets[0] || [];
    // 2. สร้าง map ของ Id เดิม
    const oldMap = new Map(oldData.map(row => [String(row.Id), row]));
    // 3. เตรียม SQL statements
    const insertStatements = [];
    const updateStatements = [];
    const deleteStatements = [];
    const newIds = new Set();

    for (let row of data) {
      const rowId = String(row['Id']);
      const isDeleted = row['deleted'] === true;

      if (isDeleted && rowId) {
        // ถ้า mark deleted → ลบออกจาก DB
        deleteStatements.push(`DELETE FROM [QO].[dbo].[${tableName}] WHERE Id = ${rowId}`);
        continue; // ไม่ต้องทำ insert/update
      }

      if (rowId && oldMap.has(rowId)) {
        // Update
        newIds.add(rowId);
        const updates = Object.entries(row)
          .filter(([key, _]) => key !== 'Id' && key !== 'deleted')
          .map(([key, value]) =>
            value === null || value === undefined
              ? `[${key}] = NULL`
              : `[${key}] = N'${value.replace(/'/g, "''")}'`
          )
          .join(', ');

        updateStatements.push(`UPDATE [QO].[dbo].[${tableName}] SET ${updates} WHERE Id = ${rowId}`);
        console.log(updateStatements)
      } else if (!isDeleted) {
        // Insert
        const rowWithoutId = Object.fromEntries(
          Object.entries(row).filter(([key, _]) => key !== 'Id' && key !== 'deleted')
        );
        const columns = Object.keys(rowWithoutId).map(k => `[${k}]`).join(', ');
        const values = Object.values(rowWithoutId)
          .map(v =>
            v === null || v === undefined
              ? `NULL`
              : `N'${String(v).replace(/'/g, "''")}'`
          )
          .join(', ');

        insertStatements.push(`INSERT INTO [QO].[dbo].[${tableName}] (${columns}) VALUES (${values})`);
      }
    }

    // 5. รวม statement ทั้งหมด
    const allStatements = [...insertStatements, ...updateStatements, ...deleteStatements];

    for (let stmt of allStatements) {
      await mssql.qurey(stmt);
    }

    return res.status(200).json({ message: "Data updated successfully", inserted: insertStatements.length, updated: updateStatements.length, deleted: deleteStatements.length });

  } catch (err) {
    console.error("DB Error:", err);
    return res.status(500).json({ error: "Database error", details: err.message });
  }
});

router.post('/QO/CreateRequest', async (req, res) => {
  console.log("--CreateRequest--");

  try {
    const { items, user_name, user_section } = req.body;
    const now = ISOToLocal(new Date());

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'No items' });
    }

    const baseReqNo = await generateBaseReqNo();
    const sampleCodeBySampleNo = {};
    const masterInstrumentDb = await mssql.qurey(`
      SELECT [Instrument], [Cost]
      FROM [QO].[dbo].[MasterInstrument]
    `);
    const costByInstrument = new Map();
    for (const row of masterInstrumentDb.recordset || []) {
      const key = (row.Instrument || '').toString().trim().toUpperCase();
      if (key && !costByInstrument.has(key)) {
        costByInstrument.set(key, row.Cost);
      }
    }
    const coolingCurveCostAssigned = new Set();

    function sampleNoCodePart(sampleNo) {
      const raw = (sampleNo || '').toString();
      const parsed = Number.parseInt(raw, 10);
      return Number.isFinite(parsed) ? parsed.toString().padStart(2, '0') : raw.padStart(2, '0');
    }

    function requestCostForItem(item, sampleCode) {
      const instrumentKey = (item.Instrument || '').toString().trim().toUpperCase();
      const cost = costByInstrument.get(instrumentKey);
      if (instrumentKey === 'COOLING CURVE MEASUREMENT') {
        const key = `${sampleCode}|${instrumentKey}`;
        if (coolingCurveCostAssigned.has(key)) return null;
        coolingCurveCostAssigned.add(key);
      }
      return cost ?? null;
    }

    for (const item of items) {
      const sampleNo = (item.SampleNo || '').toString();
      if (!sampleCodeBySampleNo[sampleNo]) {
        sampleCodeBySampleNo[sampleNo] = `${baseReqNo}-${sampleNoCodePart(sampleNo)}`;
      }
    }

    let insertQuery = "";

    for (const item of items) {
      let fields = [];
      const sampleNo = (item.SampleNo || '').toString();
      const sampleCode = sampleCodeBySampleNo[sampleNo];

      function pushField(name, value) {
        if (value !== '' && value !== null && value !== undefined) {
          if (typeof value === 'number') {
            fields.push(`[${name}] = ${value}`);
          } else {
            const escapedValue = value.toString().replace(/'/g, "''");
            fields.push(`[${name}] = N'${escapedValue}'`);
          }
        } else {
          fields.push(`[${name}] = NULL`);
        }
      }

      pushField("ReqNo", baseReqNo);
      pushField("SampleCode", sampleCode);
      pushField("ReqSection", user_section);
      pushField("ReqDate", now);
      pushField("ReqUser", user_name);
      pushField("CustFull", item.CustFull);
      pushField("CustShort", item.CustShort);
      pushField("SampleNo", item.SampleNo);
      pushField("SampleName", item.SampleName);
      pushField("Furnance", item.Furnance);
      pushField("Instrument", item.Instrument);
      pushField("ItemNo", item.ItemNo);
      pushField("ItemName", item.ItemName);
      pushField("ReportName", item.ReportName);
      pushField("NewOil", item.NewOil);
      pushField("Min", item.Min);
      pushField("Max", item.Max);
      pushField("Remark", item.Remark);
      pushField("FormatReport", item.FormatReport);
      pushField("SamplingDate", item.SamplingDate);
      pushField("Cost", requestCostForItem(item, sampleCode));
      pushField("RequestStatus", "WAIT SAMPLE");
      pushField("SampleStatus", "WAIT SAMPLE");
      pushField("ItemStatus", "WAIT SAMPLE");

      let insert = `
      INSERT INTO [QO].[dbo].[Request] (
        ${fields.map(field => field.split('=')[0].trim()).join(',\n')}
      )
      VALUES (
      ${fields.map(field => field.split('=').slice(1).join('=').trim()).join(',\n')}
      )
      `;
      insertQuery += insert + '\n';
    }

    const db = await mssql.qurey(insertQuery);
    const inserted = (db.rowsAffected || []).reduce((sum, count) => sum + count, 0);

    if (inserted === 0) {
      return res.status(400).json({ message: 'Insert failed' });
    }

    const sampleTags = Object.entries(sampleCodeBySampleNo).map(([sampleNo, sampleCode]) => {
      const first = items.find((item) => (item.SampleNo || '').toString() === sampleNo) || {};
      return {
        ReqNo: baseReqNo,
        SampleCode: sampleCode,
        SampleNo: sampleNo,
        SampleName: first.SampleName || '',
        CustFull: first.CustFull || '',
        CustShort: first.CustShort || '',
        Furnance: first.Furnance || '',
        SamplingDate: first.SamplingDate || '',
      };
    });

    return res.status(200).json({ message: baseReqNo, reqNo: baseReqNo, sampleTags, inserted });

  } catch (err) {
    console.error("Insert Error:", err);
    return res.status(500).json({ message: err.message });
  }
});
router.post('/QO/searchReqNoData', async (req, res) => {
  console.log("--searchReqNoData--");
  let output = [];

  const inputReqNo = req.body.ReqNo || "";

  try {

    const searchQuery = `SELECT * FROM [QO].[dbo].[Request] WHERE SampleCode = '${inputReqNo}' ORDER BY ItemNo `;
    const finalResult = await mssql.qurey(searchQuery);

    if (
      finalResult["recordsets"].length > 0 &&
      finalResult["recordsets"][0].length > 0
    ) {
      output = finalResult["recordsets"][0];
      return res.status(200).json(output);
    } else {
      return res.status(404).json({ message: "ไม่พบข้อมูลลูกค้า" });
    }
  } catch (error) {
    console.error("DB Error:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดในการค้นหา" });
  }
});

router.post('/QO/sendSample', async (req, res) => {
  console.log("--sendSample--");

  let dataRow = JSON.parse(req.body.dataRow);
  let allQueries = '';
  const now = ISOToLocal(new Date());

  for (const data of dataRow) {
    let fields = [];

    function pushField(name, value) {
      if (value !== '' && value !== null && value !== undefined) {
        const escapedValue = value.toString().replace(/'/g, "''");
        fields.push(`[${name}] = N'${escapedValue}'`);
      } else {
        fields.push(`[${name}] = NULL`);
      }
    }

    pushField("RequestStatus", "SEND SAMPLE");
    pushField("SampleStatus", "SEND SAMPLE");
    pushField("ItemStatus", "SEND SAMPLE");
    pushField("SamplingDate", convertToISODate(data.SamplingDate));
    pushField("UserSend", req.body.UserSend);
    pushField("SendDate", now);

    let query = `
      UPDATE [QO].[dbo].[Request]
      SET ${fields.join(',\n')}
      WHERE Id = '${data.Id}';
    `;
    allQueries += query + '\n';
  }

  try {
    await mssql.qurey(allQueries);

    return res.status(200).json('อัปเดทข้อมูลสำเร็จ');
  } catch (error) {
    console.error("Update Failed", error);
    return res.status(400).json('อัปเดทข้อมูลไม่สำเร็จ');
  }
});

router.post('/QO/receiveSample', async (req, res) => {
  console.log("--receiveSample--");
  let dataRow = JSON.parse(req.body.dataRow);
  const now = ISOToLocal(new Date());
  const nowISO = new Date().toISOString().split('T')[0];
  let allQueries = '';

  await loadHolidays();

  const analysisDueResult = await calculateAnalysisDue(nowISO, req.body.AnalysisDue);
  const analysisDueDate = analysisDueResult.AnalysisDue;

  for (const data of dataRow) {
    let fields = [];

    function pushField(name, value) {
      if (value !== '' && value !== null && value !== undefined) {
        const escapedValue = value.toString().replace(/'/g, "''");
        fields.push(`[${name}] = N'${escapedValue}'`);
      } else {
        fields.push(`[${name}] = NULL`);
      }
    }

    pushField("RequestStatus", "RECEIVE SAMPLE");
    pushField("SampleStatus", "RECEIVE SAMPLE");
    pushField("ItemStatus", "RECEIVE SAMPLE");
    pushField("Receiver", req.body.Receiver);
    pushField("ReceivedDate", now);
    pushField("AnalysisDue", analysisDueDate);

    let query = `
      UPDATE [QO].[dbo].[Request]
      SET ${fields.join(',\n')}
      WHERE Id = '${data.Id}';
    `;
    allQueries += query + '\n';
  }

  try {
    await mssql.qurey(allQueries);

    return res.status(200).json('อัปเดทข้อมูลสำเร็จ');
  } catch (error) {
    console.error("Update Failed", error);
    return res.status(400).json('อัปเดทข้อมูลไม่สำเร็จ');
  }
});

router.post('/QO/rejectRequest', async (req, res) => {
  //-------------------------------------
  console.log("--rejectRequest--");
  //-------------------------------------
  const now = ISOToLocal(new Date());

  let fields = [];

  function pushField(name, value) {
    if (value !== '') {
      const escapedValue = value.toString().replace(/'/g, "''");
      fields.push(`[${name}] = N'${escapedValue}'`);
    } else {
      fields.push(`[${name}] = NULL`);
    }
  }

  pushField("RequestStatus", "REJECT");
  pushField("SampleStatus", "REJECT");
  pushField("ItemStatus", "REJECT");
  pushField("UserReject", req.body.UserReject);
  pushField("RejectDate", now);
  pushField("RemarkReject", req.body.RemarkReject);

  let query = `
        UPDATE [QO].[dbo].[Request]
        SET ${fields.join(',\n')}
        WHERE SampleCode = '${(req.body.SampleCode || req.body.ReqNo || '').toString().replace(/'/g, "''")}'
        `;
  // console.log(query);
  // let db = await mssql.qurey(query);
  // console.log(db);
  try {
    await mssql.qurey(query);

    return res.status(200).json('อัปเดทข้อมูลสำเร็จ');
  } catch (error) {
    console.error("Update Failed", error);
    return res.status(400).json('อัปเดทข้อมูลไม่สำเร็จ');
  }

  // if (db["rowsAffected"][0] > 0) {
  //   console.log("Update Success");
  //   return res.status(200).json('อัปเดทข้อมูลสำเร็จ');
  //   // return res.status(400).json('อัปเดทข้อมูลสำเร็จ');
  // } else {
  //   console.log("Update Failed");
  //   return res.status(400).json('อัปเดทข้อมูลไม่สำเร็จ');
  // }
  // //-------------------------------------

});

router.post('/QO/searchSendSample', async (req, res) => {
  console.log("--QO-searchSendSample--");
  const query = `
    SELECT *
    FROM [QO].[dbo].[Request]
    WHERE ItemStatus = 'SEND SAMPLE'
    ORDER BY ReqNo DESC, SampleNo, ItemNo
  `;

  try {
    const db = await mssql.qurey(query);
    const output = db["recordsets"]?.[0] || [];
    if (output.length > 0) return res.status(200).json(output);
    return res.status(400).json({ message: 'No data' });
  } catch (error) {
    console.error("DB Error:", error);
    return res.status(500).json({ message: error.message });
  }
});

router.post('/QO/SearchSendSampleForReqNo', async (req, res) => {
  console.log("--QO-SearchSendSampleForReqNo--");
  const sampleCode = (req.body.SampleCode || req.body.ReqNo || '').toString().replace(/'/g, "''");
  const query = `
    SELECT *
    FROM [QO].[dbo].[Request]
    WHERE SampleCode = N'${sampleCode}' AND ItemStatus = 'SEND SAMPLE'
    ORDER BY ReqNo DESC, SampleNo, ItemNo
  `;

  try {
    const db = await mssql.qurey(query);
    const output = db["recordsets"]?.[0] || [];
    if (output.length > 0) return res.status(200).json(output);
    return res.status(400).json({ message: 'No data' });
  } catch (error) {
    console.error("DB Error:", error);
    return res.status(500).json({ message: error.message });
  }
});

router.post('/QO/getReqDetail', async (req, res) => {
  console.log("--QO-getReqDetail--");

  try {
    const reqNo = (req.body.ReqNo || '').toString().trim();
    if (!reqNo) {
      return res.status(400).json({ message: 'Missing ReqNo' });
    }

    const query = `
      SELECT ${_qoRequestStructureColumns()}
      FROM [QO].[dbo].[Request]
      WHERE [ReqNo] = N'${_esc(reqNo)}'
      ORDER BY [SampleNo], [ItemNo];
    `;

    const db = await mssql.qurey(query);
    const output = db["recordsets"]?.[0] || [];
    if (output.length > 0) return res.status(200).json(output);
    return res.status(400).json({ message: 'No data' });
  } catch (error) {
    console.error("QO getReqDetail Error:", error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
});

router.post('/QO/UpdateReportGraph', async (req, res) => {
  console.log("--QO-UpdateReportGraph--");

  try {
    const reqNo = (req.body.ReqNo || '').toString().trim();
    const sampleCode = (req.body.SampleCode || '').toString().trim();
    const reportGraph = (req.body.Report_Graph || req.body.ReportGraph || '').toString().trim();

    if (!reqNo || !sampleCode) {
      return res.status(400).json({ message: 'Missing ReqNo or SampleCode' });
    }

    const query = `
      UPDATE [QO].[dbo].[Request]
      SET [Report_Graph] = ${_sqlTextValue(reportGraph)}
      WHERE [ReqNo] = N'${_esc(reqNo)}'
        AND [SampleCode] = N'${_esc(sampleCode)}';
    `;

    const db = await mssql.qurey(query);
    const affected = db?.rowsAffected?.reduce?.((sum, value) => sum + value, 0) ?? 0;
    if (affected === 0) return res.status(400).json({ message: 'No row updated' });
    return res.status(200).json({ message: 'Update Success', rowsAffected: affected });
  } catch (error) {
    console.error("QO UpdateReportGraph Error:", error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
});

router.post('/QO/UpdateSamplingDate', async (req, res) => {
  console.log("--QO-UpdateSamplingDate--");

  try {
    const reqNo = (req.body.ReqNo || '').toString().trim();
    const sampleCode = (req.body.SampleCode || '').toString().trim();
    const samplingDate = convertToISODate((req.body.SamplingDate || '').toString().trim());
    const userEditSampling = (req.body.UserEditSampling || req.body.UserEdit || '').toString().trim();
    const now = ISOToLocal(new Date());

    if (!reqNo || !sampleCode || !samplingDate) {
      return res.status(400).json({ message: 'Missing ReqNo, SampleCode or SamplingDate' });
    }

    const query = `
      UPDATE [QO].[dbo].[Request]
      SET
        [SamplingDate] = ${_sqlTextValue(samplingDate)},
        [UserEditSampling] = ${_sqlTextValue(userEditSampling)},
        [EditSamplingDate] = ${_sqlTextValue(now)}
      WHERE [ReqNo] = N'${_esc(reqNo)}'
        AND [SampleCode] = N'${_esc(sampleCode)}';
    `;

    const db = await mssql.qurey(query);
    const affected = db?.rowsAffected?.reduce?.((sum, value) => sum + value, 0) ?? 0;
    if (affected === 0) return res.status(400).json({ message: 'No row updated' });
    return res.status(200).json({ message: 'Update SamplingDate success', rowsAffected: affected });
  } catch (error) {
    console.error("QO UpdateSamplingDate Error:", error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
});

router.post('/QO/UpdateReceivedDate', async (req, res) => {
  console.log("--QO-UpdateReceivedDate--");

  try {
    const reqNo = (req.body.ReqNo || '').toString().trim();
    const sampleCode = (req.body.SampleCode || '').toString().trim();
    const receivedDate = (req.body.ReceivedDate || '').toString().trim();
    const userEditReceived = (req.body.UserEditReceived || req.body.UserEdit || '').toString().trim();
    const now = ISOToLocal(new Date());

    if (!reqNo || !sampleCode || !receivedDate) {
      return res.status(400).json({ message: 'Missing ReqNo, SampleCode or ReceivedDate' });
    }

    const query = `
      UPDATE [QO].[dbo].[Request]
      SET
        [ReceivedDate] = ${_sqlTextValue(receivedDate)},
        [UserEditReceived] = ${_sqlTextValue(userEditReceived)},
        [EditReceivedDate] = ${_sqlTextValue(now)}
      WHERE [ReqNo] = N'${_esc(reqNo)}'
        AND [SampleCode] = N'${_esc(sampleCode)}';
    `;

    const db = await mssql.qurey(query);
    const affected = db?.rowsAffected?.reduce?.((sum, value) => sum + value, 0) ?? 0;
    if (affected === 0) return res.status(400).json({ message: 'No row updated' });
    return res.status(200).json({ message: 'Update ReceivedDate success', rowsAffected: affected });
  } catch (error) {
    console.error("QO UpdateReceivedDate Error:", error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
});

router.post('/QO/UpdateAnalysisDue', async (req, res) => {
  console.log("--QO-UpdateAnalysisDue--");

  try {
    const requestId = (req.body.Id || '').toString().trim();
    const analysisDue = convertToISODate((req.body.AnalysisDue || '').toString().trim());
    const userEditAnalysisDue = (req.body.UserEditAnalysisDue || req.body.UserEdit || '').toString().trim();
    const now = ISOToLocal(new Date());

    if (!requestId || !analysisDue) {
      return res.status(400).json({ message: 'Missing Id or AnalysisDue' });
    }

    const query = `
      UPDATE [QO].[dbo].[Request]
      SET
        [AnalysisDue] = ${_sqlTextValue(analysisDue)},
        [UserEditAnalysisDue] = ${_sqlTextValue(userEditAnalysisDue)},
        [EditAnalysisDueDate] = ${_sqlTextValue(now)}
      WHERE CONVERT(NVARCHAR(4000), [Id]) = N'${_esc(requestId)}';
    `;

    const db = await mssql.qurey(query);
    const affected = db?.rowsAffected?.reduce?.((sum, value) => sum + value, 0) ?? 0;
    if (affected === 0) return res.status(400).json({ message: 'No row updated' });
    return res.status(200).json({ message: 'Update AnalysisDue success', rowsAffected: affected });
  } catch (error) {
    console.error("QO UpdateAnalysisDue Error:", error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
});

router.post('/QO/ReportReconfirmItem', async (req, res) => {
  console.log("--QO-ReportReconfirmItem--");

  try {
    const requestId = (req.body.Id || '').toString().trim();

    if (!requestId) {
      return res.status(400).json({ message: 'Missing Id' });
    }

    const targetDb = await mssql.qurey(`
      SELECT TOP 1
        CONVERT(NVARCHAR(4000), [SampleCode]) AS [SampleCode],
        CONVERT(NVARCHAR(4000), [Instrument]) AS [Instrument]
      FROM [QO].[dbo].[Request]
      WHERE CONVERT(NVARCHAR(4000), [Id]) = N'${_esc(requestId)}';
    `);
    const target = targetDb?.recordset?.[0] || targetDb?.recordsets?.[0]?.[0];

    if (!target) {
      return res.status(400).json({ message: 'Request item not found' });
    }

    const targetSampleCode = (target.SampleCode || '').toString().trim();
    const targetInstrument = (target.Instrument || '').toString().trim();
    const isCoolingCurve = targetInstrument.toUpperCase() === 'COOLING CURVE MEASUREMENT';
    const targetWhere = isCoolingCurve
      ? `
        CONVERT(NVARCHAR(4000), [SampleCode]) = N'${_esc(targetSampleCode)}'
        AND UPPER(LTRIM(RTRIM(ISNULL([Instrument], N'')))) = N'COOLING CURVE MEASUREMENT'
      `
      : `CONVERT(NVARCHAR(4000), [Id]) = N'${_esc(requestId)}'`;

    const query = `
      UPDATE [QO].[dbo].[Request]
      SET
        [RequestStatus] = N'WAIT ANALYSIS',
        [SampleStatus] = N'WAIT ANALYSIS',
        [ItemStatus] = N'REQ RECONFIRM'
      WHERE ${targetWhere}
        AND UPPER(LTRIM(RTRIM(ISNULL([ItemStatus], N'')))) = N'COMPLETE';
    `;

    const db = await mssql.qurey(query);
    const affected = db?.rowsAffected?.reduce?.((sum, value) => sum + value, 0) ?? 0;
    if (affected === 0) return res.status(400).json({ message: 'No row updated' });
    return res.status(200).json({ message: 'Reconfirm success', rowsAffected: affected });
  } catch (error) {
    console.error("QO ReportReconfirmItem Error:", error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
});

router.post('/QO/ReportApproveReconfirmItem', async (req, res) => {
  console.log("--QO-ReportApproveReconfirmItem--");

  try {
    const requestId = (req.body.Id || '').toString().trim();
    const approve = req.body.Approve === true || req.body.Approve === 'true' || req.body.Approve === 'APPROVE';
    const reqNo = (req.body.ReqNo || '').toString().trim();
    const sampleCode = (req.body.SampleCode || '').toString().trim();
    const instrument = (req.body.Instrument || '').toString().trim();

    if (!requestId) {
      return res.status(400).json({ message: 'Missing Id' });
    }

    // Cooling curve items all come from one measurement/graph, so approving or
    // rejecting a reconfirm must apply to every cooling item of that sample no,
    // not just the single clicked row (mirrors ReportReconfirmItem).
    const isCoolingCurve = instrument.toUpperCase() === 'COOLING CURVE MEASUREMENT';
    const requestTargetWhere = isCoolingCurve && sampleCode
      ? `CONVERT(NVARCHAR(4000), [SampleCode]) = N'${_esc(sampleCode)}'
          AND UPPER(LTRIM(RTRIM(ISNULL([Instrument], N'')))) = N'COOLING CURVE MEASUREMENT'`
      : `CONVERT(NVARCHAR(4000), [Id]) = N'${_esc(requestId)}'`;

    let actionQuery = '';

    if (approve) {
      if (!instrument) {
        return res.status(400).json({ message: 'Missing Instrument' });
      }

      const targetDueDb = await mssql.qurey(`
        SELECT TOP 1
          COALESCE(
            CONVERT(NVARCHAR(10), TRY_CONVERT(DATE, [AnalysisDue]), 23),
            CONVERT(NVARCHAR(4000), [AnalysisDue])
          ) AS [AnalysisDue]
        FROM [QO].[dbo].[Request]
        WHERE CONVERT(NVARCHAR(4000), [Id]) = N'${_esc(requestId)}'
          AND UPPER(LTRIM(RTRIM(ISNULL([ItemStatus], N'')))) IN (N'REQ RECONFIRM', N'REQUEST RECONFIRM');
      `);
      const targetDue = (targetDueDb?.recordset?.[0]?.AnalysisDue || targetDueDb?.recordsets?.[0]?.[0]?.AnalysisDue || '').toString().trim();

      if (!targetDue) {
        return res.status(400).json({ message: 'Missing AnalysisDue for approve reconfirm' });
      }

      await loadHolidays();
      const dueResult = await calculateAnalysisDue(convertToISODate(targetDue), 2);
      const nextDueSql = _sqlTextValue(dueResult.AnalysisDue);
      const deleteColumns = ['ReqNo', 'SampleCode', 'Instrument', 'ItemNo', 'ItemName', 'ReportName'];
      const instrumentTableName = _qoInstrumentTableName(instrument);
      await _loadQoInstrumentTableMeta([instrumentTableName], deleteColumns);
      const instrumentTable = _qoInstrumentTableFromName(instrumentTableName);
      // Cooling table only holds cooling records, so SampleCode alone selects
      // every cooling item of the sample; other instruments stay per-item.
      const deleteConditions = isCoolingCurve && sampleCode
        ? `ISNULL(CONVERT(NVARCHAR(4000), ${_sqlIdentifier('SampleCode')}), N'') = N'${_esc(sampleCode)}'`
        : deleteColumns
          .map((column) => {
            const identifier = _sqlIdentifier(column);
            return `ISNULL(CONVERT(NVARCHAR(4000), ${identifier}), N'') = N'${_esc(req.body[column] || '')}'`;
          })
          .join('\n            AND ');

      actionQuery = `
        DELETE FROM ${instrumentTable}
        WHERE ${deleteConditions};

        IF @@ROWCOUNT = 0
          RAISERROR('Instrument approve reconfirm delete failed for Id: ${_esc(requestId)}', 16, 1);

        UPDATE [QO].[dbo].[Request]
        SET
          [ItemStatus] = N'RECONFIRM',
          [AnalysisDue] = ${nextDueSql},
          [Result_7] = NULL,
          [Result_8] = NULL,
          [ResultApprove] = NULL,
          [ItemApprover] = NULL,
          [ItemApproveDate] = NULL,
          [RemarkItemApprover] = NULL,
          [ReportApprover] = NULL,
          [ReportApproveDate] = NULL,
          [RemarkReportApprover] = NULL
        WHERE ${requestTargetWhere}
          AND UPPER(LTRIM(RTRIM(ISNULL([ItemStatus], N'')))) IN (N'REQ RECONFIRM', N'REQUEST RECONFIRM');

        IF @@ROWCOUNT = 0
          RAISERROR('Approve reconfirm failed for Id: ${_esc(requestId)}', 16, 1);
      `;
    } else {
      actionQuery = `
        UPDATE [QO].[dbo].[Request]
        SET
          [RequestStatus] = N'COMPLETE',
          [SampleStatus] = N'COMPLETE',
          [ItemStatus] = N'COMPLETE'
        WHERE ${requestTargetWhere}
          AND UPPER(LTRIM(RTRIM(ISNULL([ItemStatus], N'')))) IN (N'REQ RECONFIRM', N'REQUEST RECONFIRM');

        IF @@ROWCOUNT = 0
          RAISERROR('Reject reconfirm failed for Id: ${_esc(requestId)}', 16, 1);
      `;
    }

    const query = `
      SET XACT_ABORT ON;
      BEGIN TRY
        BEGIN TRANSACTION;
        ${actionQuery}
        IF @@TRANCOUNT > 0
          COMMIT TRANSACTION;
      END TRY
      BEGIN CATCH
        IF XACT_STATE() <> 0
          ROLLBACK TRANSACTION;
        THROW;
      END CATCH
    `;

    await mssql.qurey(query);
    return res.status(200).json({ message: approve ? 'Approve reconfirm success' : 'Reject reconfirm success' });
  } catch (error) {
    console.error("QO ReportApproveReconfirmItem Error:", error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
});

router.post('/QO/ReportApproveItems', async (req, res) => {
  console.log("--QO-ReportApproveItems--");

  try {
    const rows = Array.isArray(req.body.Rows)
      ? req.body.Rows
      : JSON.parse(req.body.Rows || '[]');
    const reportApprover = (req.body.ReportApprover || req.body.UserApprove || '').toString().trim();
    const now = ISOToLocal(new Date());

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'Please select approve or recheck report' });
    }

    if (!reportApprover) {
      return res.status(400).json({ message: 'Missing ReportApprover' });
    }

    const approverSql = _sqlTextValue(reportApprover);
    const approveDateSql = _sqlTextValue(now);
    let allQueries = '';
    const approvedSamples = new Set();
    const approvedReqNos = new Set();
    const hasRecheck = rows.some(
      (row) => (row.Action || '').toString().trim().toUpperCase() === 'RECHECK'
    );
    if (hasRecheck) {
      await loadHolidays();
    }

    for (const row of rows) {
      const requestId = (row.Id || '').toString().trim();
      const action = (row.Action || '').toString().trim().toUpperCase();
      const reqNo = (row.ReqNo || '').toString().trim();
      const sampleCode = (row.SampleCode || '').toString().trim();
      const instrument = (row.Instrument || '').toString().trim();
      const remark = (row.RemarkReportApprover || row.Remark || '').toString();

      if (!requestId) {
        return res.status(400).json({ message: 'Missing row Id' });
      }

      if (action !== 'APPROVE' && action !== 'RECHECK') {
        return res.status(400).json({ message: 'Invalid report approve action' });
      }

      const escapedRequestId = _esc(requestId);

      if (action === 'APPROVE') {
        if (reqNo && sampleCode) {
          approvedSamples.add(`${reqNo}\u0001${sampleCode}`);
          approvedReqNos.add(reqNo);
        }

        allQueries += `
          UPDATE [QO].[dbo].[Request]
          SET
            [ItemStatus] = N'COMPLETE',
            [ReportApprover] = ${approverSql},
            [ReportApproveDate] = ${approveDateSql},
            [RemarkReportApprover] = ${_sqlTextValue(remark)}
          WHERE CONVERT(NVARCHAR(4000), [Id]) = N'${escapedRequestId}';

          IF @@ROWCOUNT = 0
            RAISERROR('Report approve failed for Id: ${escapedRequestId}', 16, 1);
        `;
      } else {
        const rawDue = (row.AnalysisDue || row.CurrentAnalysisDue || row.DueDate || '').toString().trim();
        if (!rawDue) {
          return res.status(400).json({ message: 'Missing AnalysisDue for report recheck' });
        }
        if (!instrument) {
          return res.status(400).json({ message: 'Missing Instrument for report recheck' });
        }

        const deleteColumns = ['ReqNo', 'SampleCode', 'Instrument', 'ItemNo', 'ItemName', 'ReportName'];
        const instrumentTableName = _qoInstrumentTableName(instrument);
        await _loadQoInstrumentTableMeta([instrumentTableName], deleteColumns);
        const instrumentTable = _qoInstrumentTableFromName(instrumentTableName);
        const deleteConditions = deleteColumns
          .map((column) => {
            const identifier = _sqlIdentifier(column);
            return `ISNULL(CONVERT(NVARCHAR(4000), ${identifier}), N'') = N'${_esc(row[column] || '')}'`;
          })
          .join('\n            AND ');

        const dueResult = await calculateAnalysisDue(convertToISODate(rawDue), 2);
        const nextDueSql = _sqlTextValue(dueResult.AnalysisDue);

        allQueries += `
          DELETE FROM ${instrumentTable}
          WHERE ${deleteConditions};

          IF @@ROWCOUNT = 0
            RAISERROR('Instrument report recheck delete failed for Id: ${escapedRequestId}', 16, 1);

          UPDATE [QO].[dbo].[Request]
          SET
            [ItemStatus] = N'RECHECK 2',
            [AnalysisDue] = ${nextDueSql},
            [UserAnalysis] = NULL,
            [AnalysisDate] = NULL,
            [Result_5] = NULL,
            [Result_6] = NULL,
            [Result_7] = NULL,
            [Result_8] = NULL,
            [ResultApprove] = NULL,
            [ItemApprover] = NULL,
            [ItemApproveDate] = NULL,
            [RemarkItemApprover] = NULL,
            [ReportApprover] = NULL,
            [ReportApproveDate] = NULL,
            [RemarkReportApprover] = NULL
          WHERE CONVERT(NVARCHAR(4000), [Id]) = N'${escapedRequestId}';

          IF @@ROWCOUNT = 0
            RAISERROR('Report recheck failed for Id: ${escapedRequestId}', 16, 1);
        `;
      }
    }

    for (const key of approvedSamples) {
      const [reqNo, sampleCode] = key.split('\u0001');
      const escapedReqNo = _esc(reqNo);
      const escapedSampleCode = _esc(sampleCode);

      allQueries += `
        UPDATE [QO].[dbo].[Request]
        SET [SampleStatus] = N'COMPLETE'
        WHERE [ReqNo] = N'${escapedReqNo}'
          AND [SampleCode] = N'${escapedSampleCode}'
          AND UPPER(LTRIM(RTRIM(ISNULL([RequestStatus], N'')))) NOT IN (N'REJECT', N'CANCEL')
          AND NOT EXISTS (
            SELECT 1
            FROM [QO].[dbo].[Request]
            WHERE [ReqNo] = N'${escapedReqNo}'
              AND [SampleCode] = N'${escapedSampleCode}'
              AND UPPER(LTRIM(RTRIM(ISNULL([ItemStatus], N'')))) <> N'COMPLETE'
          );
      `;
    }

    for (const reqNo of approvedReqNos) {
      const escapedReqNo = _esc(reqNo);

      allQueries += `
        UPDATE [QO].[dbo].[Request]
        SET [RequestStatus] = N'COMPLETE'
        WHERE [ReqNo] = N'${escapedReqNo}'
          AND UPPER(LTRIM(RTRIM(ISNULL([RequestStatus], N'')))) NOT IN (N'REJECT', N'CANCEL')
          AND EXISTS (
            SELECT 1
            FROM [QO].[dbo].[Request]
            WHERE [ReqNo] = N'${escapedReqNo}'
              AND UPPER(LTRIM(RTRIM(ISNULL([SampleStatus], N'')))) NOT IN (N'REJECT', N'CANCEL')
          )
          AND NOT EXISTS (
            SELECT 1
            FROM [QO].[dbo].[Request]
            WHERE [ReqNo] = N'${escapedReqNo}'
              AND UPPER(LTRIM(RTRIM(ISNULL([SampleStatus], N'')))) NOT IN (N'REJECT', N'CANCEL')
              AND UPPER(LTRIM(RTRIM(ISNULL([SampleStatus], N'')))) <> N'COMPLETE'
          );
      `;
    }

    const query = `
      SET XACT_ABORT ON;
      BEGIN TRY
        BEGIN TRANSACTION;
        ${allQueries}
        IF @@TRANCOUNT > 0
          COMMIT TRANSACTION;
      END TRY
      BEGIN CATCH
        IF XACT_STATE() <> 0
          ROLLBACK TRANSACTION;
        THROW;
      END CATCH
    `;

    await mssql.qurey(query);
    return res.status(200).json({ message: 'Report approve success' });
  } catch (error) {
    console.error("QO ReportApproveItems Error:", error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
});

router.post('/QO/getReqList', async (req, res) => {
  console.log("--QO-getReqList--");

  try {
    const reqNo = (req.body.ReqNo || '').toString().trim();
    const custFull = (req.body.CustFull || '').toString().trim();
    const analysisDueStart = (req.body.AnalysisDueStart || req.body.DueDateStart || '').toString().trim();
    const analysisDueEnd = (req.body.AnalysisDueEnd || req.body.DueDateEnd || '').toString().trim();
    const rowConditions = [];
    const groupConditions = [];

    if (reqNo) {
      rowConditions.push(`[ReqNo] LIKE N'%${_esc(reqNo)}%'`);
    }

    if (custFull && custFull !== 'All') {
      rowConditions.push(`[CustFull] = N'${_esc(custFull)}'`);
    }

    if (analysisDueStart) {
      groupConditions.push(`[DueDateRaw] >= CONVERT(DATE, N'${_esc(analysisDueStart)}')`);
    }

    if (analysisDueEnd) {
      groupConditions.push(`[DueDateRaw] <= CONVERT(DATE, N'${_esc(analysisDueEnd)}')`);
    }

    const whereClause = rowConditions.length ? `WHERE ${rowConditions.join('\n      AND ')}` : '';
    const havingClause = groupConditions.length ? `WHERE ${groupConditions.join('\n      AND ')}` : '';
    const query = `
      WITH FilteredRequest AS (
        SELECT *
        FROM [QO].[dbo].[Request]
        ${whereClause}
      ),
      RequestGroup AS (
        SELECT
          [ReqNo],
          MAX([CustFull]) AS [CustFull],
          MIN([SamplingDate]) AS [SamplingDate],
          MIN([ReceivedDate]) AS [ReceivedDate],
          MAX([Receiver]) AS [Receiver],
          MAX([AnalysisDue]) AS [DueDateRaw],
          MAX([ReportApproveDate]) AS [ReportApproveDate],
          MAX([RequestStatus]) AS [FallbackRequestStatus]
        FROM FilteredRequest
        GROUP BY [ReqNo]
      ),
      RequestStatusRank AS (
        SELECT
          [ReqNo],
          [RequestStatus],
          ROW_NUMBER() OVER (
            PARTITION BY [ReqNo]
            ORDER BY
              CASE UPPER(LTRIM(RTRIM(ISNULL([RequestStatus], N''))))
                WHEN N'COMPLETE' THEN 6
                WHEN N'WAIT APPROVE' THEN 5
                WHEN N'WAIT ANALYSIS' THEN 4
                WHEN N'RECEIVE SAMPLE' THEN 3
                WHEN N'SEND SAMPLE' THEN 2
                WHEN N'WAIT SAMPLE' THEN 1
                WHEN N'CANCEL' THEN 0
                WHEN N'REJECT' THEN 0
                ELSE 0
              END DESC,
              [RequestStatus] ASC
          ) AS [StatusRowNo]
        FROM FilteredRequest
      )
      SELECT
        RequestGroup.[ReqNo],
        RequestGroup.[CustFull],
        RequestGroup.[SamplingDate],
        RequestGroup.[ReceivedDate],
        RequestGroup.[Receiver],
        RequestGroup.[DueDateRaw] AS [AnalysisDue],
        RequestGroup.[ReportApproveDate],
        COALESCE(RequestStatusRank.[RequestStatus], RequestGroup.[FallbackRequestStatus]) AS [RequestStatus]
      FROM RequestGroup
      LEFT JOIN RequestStatusRank
        ON RequestStatusRank.[ReqNo] = RequestGroup.[ReqNo]
       AND RequestStatusRank.[StatusRowNo] = 1
      ${havingClause}
      ORDER BY RequestGroup.[ReqNo] DESC;
    `;

    const db = await mssql.qurey(query);
    const output = db["recordsets"]?.[0] || [];
    if (output.length > 0) return res.status(200).json(output);
    return res.status(400).json({ message: 'No data' });
  } catch (error) {
    console.error("QO getReqList Error:", error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
});

router.post('/QO/CheckOldPassword', async (req, res) => {
  //-------------------------------------
  console.log("--CheckOldPassword--");
  //-------------------------------------
  // console.log(req.body);
  let query = `SELECT * From [SAR].[dbo].[Master_User] WHERE UserName = '${req.body.UserName}' 
                AND Password = '${req.body.OldPassword}'`;
  let db = await mssql.qurey(query);
  // console.log(query);
  // console.log(db);
  if (db["recordset"].length > 0) {
    // console.log('200');
    return res.status(200).json();
  } else {
    // console.log('400');
    return res.status(400).json('Old Password ไม่ถูกต้อง');
  }
  //-------------------------------------

});

router.post('/QO/UpdatePassword', async (req, res) => {
  //-------------------------------------
  console.log("--UpdatePassword--");
  //-------------------------------------
  let query = `
        UPDATE [SAR].[dbo].[Master_User]
        SET Password = '${req.body.NewPassword}'
        WHERE UserName = '${req.body.UserName}'
        `;
  // console.log(query);
  let db = await mssql.qurey(query);
  // console.log(db);
  if (db["rowsAffected"][0] > 0) {
    console.log("Update Success");
    return res.status(200).json('อัปเดทข้อมูลสำเร็จ');
    // return res.status(400).json('อัปเดทข้อมูลสำเร็จ');
  } else {
    console.log("Update Failed");
    return res.status(400).json('อัปเดทข้อมูลไม่สำเร็จ');
  }
  //-------------------------------------

});

router.post('/QO/listItem', async (req, res) => {
  console.log("--QO-listItem--");

  try {
    const dataRow = JSON.parse(req.body.dataRow || '[]');
    if (!Array.isArray(dataRow) || dataRow.length === 0) {
      return res.status(400).json({ message: 'No selected item' });
    }

    let allQueries = '';
    const now = ISOToLocal(new Date());
    const userListItem = req.body.UserListItem;
    const instrumentColumns = [
      'Id',
      'ReqNo',
      'SampleCode',
      'ItemStatus',
      'CustFull',
      'CustShort',
      'SampleNo',
      'SampleName',
      'Furnance',
      'Instrument',
      'ItemNo',
      'ItemName',
      'ReportName',
      'AnalysisDue',
      'UserListItem',
      'ListItemDate',
      'UserAnalysis',
      'AnalysisDate',
      'Picture',
      'ResultApprove',
      'ItemApprover',
      'ItemApproveDate',
    ];
    const duplicateCheckColumns = ['ReqNo', 'SampleCode', 'Instrument', 'ItemNo', 'ItemName', 'ReportName'];
    const optionalInstrumentColumns = [
      'Result_ppm_1',
      'Result_ppm_2',
      'SampleUse_1',
      'SampleUse_2',
      'CollectWater_1',
      'CollectWater_2',
      'SampleWeight_1',
      'SampleWeight_2',
      'W1_1',
      'W1_2',
      'W2_1',
      'W2_2',
      'W2_W1_1',
      'W2_W1_2',
      'W3_1',
      'W3_2',
      'Characteristic',
      'CTime_400',
      'CTime_300',
      'CPerformance',
      'RemarkItemApprover',
    ];
    const instrumentOnlyColumns = new Set(['UserAnalysis', 'AnalysisDate', ...optionalInstrumentColumns]);
    const targetTableNames = [...new Set(dataRow.map((row) => _qoInstrumentTableName(row.Instrument)))];
    const tableMetaByName = await _loadQoInstrumentTableMeta(targetTableNames, instrumentColumns);
    const optionalColumnsByName = await _loadQoInstrumentOptionalColumns(targetTableNames, optionalInstrumentColumns);

    for (const data of dataRow) {
      const fields = [];

      function pushField(name, value) {
        if (value !== '' && value !== null && value !== undefined) {
          const escapedValue = value.toString().replace(/'/g, "''");
          fields.push(`[${name}] = N'${escapedValue}'`);
        } else {
          fields.push(`[${name}] = NULL`);
        }
      }

      let itemStatusValue = 'LIST ITEM';
      if (data.ItemStatus === 'RECHECK 1') {
        itemStatusValue = 'LIST RECHECK 1';
      } else if (data.ItemStatus === 'RECHECK 2') {
        itemStatusValue = 'LIST RECHECK 2';
      } else if (data.ItemStatus === 'RECONFIRM') {
        itemStatusValue = 'LIST RECONFIRM';
      }

      pushField("ItemStatus", itemStatusValue);
      if (data.ItemStatus === 'RECEIVE SAMPLE') {
        pushField("RequestStatus", "WAIT ANALYSIS");
        pushField("SampleStatus", "WAIT ANALYSIS");
      }

      pushField("UserListItem", userListItem);
      pushField("ListItemDate", now);

      const escapedId = _esc(data.Id);
      const instrumentTableName = _qoInstrumentTableName(data.Instrument);
      const instrumentTable = _qoInstrumentTableFromName(instrumentTableName);
      const tableMeta = tableMetaByName.get(instrumentTableName);
      const optionalColumnsForTable = optionalColumnsByName.get(instrumentTableName) || new Set();
      const instrumentColumnsForTable = [
        ...instrumentColumns,
        ...optionalInstrumentColumns.filter((column) => optionalColumnsForTable.has(column)),
      ];
      const columnsForTable = tableMeta?.idIsIdentity
        ? instrumentColumnsForTable.filter((column) => column !== 'Id')
        : instrumentColumnsForTable;
      const insertColumns = columnsForTable.map(_sqlIdentifier).join(',\n');
      const selectColumns = columnsForTable
        .map((column) => instrumentOnlyColumns.has(column) ? `NULL AS ${_sqlIdentifier(column)}` : `source.${_sqlIdentifier(column)}`)
        .join(',\n');
      const duplicateConditions = duplicateCheckColumns
        .map((column) => {
          const identifier = _sqlIdentifier(column);
          return `ISNULL(CONVERT(NVARCHAR(4000), target.${identifier}), N'') = ISNULL(CONVERT(NVARCHAR(4000), source.${identifier}), N'')`;
        })
        .join('\n          AND ');

      allQueries += `
        UPDATE [QO].[dbo].[Request]
        SET ${fields.join(',\n')}
        WHERE Id = N'${escapedId}';
        IF @@ROWCOUNT = 0
          RAISERROR('Update failed for Id: ${escapedId}', 16, 1);

        INSERT INTO ${instrumentTable}
        (
          ${insertColumns}
        )
        SELECT
          ${selectColumns}
        FROM [QO].[dbo].[Request] source
        WHERE source.[Id] = N'${escapedId}'
          AND NOT EXISTS (
            SELECT 1
            FROM ${instrumentTable} target
            WHERE ${duplicateConditions}
          );

        IF @@ROWCOUNT = 0
          RAISERROR('Instrument list item insert skipped for Id: ${escapedId}, table: ${instrumentTableName}', 16, 1);
      `;
    }

    const transactionQuery = `
      IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

      SET XACT_ABORT ON;
      BEGIN TRY
        BEGIN TRANSACTION;
        ${allQueries}
        IF @@TRANCOUNT > 0
          COMMIT TRANSACTION;
      END TRY
      BEGIN CATCH
        IF @@TRANCOUNT > 0
          ROLLBACK TRANSACTION;
        THROW;
      END CATCH
    `;

    await mssql.qurey(transactionQuery);
    return res.status(200).json('Update Success');
  } catch (error) {
    console.error("QO listItem Error:", error);
    const message = error.message || 'Server error';
    const isConfigError = message.toLowerCase().includes('missing instrument');
    return res.status(isConfigError ? 400 : 500).json({ message });
  }
});

router.post('/QO/returnItem', async (req, res) => {
  console.log("--QO-returnItem--");

  try {
    const data = typeof req.body.dataRow === 'string'
      ? JSON.parse(req.body.dataRow || '{}')
      : (req.body.dataRow || {});
    const statusMap = {
      'LIST ITEM': 'RECEIVE SAMPLE',
      'LIST RECHECK 1': 'RECHECK 1',
      'LIST RECHECK 2': 'RECHECK 2',
      'LIST RECONFIRM': 'RECONFIRM',
    };
    const itemStatus = String(data.ItemStatus || '').trim().toUpperCase();
    const newStatus = statusMap[itemStatus];
    const resultClearColumnsByStatus = {
      'LIST ITEM': ['Result_1', 'Result_2'],
      'LIST RECHECK 1': ['Result_3', 'Result_4'],
      'LIST RECHECK 2': ['Result_5', 'Result_6'],
      'LIST RECONFIRM': ['Result_7', 'Result_8'],
    };

    if (!data.Id) {
      return res.status(400).json({ message: 'Missing Id' });
    }

    if (!data.SampleCode) {
      return res.status(400).json({ message: 'Missing SampleCode' });
    }

    if (!newStatus) {
      return res.status(400).json({ message: `Cannot return item status: ${data.ItemStatus || '-'}` });
    }

    const deleteColumns = ['ReqNo', 'SampleCode', 'Instrument', 'ItemNo', 'ItemName', 'ReportName'];
    const instrumentTableName = _qoInstrumentTableName(data.Instrument);
    await _loadQoInstrumentTableMeta([instrumentTableName], deleteColumns);
    const optionalColumnsByTable = await _loadQoInstrumentOptionalColumns([instrumentTableName], ['Picture']);
    const instrumentHasPicture = optionalColumnsByTable.get(instrumentTableName)?.has('Picture') || false;
    const baseReturnClearColumns = [
      'UserAnalysis',
      'AnalysisDate',
      'Picture',
      'ResultApprove',
      'ItemApprover',
      'ItemApproveDate',
      'RemarkItemApprover',
      'ReportApprover',
      'ReportApproveDate',
      'RemarkReportApprover',
    ];
    const resultClearColumns = [...new Set(Object.values(resultClearColumnsByStatus).flat())];
    const requestMetaColumns = [...baseReturnClearColumns, ...resultClearColumns];
    const requestReturnColumnsDb = await mssql.qurey(`
      SELECT c.name AS ColumnName
      FROM [QO].sys.tables t
      INNER JOIN [QO].sys.schemas s ON s.schema_id = t.schema_id
      INNER JOIN [QO].sys.columns c ON c.object_id = t.object_id
      WHERE s.name = N'dbo'
        AND t.name = N'Request'
        AND c.name IN (${requestMetaColumns.map((column) => `N'${_esc(column)}'`).join(', ')});
    `);
    const requestReturnColumns = new Set(
      (requestReturnColumnsDb["recordsets"]?.[0] || []).map((row) => row.ColumnName)
    );
    const requestHasPicture = requestReturnColumns.has('Picture');
    const requestHasReportGraph = requestReturnColumns.has('Report_Graph');
    const baseReturnClearSetters = baseReturnClearColumns
      .filter((column) => requestReturnColumns.has(column))
      .map((column) => `[${column}] = NULL`);
    const normalResultClearSetters = (resultClearColumnsByStatus[itemStatus] || [])
      .filter((column) => requestReturnColumns.has(column))
      .map((column) => `[${column}] = NULL`);
    const coolingResultClearSetters = Object.entries(resultClearColumnsByStatus)
      .flatMap(([status, columns]) => columns
        .filter((column) => requestReturnColumns.has(column))
        .map((column) =>
          `[${column}] = CASE WHEN UPPER(LTRIM(RTRIM(ISNULL([ItemStatus], N'')))) = N'${status}' THEN NULL ELSE [${column}] END`
        ));

    const instrumentTable = _qoInstrumentTableFromName(instrumentTableName);
    const escapedId = _esc(data.Id);
    const escapedSampleCode = _esc(data.SampleCode);
    const escapedInstrument = _esc(data.Instrument);
    const isCoolingCurveReturn = String(data.Instrument || '').trim().toLowerCase().includes('cooling curve');
    const picturePathQueries = [];
    if (requestHasPicture) {
      picturePathQueries.push(`
        SELECT DISTINCT CONVERT(NVARCHAR(4000), [Picture]) AS Picture
        FROM [QO].[dbo].[Request]
        WHERE [SampleCode] = N'${escapedSampleCode}'
          AND [Instrument] = N'${escapedInstrument}'
          AND NULLIF(LTRIM(RTRIM(CONVERT(NVARCHAR(4000), [Picture]))), N'') IS NOT NULL
      `);
    }
    if (requestHasReportGraph) {
      picturePathQueries.push(`
        SELECT DISTINCT CONVERT(NVARCHAR(4000), [Report_Graph]) AS Picture
        FROM [QO].[dbo].[Request]
        WHERE [SampleCode] = N'${escapedSampleCode}'
          AND [Instrument] = N'${escapedInstrument}'
          AND NULLIF(LTRIM(RTRIM(CONVERT(NVARCHAR(4000), [Report_Graph]))), N'') IS NOT NULL
      `);
    }
    if (instrumentHasPicture) {
      picturePathQueries.push(`
        SELECT DISTINCT CONVERT(NVARCHAR(4000), [Picture]) AS Picture
        FROM ${instrumentTable}
        WHERE [SampleCode] = N'${escapedSampleCode}'
          AND [Instrument] = N'${escapedInstrument}'
          AND NULLIF(LTRIM(RTRIM(CONVERT(NVARCHAR(4000), [Picture]))), N'') IS NOT NULL
      `);
    }
    const picturePaths = [];
    for (const picturePathQuery of picturePathQueries) {
      const picturePathDb = await mssql.qurey(picturePathQuery);
      const rows = picturePathDb["recordsets"]?.[0] || [];
      picturePaths.push(...rows.map((row) => (row.Picture || '').toString().trim()).filter(Boolean));
    }
    const requestFields = [
      `[ItemStatus] = N'${_esc(newStatus)}'`,
      `[UserListItem] = NULL`,
      `[ListItemDate] = NULL`,
      ...baseReturnClearSetters,
      ...normalResultClearSetters,
    ];

    if (itemStatus === 'LIST ITEM') {
      requestFields.push(`[RequestStatus] = N'RECEIVE SAMPLE'`);
      requestFields.push(`[SampleStatus] = N'RECEIVE SAMPLE'`);
    }

    const requestUpdateQuery = isCoolingCurveReturn ? `
        UPDATE [QO].[dbo].[Request]
        SET
          [ItemStatus] = CASE UPPER(LTRIM(RTRIM(ISNULL([ItemStatus], N''))))
            WHEN N'LIST ITEM' THEN N'RECEIVE SAMPLE'
            WHEN N'LIST RECHECK 1' THEN N'RECHECK 1'
            WHEN N'LIST RECHECK 2' THEN N'RECHECK 2'
            WHEN N'LIST RECONFIRM' THEN N'RECONFIRM'
            ELSE [ItemStatus]
          END,
          [UserListItem] = NULL,
          [ListItemDate] = NULL,
          ${baseReturnClearSetters.length > 0 ? `${baseReturnClearSetters.join(',\n          ')},` : ''}
          ${coolingResultClearSetters.length > 0 ? `${coolingResultClearSetters.join(',\n          ')},` : ''}
          [RequestStatus] = CASE UPPER(LTRIM(RTRIM(ISNULL([ItemStatus], N''))))
            WHEN N'LIST ITEM' THEN N'RECEIVE SAMPLE'
            ELSE [RequestStatus]
          END,
          [SampleStatus] = CASE UPPER(LTRIM(RTRIM(ISNULL([ItemStatus], N''))))
            WHEN N'LIST ITEM' THEN N'RECEIVE SAMPLE'
            ELSE [SampleStatus]
          END
        WHERE [SampleCode] = N'${escapedSampleCode}'
          AND [Instrument] = N'${escapedInstrument}'
          AND UPPER(LTRIM(RTRIM(ISNULL([ItemStatus], N'')))) IN (N'LIST ITEM', N'LIST RECHECK 1', N'LIST RECHECK 2', N'LIST RECONFIRM');
        IF @@ROWCOUNT = 0
          RAISERROR('Update failed for SampleCode: ${escapedSampleCode}', 16, 1);
    ` : `
        UPDATE [QO].[dbo].[Request]
        SET ${requestFields.join(',\n')}
        WHERE [Id] = N'${escapedId}';
        IF @@ROWCOUNT = 0
          RAISERROR('Update failed for Id: ${escapedId}', 16, 1);
    `;

    const deleteConditions = isCoolingCurveReturn
      ? `[SampleCode] = N'${escapedSampleCode}'\n        AND [Instrument] = N'${escapedInstrument}'`
      : deleteColumns
        .map((column) => {
          const identifier = _sqlIdentifier(column);
          return `ISNULL(CONVERT(NVARCHAR(4000), ${identifier}), N'') = N'${_esc(data[column])}'`;
        })
        .join('\n        AND ');

    const query = `
      IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

      SET XACT_ABORT ON;
      BEGIN TRY
        BEGIN TRANSACTION;

        ${requestUpdateQuery}

        DELETE FROM ${instrumentTable}
        WHERE ${deleteConditions};

        ${requestHasPicture ? `
        UPDATE [QO].[dbo].[Request]
        SET [Picture] = NULL
        WHERE [SampleCode] = N'${escapedSampleCode}'
          AND [Instrument] = N'${escapedInstrument}';
        ` : ''}

        ${instrumentHasPicture ? `
        UPDATE ${instrumentTable}
        SET [Picture] = NULL
        WHERE [SampleCode] = N'${escapedSampleCode}'
          AND [Instrument] = N'${escapedInstrument}';
        ` : ''}

        IF @@TRANCOUNT > 0
          COMMIT TRANSACTION;
      END TRY
      BEGIN CATCH
        IF @@TRANCOUNT > 0
          ROLLBACK TRANSACTION;
        THROW;
      END CATCH
    `;

    await mssql.qurey(query);
    const fileDeleteResult = _deleteCoolingUploadFiles(picturePaths);
    return res.status(200).json({
      message: 'Return Success',
      deletedFiles: fileDeleteResult.deletedFiles,
      fileDeleteErrors: fileDeleteResult.errors,
    });
  } catch (error) {
    console.error("QO returnItem Error:", error);
    const message = error.message || 'Server error';
    const isConfigError = message.toLowerCase().includes('missing instrument');
    return res.status(isConfigError ? 400 : 500).json({ message });
  }
});

router.post('/QO/SearchReceiveSample', async (req, res) => {
  console.log("--QO-SearchReceiveSample--");

  const instrument = (req.body.Instrument || '').toString().replace(/'/g, "''");
  const custFull = (req.body.CustFull || '').toString().replace(/'/g, "''");
  const conditions = [
    `ItemStatus IN ('RECEIVE SAMPLE', 'RECHECK 1', 'RECHECK 2', 'RECONFIRM')`,
  ];

  if (instrument && instrument !== 'All') {
    conditions.push(`[Instrument] = N'${instrument}'`);
  }

  if (custFull && custFull !== 'All') {
    conditions.push(`[CustFull] = N'${custFull}'`);
  }

  const query = `
    SELECT *
    FROM [QO].[dbo].[Request]
    WHERE ${conditions.join(' AND ')}
    ORDER BY AnalysisDue, SampleCode DESC, ItemNo;
  `;

  try {
    const db = await mssql.qurey(query);
    const output = db["recordsets"]?.[0] || [];
    if (output.length > 0) return res.status(200).json(output);
    return res.status(400).json({ message: 'No data' });
  } catch (error) {
    console.error("QO SearchReceiveSample Error:", error);
    return res.status(500).json({ message: error.message });
  }
});

router.post('/QO/SearchReqNoList', async (req, res) => {
  console.log("--QO-SearchReqNoList--");

  const sampleCode = (req.body.SampleCode || '').toString().replace(/'/g, "''");
  const instrument = (req.body.Instrument || '').toString().replace(/'/g, "''");
  const username = (req.body.Username || '').toString().replace(/'/g, "''");
  const itemStatusFilter = _qoItemStatusFilter(req.body.ListCheck, req.body.FinishCheck);
  if (!itemStatusFilter) {
    return res.status(400).json({ message: 'Please select LIST or FINISH' });
  }

  const conditions = [
    `[ItemStatus] IN (${itemStatusFilter})`,
  ];

  if (sampleCode) {
    conditions.push(`[SampleCode] LIKE N'%${sampleCode}%'`);
  }

  if (instrument && instrument !== 'All') {
    conditions.push(`[Instrument] = N'${instrument}'`);
  }

  if (username) {
    conditions.push(`[UserListItem] = N'${username}'`);
  }

  const query = `
    SELECT
      [Id],
      [ReqNo],
      [SampleCode],
      [RequestStatus],
      [SampleStatus],
      [ItemStatus],
      [CustFull],
      [CustShort],
      [SampleNo],
      [SampleName],
      [Furnance],
      [Instrument],
      [ItemNo],
      [ItemName],
      [ReportName],
      [NewOil],
      [Min],
      [Max],
      [Remark],
      [FormatReport],
      [ReqSection],
      [ReqDate],
      [ReqUser],
      [SamplingDate],
      [UserSend],
      [SendDate],
      [Receiver],
      [ReceivedDate],
      [UserEditReceived],
      [EditReceivedDate],
      [AnalysisDue],
      [UserEditAnalysisDue],
      [EditAnalysisDueDate],
      [UserReject],
      [RejectDate],
      [RemarkReject],
      [UserListItem],
      [ListItemDate]
    FROM [QO].[dbo].[Request]
    WHERE ${conditions.join(' AND ')}
    ORDER BY [AnalysisDue], [SampleCode] DESC, [ItemNo];
  `;

  try {
    const db = await mssql.qurey(query);
    const output = db["recordsets"]?.[0] || [];
    if (output.length > 0) return res.status(200).json(output);
    return res.status(400).json({ message: 'No data' });
  } catch (error) {
    console.error("QO SearchReqNoList Error:", error);
    return res.status(500).json({ message: error.message });
  }
});

router.post('/QO/InstrumentData', async (req, res) => {
  console.log("--QO-InstrumentData--");

  try {
    const instrument = (req.body.Instrument || '').toString().trim();
    const itemStatusFilter = _qoItemStatusFilter(req.body.ListCheck, req.body.FinishCheck);

    if (!instrument) {
      return res.status(400).json({ message: 'Missing Instrument' });
    }

    if (!itemStatusFilter) {
      return res.status(400).json({ message: 'Please select LIST or FINISH' });
    }

    const tableName = _qoInstrumentTableName(instrument);
    const table = _qoInstrumentTableFromName(tableName);
    const idColumn = await _resolveQoInstrumentRecordIdColumn(tableName, instrument);
    const optionalResultColumns = [
      'Result_1',
      'Result_2',
      'Result_ppm_1',
      'Result_ppm_2',
      'SampleUse_1',
      'SampleUse_2',
      'CollectWater_1',
      'CollectWater_2',
      'SampleWeight_1',
      'SampleWeight_2',
      'W1_1',
      'W1_2',
      'W2_1',
      'W2_2',
      'W2_W1_1',
      'W2_W1_2',
      'W3_1',
      'W3_2',
      'Characteristic',
      'CTime_400',
      'CTime_300',
      'CPerformance',
      'RemarkItemApprover',
    ];
    const optionalColumnsByName = await _loadQoInstrumentOptionalColumns([tableName], optionalResultColumns);
    const optionalColumnsForTable = optionalColumnsByName.get(tableName) || new Set();
    const columns = [
      'Id',
      'ReqNo',
      'SampleCode',
      'ItemStatus',
      'CustFull',
      'CustShort',
      'SampleNo',
      'SampleName',
      'Furnance',
      'Instrument',
      'ItemNo',
      'ItemName',
      'ReportName',
      'AnalysisDue',
      'UserListItem',
      'ListItemDate',
      'UserAnalysis',
      'AnalysisDate',
      'Picture',
      ...optionalResultColumns.filter((column) => optionalColumnsForTable.has(column)),
      'ResultApprove',
      'ItemApprover',
      'ItemApproveDate',
    ];

    await _loadQoInstrumentTableMeta([tableName], [idColumn, ...columns]);

    const selectColumns = columns
      .map((column) => `t.${_sqlIdentifier(column)} AS ${_sqlIdentifier(column)}`)
      .join(',\n      ');

    const query = `
      SELECT
        t.${_sqlIdentifier(idColumn)} AS [InstrumentRecordId],
        ${selectColumns},
        r.[SamplingDate] AS [SamplingDate]
      FROM ${table} t
      LEFT JOIN [QO].[dbo].[Request] r ON CONVERT(NVARCHAR(4000), r.[Id]) = CONVERT(NVARCHAR(4000), t.[Id])
      WHERE t.[ItemStatus] IN (${itemStatusFilter})
      ORDER BY t.[AnalysisDue], t.[SampleCode] DESC, t.[ItemNo];
    `;

    const db = await mssql.qurey(query);
    const output = db["recordsets"]?.[0] || [];
    if (output.length > 0) return res.status(200).json(output);
    return res.status(400).json({ message: 'No data' });
  } catch (error) {
    console.error("QO InstrumentData Error:", error);
    const message = error.message || 'Server error';
    const isConfigError = message.toLowerCase().includes('missing instrument');
    return res.status(isConfigError ? 400 : 500).json({ message });
  }
});

router.post('/QO/InstrumentResultSave', async (req, res) => {
  console.log("--QO-InstrumentResultSave--");

  try {
    const instrument = (req.body.Instrument || '').toString().trim();
    const instrumentRecordId = (req.body.InstrumentRecordId || '').toString();
    const action = (req.body.Action || '').toString().trim();
    const userAnalysis = req.body.UserAnalysis;
    const now = ISOToLocal(new Date());

    if (!instrument) {
      return res.status(400).json({ message: 'Missing Instrument' });
    }

    if (!instrumentRecordId) {
      return res.status(400).json({ message: 'Missing InstrumentRecordId' });
    }

    const tableName = _qoInstrumentTableName(instrument);
    const table = _qoInstrumentTableFromName(tableName);
    const idColumn = await _resolveQoInstrumentRecordIdColumn(tableName, instrument);
    const optionalResultColumns = [
      'Result_1',
      'Result_2',
      'Result_ppm_1',
      'Result_ppm_2',
      'SampleUse_1',
      'SampleUse_2',
      'CollectWater_1',
      'CollectWater_2',
      'SampleWeight_1',
      'SampleWeight_2',
      'W1_1',
      'W1_2',
      'W2_1',
      'W2_2',
      'W2_W1_1',
      'W2_W1_2',
      'W3_1',
      'W3_2',
      'Characteristic',
      'CTime_400',
      'CTime_300',
      'CPerformance',
    ];
    const optionalColumnsByName = await _loadQoInstrumentOptionalColumns([tableName], optionalResultColumns);
    const optionalColumnsForTable = optionalColumnsByName.get(tableName) || new Set();
    await _loadQoInstrumentTableMeta([
      tableName
    ], [
      idColumn,
      'Id',
      'ItemStatus',
      ...optionalResultColumns.filter((column) => optionalColumnsForTable.has(column)),
      'UserAnalysis',
      'AnalysisDate',
    ]);

    const result1 = req.body.Result_1;
    const result2 = req.body.Result_2;
    const result1Sql = result1 === '' || result1 === null || result1 === undefined
      ? 'NULL'
      : `N'${_esc(result1)}'`;
    const result2Sql = result2 === '' || result2 === null || result2 === undefined
      ? 'NULL'
      : `N'${_esc(result2)}'`;
    const resultPpm1 = req.body.Result_ppm_1;
    const resultPpm2 = req.body.Result_ppm_2;
    const resultPpm1Sql = resultPpm1 === '' || resultPpm1 === null || resultPpm1 === undefined
      ? 'NULL'
      : `N'${_esc(resultPpm1)}'`;
    const resultPpm2Sql = resultPpm2 === '' || resultPpm2 === null || resultPpm2 === undefined
      ? 'NULL'
      : `N'${_esc(resultPpm2)}'`;
    const sampleUse1 = req.body.SampleUse_1;
    const sampleUse2 = req.body.SampleUse_2;
    const collectWater1 = req.body.CollectWater_1;
    const collectWater2 = req.body.CollectWater_2;
    const sampleUse1Sql = sampleUse1 === '' || sampleUse1 === null || sampleUse1 === undefined
      ? 'NULL'
      : `N'${_esc(sampleUse1)}'`;
    const sampleUse2Sql = sampleUse2 === '' || sampleUse2 === null || sampleUse2 === undefined
      ? 'NULL'
      : `N'${_esc(sampleUse2)}'`;
    const collectWater1Sql = collectWater1 === '' || collectWater1 === null || collectWater1 === undefined
      ? 'NULL'
      : `N'${_esc(collectWater1)}'`;
    const collectWater2Sql = collectWater2 === '' || collectWater2 === null || collectWater2 === undefined
      ? 'NULL'
      : `N'${_esc(collectWater2)}'`;
    const sampleWeight1 = req.body.SampleWeight_1;
    const sampleWeight2 = req.body.SampleWeight_2;
    const sampleWeight1Sql = sampleWeight1 === '' || sampleWeight1 === null || sampleWeight1 === undefined
      ? 'NULL'
      : `N'${_esc(sampleWeight1)}'`;
    const sampleWeight2Sql = sampleWeight2 === '' || sampleWeight2 === null || sampleWeight2 === undefined
      ? 'NULL'
      : `N'${_esc(sampleWeight2)}'`;
    const w11 = req.body.W1_1;
    const w12 = req.body.W1_2;
    const w21 = req.body.W2_1;
    const w22 = req.body.W2_2;
    const w2W11 = req.body.W2_W1_1;
    const w2W12 = req.body.W2_W1_2;
    const w31 = req.body.W3_1;
    const w32 = req.body.W3_2;
    const w11Sql = w11 === '' || w11 === null || w11 === undefined ? 'NULL' : `N'${_esc(w11)}'`;
    const w12Sql = w12 === '' || w12 === null || w12 === undefined ? 'NULL' : `N'${_esc(w12)}'`;
    const w21Sql = w21 === '' || w21 === null || w21 === undefined ? 'NULL' : `N'${_esc(w21)}'`;
    const w22Sql = w22 === '' || w22 === null || w22 === undefined ? 'NULL' : `N'${_esc(w22)}'`;
    const w2W11Sql = w2W11 === '' || w2W11 === null || w2W11 === undefined ? 'NULL' : `N'${_esc(w2W11)}'`;
    const w2W12Sql = w2W12 === '' || w2W12 === null || w2W12 === undefined ? 'NULL' : `N'${_esc(w2W12)}'`;
    const w31Sql = w31 === '' || w31 === null || w31 === undefined ? 'NULL' : `N'${_esc(w31)}'`;
    const w32Sql = w32 === '' || w32 === null || w32 === undefined ? 'NULL' : `N'${_esc(w32)}'`;
    const characteristic = req.body.Characteristic;
    const cTime400 = req.body.CTime_400;
    const cTime300 = req.body.CTime_300;
    const cPerformance = req.body.CPerformance;
    const characteristicSql = characteristic === '' || characteristic === null || characteristic === undefined
      ? 'NULL'
      : `N'${_esc(characteristic)}'`;
    const cTime400Sql = cTime400 === '' || cTime400 === null || cTime400 === undefined
      ? 'NULL'
      : `N'${_esc(cTime400)}'`;
    const cTime300Sql = cTime300 === '' || cTime300 === null || cTime300 === undefined
      ? 'NULL'
      : `N'${_esc(cTime300)}'`;
    const cPerformanceSql = cPerformance === '' || cPerformance === null || cPerformance === undefined
      ? 'NULL'
      : `N'${_esc(cPerformance)}'`;
    const optionalResultSetters = [
      optionalColumnsForTable.has('Result_1') ? `[Result_1] = ${result1Sql}` : '',
      optionalColumnsForTable.has('Result_2') ? `[Result_2] = ${result2Sql}` : '',
      optionalColumnsForTable.has('Result_ppm_1') ? `[Result_ppm_1] = ${resultPpm1Sql}` : '',
      optionalColumnsForTable.has('Result_ppm_2') ? `[Result_ppm_2] = ${resultPpm2Sql}` : '',
      optionalColumnsForTable.has('SampleUse_1') ? `[SampleUse_1] = ${sampleUse1Sql}` : '',
      optionalColumnsForTable.has('SampleUse_2') ? `[SampleUse_2] = ${sampleUse2Sql}` : '',
      optionalColumnsForTable.has('CollectWater_1') ? `[CollectWater_1] = ${collectWater1Sql}` : '',
      optionalColumnsForTable.has('CollectWater_2') ? `[CollectWater_2] = ${collectWater2Sql}` : '',
      optionalColumnsForTable.has('SampleWeight_1') ? `[SampleWeight_1] = ${sampleWeight1Sql}` : '',
      optionalColumnsForTable.has('SampleWeight_2') ? `[SampleWeight_2] = ${sampleWeight2Sql}` : '',
      optionalColumnsForTable.has('W1_1') ? `[W1_1] = ${w11Sql}` : '',
      optionalColumnsForTable.has('W1_2') ? `[W1_2] = ${w12Sql}` : '',
      optionalColumnsForTable.has('W2_1') ? `[W2_1] = ${w21Sql}` : '',
      optionalColumnsForTable.has('W2_2') ? `[W2_2] = ${w22Sql}` : '',
      optionalColumnsForTable.has('W2_W1_1') ? `[W2_W1_1] = ${w2W11Sql}` : '',
      optionalColumnsForTable.has('W2_W1_2') ? `[W2_W1_2] = ${w2W12Sql}` : '',
      optionalColumnsForTable.has('W3_1') ? `[W3_1] = ${w31Sql}` : '',
      optionalColumnsForTable.has('W3_2') ? `[W3_2] = ${w32Sql}` : '',
      optionalColumnsForTable.has('Characteristic') ? `[Characteristic] = ${characteristicSql}` : '',
      optionalColumnsForTable.has('CTime_400') ? `[CTime_400] = ${cTime400Sql}` : '',
      optionalColumnsForTable.has('CTime_300') ? `[CTime_300] = ${cTime300Sql}` : '',
      optionalColumnsForTable.has('CPerformance') ? `[CPerformance] = ${cPerformanceSql}` : '',
    ].filter(Boolean);
    const userAnalysisSql = userAnalysis === '' || userAnalysis === null || userAnalysis === undefined
      ? 'NULL'
      : `N'${_esc(userAnalysis)}'`;
    const analysisDateSql = `N'${_esc(now)}'`;
    const escapedInstrumentRecordId = _esc(instrumentRecordId);
    const isFinalSave = action.toUpperCase() === 'SAVE';
    const updateSetters = [
      ...optionalResultSetters,
      ...(isFinalSave ? [
        `[UserAnalysis] = ${userAnalysisSql}`,
        `[AnalysisDate] = ${analysisDateSql}`,
        `[ItemStatus] = @NextItemStatus`,
      ] : []),
    ];

    if (updateSetters.length === 0) {
      return res.status(400).json({ message: 'No result columns to update' });
    }

    const query = `
      SET XACT_ABORT ON;
      BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @RequestId NVARCHAR(4000);
        DECLARE @ReqNo NVARCHAR(4000);
        DECLARE @SampleCode NVARCHAR(4000);
        DECLARE @CurrentItemStatus NVARCHAR(100);
        DECLARE @NextItemStatus NVARCHAR(100);

        SELECT
          @RequestId = CONVERT(NVARCHAR(4000), [Id]),
          @CurrentItemStatus = CONVERT(NVARCHAR(100), [ItemStatus])
        FROM ${table}
        WHERE ${_sqlIdentifier(idColumn)} = N'${escapedInstrumentRecordId}';

        IF @RequestId IS NULL
          RAISERROR('Result save failed for Id: ${escapedInstrumentRecordId}', 16, 1);

        SET @NextItemStatus = CASE UPPER(LTRIM(RTRIM(ISNULL(@CurrentItemStatus, N''))))
          WHEN N'LIST ITEM' THEN N'FINISH ITEM'
          WHEN N'LIST RECHECK 1' THEN N'FINISH RECHECK 1'
          WHEN N'LIST RECHECK 2' THEN N'FINISH RECHECK 2'
          WHEN N'LIST RECONFIRM' THEN N'FINISH RECONFIRM'
          ELSE @CurrentItemStatus
        END;

        UPDATE ${table}
        SET
          ${updateSetters.join(',\n          ')}
        WHERE ${_sqlIdentifier(idColumn)} = N'${escapedInstrumentRecordId}';

        IF @@ROWCOUNT = 0
          RAISERROR('Result save failed for Id: ${escapedInstrumentRecordId}', 16, 1);

        ${isFinalSave ? `
        UPDATE [QO].[dbo].[Request]
        SET
          [UserAnalysis] = ${userAnalysisSql},
          [AnalysisDate] = ${analysisDateSql},
          [ItemStatus] = @NextItemStatus,
          [Result_1] = CASE WHEN UPPER(LTRIM(RTRIM(ISNULL(@CurrentItemStatus, N'')))) = N'LIST ITEM' THEN ${result1Sql} ELSE [Result_1] END,
          [Result_2] = CASE WHEN UPPER(LTRIM(RTRIM(ISNULL(@CurrentItemStatus, N'')))) = N'LIST ITEM' THEN ${result2Sql} ELSE [Result_2] END,
          [Result_3] = CASE WHEN UPPER(LTRIM(RTRIM(ISNULL(@CurrentItemStatus, N'')))) = N'LIST RECHECK 1' THEN ${result1Sql} ELSE [Result_3] END,
          [Result_4] = CASE WHEN UPPER(LTRIM(RTRIM(ISNULL(@CurrentItemStatus, N'')))) = N'LIST RECHECK 1' THEN ${result2Sql} ELSE [Result_4] END,
          [Result_5] = CASE WHEN UPPER(LTRIM(RTRIM(ISNULL(@CurrentItemStatus, N'')))) = N'LIST RECHECK 2' THEN ${result1Sql} ELSE [Result_5] END,
          [Result_6] = CASE WHEN UPPER(LTRIM(RTRIM(ISNULL(@CurrentItemStatus, N'')))) = N'LIST RECHECK 2' THEN ${result2Sql} ELSE [Result_6] END,
          [Result_7] = CASE WHEN UPPER(LTRIM(RTRIM(ISNULL(@CurrentItemStatus, N'')))) = N'LIST RECONFIRM' THEN ${result1Sql} ELSE [Result_7] END,
          [Result_8] = CASE WHEN UPPER(LTRIM(RTRIM(ISNULL(@CurrentItemStatus, N'')))) = N'LIST RECONFIRM' THEN ${result2Sql} ELSE [Result_8] END
        WHERE CONVERT(NVARCHAR(4000), [Id]) = @RequestId;

        IF @@ROWCOUNT = 0
          RAISERROR('Request analysis update failed for Id: %s', 16, 1, @RequestId);

        ${_qoResultSaveWorkflowStatusSql()}
        ` : ''}

        IF @@TRANCOUNT > 0
          COMMIT TRANSACTION;
      END TRY
      BEGIN CATCH
        IF XACT_STATE() <> 0
          ROLLBACK TRANSACTION;
        THROW;
      END CATCH
    `;

    await mssql.qurey(query);
    return res.status(200).json({ message: 'Save Success' });
  } catch (error) {
    console.error("QO InstrumentResultSave Error:", error);
    const message = error.message || 'Server error';
    const isConfigError = message.toLowerCase().includes('missing instrument');
    return res.status(isConfigError ? 400 : 500).json({ message });
  }
});

router.post('/QO/CoolingCurveResultSave', async (req, res) => {
  console.log("--QO-CoolingCurveResultSave--");

  try {
    const instrument = (req.body.Instrument || '').toString().trim();
    const rows = Array.isArray(req.body.Rows)
      ? req.body.Rows
      : JSON.parse(req.body.Rows || '[]');
    const action = (req.body.Action || '').toString().trim();
    const userAnalysis = req.body.UserAnalysis;
    const now = ISOToLocal(new Date());
    const isFinalSave = action.toUpperCase() === 'SAVE';

    if (!instrument) {
      return res.status(400).json({ message: 'Missing Instrument' });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'Missing Cooling curve rows' });
    }

    const tableName = _qoInstrumentTableName(instrument);
    const table = _qoInstrumentTableFromName(tableName);
    const idColumn = await _resolveQoInstrumentRecordIdColumn(tableName, instrument);
    const coolingColumns = ['Characteristic', 'CTime_400', 'CTime_300', 'CPerformance'];
    const optionalColumnsByName = await _loadQoInstrumentOptionalColumns([tableName], coolingColumns);
    const optionalColumnsForTable = optionalColumnsByName.get(tableName) || new Set();
    const missingCoolingColumns = coolingColumns.filter((column) => !optionalColumnsForTable.has(column));

    if (missingCoolingColumns.length > 0) {
      return res.status(400).json({
        message: `Missing Cooling curve column: ${missingCoolingColumns.map((column) => `${tableName}.${column}`).join(', ')}`,
      });
    }

    await _loadQoInstrumentTableMeta([tableName], [
      idColumn,
      'Id',
      'ItemStatus',
      'ItemName',
      ...coolingColumns,
      'UserAnalysis',
      'AnalysisDate',
    ]);

    const requestResultColumnDb = await mssql.qurey(`
      SELECT c.name AS ColumnName
      FROM [QO].sys.tables t
      INNER JOIN [QO].sys.schemas s ON s.schema_id = t.schema_id
      INNER JOIN [QO].sys.columns c ON c.object_id = t.object_id
      WHERE s.name = N'dbo'
        AND t.name = N'Request'
        AND c.name IN (N'Result_1', N'Result_3', N'Result_5', N'Result_7');
    `);
    const requestResultColumns = new Set((requestResultColumnDb["recordsets"]?.[0] || []).map((row) => row.ColumnName));
    if (isFinalSave && ['Result_1', 'Result_3', 'Result_5', 'Result_7'].some((column) => !requestResultColumns.has(column))) {
      return res.status(400).json({ message: 'Missing Request.Result_1/3/5/7 column' });
    }

    const coolingValues = {
      Characteristic: req.body.Characteristic,
      CTime_400: req.body.CTime_400,
      CTime_300: req.body.CTime_300,
      CPerformance: req.body.CPerformance,
    };
    const coolingSetters = coolingColumns
      .map((column) => `${_sqlIdentifier(column)} = ${_sqlTextValue(coolingValues[column])}`)
      .join(',\n          ');
    const userAnalysisSql = _sqlTextValue(userAnalysis);
    const analysisDateSql = _sqlTextValue(now);

    let allQueries = '';
    for (const row of rows) {
      const instrumentRecordId = (row.InstrumentRecordId || '').toString();
      if (!instrumentRecordId) {
        return res.status(400).json({ message: 'Missing InstrumentRecordId' });
      }

      const result1Value = _qoCoolingCurveValueForItemName(row.ItemName, coolingValues);
      const result1Sql = _sqlTextValue(result1Value);
      const escapedInstrumentRecordId = _esc(instrumentRecordId);

      allQueries += `
        SET @RequestId = NULL;
        SET @ReqNo = NULL;
        SET @SampleCode = NULL;
        SET @CurrentItemStatus = NULL;
        SET @NextItemStatus = NULL;

        SELECT
          @RequestId = CONVERT(NVARCHAR(4000), [Id]),
          @CurrentItemStatus = CONVERT(NVARCHAR(100), [ItemStatus])
        FROM ${table}
        WHERE ${_sqlIdentifier(idColumn)} = N'${escapedInstrumentRecordId}';

        IF @RequestId IS NULL
          RAISERROR('Cooling curve save failed for Id: ${escapedInstrumentRecordId}', 16, 1);

        SET @NextItemStatus = CASE UPPER(LTRIM(RTRIM(ISNULL(@CurrentItemStatus, N''))))
          WHEN N'LIST ITEM' THEN N'FINISH ITEM'
          WHEN N'LIST RECHECK 1' THEN N'FINISH RECHECK 1'
          WHEN N'LIST RECHECK 2' THEN N'FINISH RECHECK 2'
          WHEN N'LIST RECONFIRM' THEN N'FINISH RECONFIRM'
          ELSE @CurrentItemStatus
        END;

        UPDATE ${table}
        SET
          ${coolingSetters}
          ${isFinalSave ? `,
          [UserAnalysis] = ${userAnalysisSql},
          [AnalysisDate] = ${analysisDateSql},
          [ItemStatus] = @NextItemStatus` : ''}
        WHERE ${_sqlIdentifier(idColumn)} = N'${escapedInstrumentRecordId}';

        IF @@ROWCOUNT = 0
          RAISERROR('Cooling curve save failed for Id: ${escapedInstrumentRecordId}', 16, 1);

        ${isFinalSave ? `
        UPDATE [QO].[dbo].[Request]
        SET
          [UserAnalysis] = ${userAnalysisSql},
          [AnalysisDate] = ${analysisDateSql},
          [ItemStatus] = @NextItemStatus,
          [Result_1] = CASE WHEN UPPER(LTRIM(RTRIM(ISNULL(@CurrentItemStatus, N'')))) = N'LIST ITEM' THEN ${result1Sql} ELSE [Result_1] END,
          [Result_3] = CASE WHEN UPPER(LTRIM(RTRIM(ISNULL(@CurrentItemStatus, N'')))) = N'LIST RECHECK 1' THEN ${result1Sql} ELSE [Result_3] END,
          [Result_5] = CASE WHEN UPPER(LTRIM(RTRIM(ISNULL(@CurrentItemStatus, N'')))) = N'LIST RECHECK 2' THEN ${result1Sql} ELSE [Result_5] END,
          [Result_7] = CASE WHEN UPPER(LTRIM(RTRIM(ISNULL(@CurrentItemStatus, N'')))) = N'LIST RECONFIRM' THEN ${result1Sql} ELSE [Result_7] END
        WHERE CONVERT(NVARCHAR(4000), [Id]) = @RequestId;

        IF @@ROWCOUNT = 0
          RAISERROR('Request cooling curve update failed for Id: %s', 16, 1, @RequestId);

        ${_qoResultSaveWorkflowStatusSql()}
        ` : ''}
      `;
    }

    const query = `
      SET XACT_ABORT ON;
      BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @RequestId NVARCHAR(4000);
        DECLARE @ReqNo NVARCHAR(4000);
        DECLARE @SampleCode NVARCHAR(4000);
        DECLARE @CurrentItemStatus NVARCHAR(100);
        DECLARE @NextItemStatus NVARCHAR(100);

        ${allQueries}

        IF @@TRANCOUNT > 0
          COMMIT TRANSACTION;
      END TRY
      BEGIN CATCH
        IF XACT_STATE() <> 0
          ROLLBACK TRANSACTION;
        THROW;
      END CATCH
    `;

    await mssql.qurey(query);
    return res.status(200).json({ message: 'Save Success' });
  } catch (error) {
    console.error("QO CoolingCurveResultSave Error:", error);
    const message = error.message || 'Server error';
    const isConfigError = message.toLowerCase().includes('missing instrument')
      || message.toLowerCase().includes('missing cooling curve')
      || message.toLowerCase().includes('missing request.result_1/3/5/7');
    return res.status(isConfigError ? 400 : 500).json({ message });
  }
});

router.post('/QO/CoolingCurvePdfUpload', coolingPdfUpload.single('file'), async (req, res) => {
  console.log("--QO-CoolingCurvePdfUpload--");

  let pdfPath = '';
  let imagePath = '';
  try {
    const instrument = (req.body.Instrument || '').toString().trim();
    const rows = typeof req.body.Rows === 'string'
      ? JSON.parse(req.body.Rows || '[]')
      : (req.body.Rows || []);
    const file = req.file;

    if (!instrument) {
      return res.status(400).json({ message: 'Missing Instrument' });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'Missing Cooling curve rows' });
    }

    if (!file || !file.buffer) {
      return res.status(400).json({ message: 'Missing PDF file' });
    }

    const reqNo = (req.body.ReqNo || rows[0].ReqNo || '').toString().trim();
    const sampleCode = (req.body.SampleCode || rows[0].SampleCode || '').toString().trim();

    if (!reqNo || !sampleCode) {
      return res.status(400).json({ message: 'Missing ReqNo or SampleCode' });
    }

    const requestPictureDb = await mssql.qurey(`
      SELECT c.name AS ColumnName
      FROM [QO].sys.tables t
      INNER JOIN [QO].sys.schemas s ON s.schema_id = t.schema_id
      INNER JOIN [QO].sys.columns c ON c.object_id = t.object_id
      WHERE s.name = N'dbo'
        AND t.name = N'Request'
        AND c.name = N'Picture';
    `);
    const requestHasPicture = (requestPictureDb["recordsets"]?.[0] || []).length > 0;
    if (!requestHasPicture) {
      return res.status(400).json({ message: 'Missing Request.Picture column' });
    }

    const tableName = _qoInstrumentTableName(instrument);
    const table = _qoInstrumentTableFromName(tableName);
    const idColumn = await _resolveQoInstrumentRecordIdColumn(tableName, instrument);
    await _loadQoInstrumentTableMeta([tableName], [idColumn, 'Id', 'Picture']);

    const reqFolder = _safePathSegment(reqNo);
    const resultColumn = _qoCoolingResultColumnForStatus(req.body.ItemStatus || rows[0].ItemStatus || '');
    const fileBaseName = _safePathSegment(resultColumn ? `${sampleCode}-${resultColumn}` : sampleCode);
    const pdfFileName = `${fileBaseName}.pdf`;
    const imageFileName = `${fileBaseName}.png`;
    const targetDir = nodePath.join(COOLING_PDF_DIR, reqFolder);
    pdfPath = nodePath.join(targetDir, pdfFileName);
    imagePath = nodePath.join(targetDir, imageFileName);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(pdfPath, file.buffer);
    await _renderPdfFirstPageToPng(pdfPath, imagePath);

    const escapedPath = _esc(imagePath);
    const instrumentIds = [...new Set(rows.map((row) => (row.InstrumentRecordId || '').toString()).filter(Boolean))];
    const requestIds = [...new Set(rows.map((row) => (row.Id || '').toString()).filter(Boolean))];

    if (instrumentIds.length === 0 || requestIds.length === 0) {
      throw new Error('Missing row Id for Picture update');
    }

    const instrumentUpdates = instrumentIds.map((instrumentRecordId) => `
      UPDATE ${table}
      SET [Picture] = N'${escapedPath}'
      WHERE ${_sqlIdentifier(idColumn)} = N'${_esc(instrumentRecordId)}';
      IF @@ROWCOUNT = 0
        RAISERROR('Instrument Picture update failed for Id: ${_esc(instrumentRecordId)}', 16, 1);
    `).join('\n');

    const requestUpdates = requestIds.map((requestId) => `
      UPDATE [QO].[dbo].[Request]
      SET [Picture] = N'${escapedPath}'
      WHERE CONVERT(NVARCHAR(4000), [Id]) = N'${_esc(requestId)}';
      IF @@ROWCOUNT = 0
        RAISERROR('Request Picture update failed for Id: ${_esc(requestId)}', 16, 1);
    `).join('\n');

    const query = `
      SET XACT_ABORT ON;
      BEGIN TRY
        BEGIN TRANSACTION;
        ${instrumentUpdates}
        ${requestUpdates}
        IF @@TRANCOUNT > 0
          COMMIT TRANSACTION;
      END TRY
      BEGIN CATCH
        IF XACT_STATE() <> 0
          ROLLBACK TRANSACTION;
        THROW;
      END CATCH
    `;

    await mssql.qurey(query);
    return res.status(200).json({ filePath: imagePath, pdfPath, imagePath });
  } catch (error) {
    if (pdfPath && fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
    }
    if (imagePath && fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
    console.error("QO CoolingCurvePdfUpload Error:", error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
});

router.get('/QO/CoolingCurveImage', (req, res) => {
  try {
    const rawPath = (req.query.path || '').toString();
    if (!rawPath) {
      return res.status(400).json({ message: 'Missing image path' });
    }

    const resolvedPath = nodePath.resolve(rawPath);
    if (!_isCoolingUploadFilePath(resolvedPath) || nodePath.extname(resolvedPath).toLowerCase() !== '.png') {
      return res.status(400).json({ message: 'Invalid image path' });
    }

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ message: 'Image not found' });
    }

    return res.sendFile(resolvedPath);
  } catch (error) {
    console.error("QO CoolingCurveImage Error:", error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
});

router.post('/QO/InstrumentApproveItems', async (req, res) => {
  console.log("--QO-InstrumentApproveItems--");

  try {
    const instrument = (req.body.Instrument || '').toString().trim();
    const rows = Array.isArray(req.body.Rows)
      ? req.body.Rows
      : JSON.parse(req.body.Rows || '[]');
    const approver = (req.body.ItemApprover || req.body.UserApprove || '').toString().trim();
    const now = ISOToLocal(new Date());

    if (!instrument) {
      return res.status(400).json({ message: 'Missing Instrument' });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'Please select approve or recheck item' });
    }

    if (!approver) {
      return res.status(400).json({ message: 'Missing ItemApprover' });
    }

    const tableName = _qoInstrumentTableName(instrument);
    const table = _qoInstrumentTableFromName(tableName);
    const idColumn = await _resolveQoInstrumentRecordIdColumn(tableName, instrument);
    const optionalColumnsByName = await _loadQoInstrumentOptionalColumns(
      [tableName],
      QO_APPROVAL_EDITABLE_COLUMNS
    );
    const optionalColumnsForTable = optionalColumnsByName.get(tableName) || new Set();
    const isCoolingCurve = instrument.toLowerCase().includes('cooling curve');

    // For cooling curve, persist the approved stage graph into Request.Report_Graph
    // on approve. The just-analysed stage image is already in Request.Picture,
    // so copy it across (only when both columns exist).
    let requestHasReportGraph = false;
    let requestHasPicture = false;
    if (isCoolingCurve) {
      const requestGraphColsDb = await mssql.qurey(`
        SELECT c.name AS ColumnName
        FROM [QO].sys.tables t
        INNER JOIN [QO].sys.schemas s ON s.schema_id = t.schema_id
        INNER JOIN [QO].sys.columns c ON c.object_id = t.object_id
        WHERE s.name = N'dbo'
          AND t.name = N'Request'
          AND c.name IN (N'Picture', N'Report_Graph');
      `);
      const graphCols = new Set((requestGraphColsDb["recordsets"]?.[0] || []).map((row) => row.ColumnName));
      requestHasReportGraph = graphCols.has('Report_Graph');
      requestHasPicture = graphCols.has('Picture');
    }
    const copyPictureToReportGraph = isCoolingCurve && requestHasReportGraph && requestHasPicture;

    await _loadQoInstrumentTableMeta([tableName], [
      idColumn,
      'Id',
      'ItemStatus',
      'AnalysisDue',
      'ResultApprove',
      'ItemApprover',
      'ItemApproveDate',
      'RemarkItemApprover',
    ]);

    const approverSql = _sqlTextValue(approver);
    const approveDateSql = _sqlTextValue(now);
    let allQueries = '';
    await loadHolidays();

    const karlFischerLoqByRequestId = await _loadKarlFischerLoqByRequestId(
      rows
        .filter((row) => (row.Action || '').toString().trim().toUpperCase() === 'APPROVE')
        .map((row) => row.Id)
    );

    for (const row of rows) {
      const action = (row.Action || '').toString().trim().toUpperCase();
      const instrumentRecordId = (row.InstrumentRecordId || '').toString().trim();
      const requestId = (row.Id || '').toString().trim();
      const currentStatus = (row.ItemStatus || '').toString().trim();
      const remark = (row.Remark || '').toString();

      if (!instrumentRecordId || !requestId) {
        return res.status(400).json({ message: 'Missing row Id' });
      }

      if (action !== 'APPROVE' && action !== 'RECHECK') {
        return res.status(400).json({ message: 'Invalid approve action' });
      }

      const escapedInstrumentRecordId = _esc(instrumentRecordId);
      const escapedRequestId = _esc(requestId);
      const remarkSql = _sqlTextValue(remark);
      const instrumentEditableSetters = _qoApprovalInstrumentEditableSetters(row, optionalColumnsForTable);
      const requestResultSetters = _qoApprovalRequestResultSetters(currentStatus, row, isCoolingCurve);

      if (action === 'APPROVE') {
        const averagedResult = (row.ResultApprove || _qoAverageResultText(row.Result_1, row.Result_2)).toString();
        const resultApprove = _qoApplyKarlFischerLoq(
          averagedResult,
          karlFischerLoqByRequestId.get(requestId) === true
        );
        const resultApproveSql = _sqlTextValue(resultApprove);
        const instrumentSetters = [
          ...instrumentEditableSetters,
          `[ResultApprove] = ${resultApproveSql}`,
          `[ItemApprover] = ${approverSql}`,
          `[ItemApproveDate] = ${approveDateSql}`,
          `[ItemStatus] = N'APPROVE ITEM'`,
          `[RemarkItemApprover] = ${remarkSql}`,
        ];
        const requestSetters = [
          ...requestResultSetters,
          `[ResultApprove] = ${resultApproveSql}`,
          `[ItemApprover] = ${approverSql}`,
          `[ItemApproveDate] = ${approveDateSql}`,
          `[ItemStatus] = N'APPROVE ITEM'`,
          `[RemarkItemApprover] = ${remarkSql}`,
        ];
        if (copyPictureToReportGraph) {
          requestSetters.push(
            `[Report_Graph] = CASE WHEN NULLIF(LTRIM(RTRIM(CONVERT(NVARCHAR(4000), [Picture]))), N'') IS NOT NULL THEN [Picture] ELSE [Report_Graph] END`
          );
        }

        allQueries += `
          UPDATE ${table}
          SET
            ${instrumentSetters.join(',\n            ')}
          WHERE ${_sqlIdentifier(idColumn)} = N'${escapedInstrumentRecordId}';

          IF @@ROWCOUNT = 0
            RAISERROR('Instrument approve failed for Id: ${escapedInstrumentRecordId}', 16, 1);

          UPDATE [QO].[dbo].[Request]
          SET
            ${requestSetters.join(',\n            ')}
          WHERE CONVERT(NVARCHAR(4000), [Id]) = N'${escapedRequestId}';

          IF @@ROWCOUNT = 0
            RAISERROR('Request approve failed for Id: ${escapedRequestId}', 16, 1);
        `;
      } else {
        const recheckStatus = _qoRecheckStatusForApproval(currentStatus);
        if (!recheckStatus) {
          return res.status(400).json({ message: `Cannot recheck item status: ${currentStatus || '-'}` });
        }

        const dueSource = convertToISO(row.AnalysisDue || row.CurrentAnalysisDue || new Date().toISOString());
        const dueResult = await calculateAnalysisDue(dueSource, 2);
        const nextDueSql = _sqlTextValue(dueResult.AnalysisDue);
        const statusSql = _sqlTextValue(recheckStatus);
        // Do NOT rewrite the result columns on recheck: the current stage's
        // value (e.g. Result_1) must be kept for history/report. Rewriting from
        // the request payload would blank it out when the value isn't resent.
        const requestSetters = [
          `[ItemStatus] = ${statusSql}`,
          `[AnalysisDue] = ${nextDueSql}`,
          `[UserAnalysis] = NULL`,
          `[AnalysisDate] = NULL`,
          `[ResultApprove] = NULL`,
          `[ItemApprover] = NULL`,
          `[ItemApproveDate] = NULL`,
          `[RemarkItemApprover] = ${remarkSql}`,
        ];

        allQueries += `
          DELETE FROM ${table}
          WHERE ${_sqlIdentifier(idColumn)} = N'${escapedInstrumentRecordId}';

          IF @@ROWCOUNT = 0
            RAISERROR('Instrument recheck delete failed for Id: ${escapedInstrumentRecordId}', 16, 1);

          UPDATE [QO].[dbo].[Request]
          SET
            ${requestSetters.join(',\n            ')}
          WHERE CONVERT(NVARCHAR(4000), [Id]) = N'${escapedRequestId}';

          IF @@ROWCOUNT = 0
            RAISERROR('Request recheck failed for Id: ${escapedRequestId}', 16, 1);
        `;
      }
    }

    const query = `
      SET XACT_ABORT ON;
      BEGIN TRY
        BEGIN TRANSACTION;
        ${allQueries}
        IF @@TRANCOUNT > 0
          COMMIT TRANSACTION;
      END TRY
      BEGIN CATCH
        IF XACT_STATE() <> 0
          ROLLBACK TRANSACTION;
        THROW;
      END CATCH
    `;

    await mssql.qurey(query);
    return res.status(200).json({ message: 'Approve Success' });
  } catch (error) {
    console.error("QO InstrumentApproveItems Error:", error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
});

router.post('/QO/InstrumentHistory', async (req, res) => {
  console.log("--QO-InstrumentHistory--");

  try {
    const instrument = (req.body.Instrument || '').toString().trim();
    const custFull = (req.body.CustFull || '').toString().trim();
    const sampleNo = (req.body.SampleNo || '').toString().trim();
    const sampleName = (req.body.SampleName || '').toString().trim();
    const itemName = (req.body.ItemName || '').toString().trim();

    if (!instrument) {
      return res.status(400).json({ message: 'Missing Instrument' });
    }

    if (!custFull || !sampleNo || !sampleName || !itemName) {
      return res.status(400).json({ message: 'Missing history filter' });
    }

    const tableName = _qoInstrumentTableName(instrument);
    const table = _qoInstrumentTableFromName(tableName);
    await _loadQoInstrumentTableMeta(
      [tableName],
      ['CustFull', 'SampleNo', 'SampleName', 'ItemName', 'SampleCode', 'AnalysisDue', 'AnalysisDate', 'ResultApprove']
    );

    const query = `
      SELECT TOP (15)
        [SampleCode],
        COALESCE([AnalysisDate], [AnalysisDue]) AS [AnalysisDue],
        [ResultApprove]
      FROM ${table}
      WHERE [CustFull] = N'${_esc(custFull)}'
        AND [SampleNo] = N'${_esc(sampleNo)}'
        AND [SampleName] = N'${_esc(sampleName)}'
        AND [ItemName] = N'${_esc(itemName)}'
        AND TRY_CONVERT(FLOAT, NULLIF(LTRIM(RTRIM(CONVERT(NVARCHAR(100), [ResultApprove]))), N'')) IS NOT NULL
      ORDER BY COALESCE([AnalysisDate], [AnalysisDue]) DESC, [SampleCode] DESC;
    `;

    const db = await mssql.qurey(query);
    const output = db["recordsets"]?.[0] || [];
    return res.status(200).json(output.reverse());
  } catch (error) {
    console.error("QO InstrumentHistory Error:", error);
    const message = error.message || 'Server error';
    const isConfigError = message.toLowerCase().includes('missing instrument');
    return res.status(isConfigError ? 400 : 500).json({ message });
  }
});

router.post('/QO/ItemWaitApprove', async (req, res) => {
  console.log("--ItemWaitApprove--");
  let output = [];
  const sampleCode = (req.body.SampleCode || '').toString().trim();
  const custFull = (req.body.CustFull || '').toString().trim();
  const instrument = (req.body.Instrument || '').toString().trim();
  const analysisDue = (req.body.AnalysisDue || '').toString().trim();
  const analysisDueStart = (req.body.AnalysisDueStart || req.body.DueDateStart || '').toString().trim();
  const analysisDueEnd = (req.body.AnalysisDueEnd || req.body.DueDateEnd || '').toString().trim();
  const columns = _qoRequestStructureColumns();
  const conditions = [
    `[ItemStatus] IN (N'FINISH ITEM', N'FINISH RECHECK 1', N'FINISH RECHECK 2', N'FINISH RECONFIRM')`,
  ];

  if (sampleCode) {
    conditions.push(`[SampleCode] LIKE N'%${_esc(sampleCode)}%'`);
  }

  if (custFull) {
    conditions.push(`[CustFull] LIKE N'%${_esc(custFull)}%'`);
  }

  if (instrument) {
    conditions.push(`[Instrument] = N'${_esc(instrument)}'`);
  }

  if (analysisDue) {
    conditions.push(`CONVERT(NVARCHAR(30), [AnalysisDue], 120) LIKE N'%${_esc(analysisDue)}%'`);
  }

  if (analysisDueStart) {
    conditions.push(`CONVERT(DATE, [AnalysisDue]) >= CONVERT(DATE, N'${_esc(analysisDueStart)}')`);
  }

  if (analysisDueEnd) {
    conditions.push(`CONVERT(DATE, [AnalysisDue]) <= CONVERT(DATE, N'${_esc(analysisDueEnd)}')`);
  }

  let query = `
  SELECT ${columns}
  FROM [QO].[dbo].[Request]
  WHERE ${conditions.join('\n    AND ')}
  ORDER BY [AnalysisDue], [SampleCode], [ItemNo];
  `;

  // console.log(query);
  try {
    let db = await mssql.qurey(query);
    if (db["recordsets"].length > 0) {
      let buffer = db["recordsets"][0];
      output = buffer;
      return res.status(200).json(output);
    } else {
      return res.status(400).json('ไม่พบข้อมูล');
    }
  } catch (error) {
    console.error("Query Error:", error);
    return res.status(500).json('เกิดข้อผิดพลาดที่ server');
  }
});

router.post('/QO/ReportWaitApprove', async (req, res) => {
  console.log("--ReportWaitApprove--");
  let output = [];
  const sampleCode = (req.body.SampleCode || '').toString().trim();
  const custFull = (req.body.CustFull || '').toString().trim();
  const analysisDue = (req.body.AnalysisDue || '').toString().trim();
  const analysisDueStart = (req.body.AnalysisDueStart || req.body.DueDateStart || '').toString().trim();
  const analysisDueEnd = (req.body.AnalysisDueEnd || req.body.DueDateEnd || '').toString().trim();
  const columns = _qoRequestStructureColumns('r');
  const conditions = [
    `UPPER(LTRIM(RTRIM(ISNULL([ItemStatus], N'')))) IN (N'APPROVE ITEM', N'REQUEST RECONFIRM', N'REQ RECONFIRM')`,
  ];

  if (sampleCode) {
    conditions.push(`[SampleCode] LIKE N'%${_esc(sampleCode)}%'`);
  }

  if (custFull) {
    conditions.push(`[CustFull] LIKE N'%${_esc(custFull)}%'`);
  }

  if (analysisDue) {
    conditions.push(`CONVERT(NVARCHAR(30), [AnalysisDue], 120) LIKE N'%${_esc(analysisDue)}%'`);
  }

  if (analysisDueStart) {
    conditions.push(`CONVERT(DATE, [AnalysisDue]) >= CONVERT(DATE, N'${_esc(analysisDueStart)}')`);
  }

  if (analysisDueEnd) {
    conditions.push(`CONVERT(DATE, [AnalysisDue]) <= CONVERT(DATE, N'${_esc(analysisDueEnd)}')`);
  }

  let query = `
  SELECT ${_qoRequestStructureColumns()}
  FROM [QO].[dbo].[Request]
  WHERE ${conditions.join('\n      AND ')}
  ORDER BY [AnalysisDue], [SampleCode];
  `;

  try {
    let db = await mssql.qurey(query);
    if (db["recordsets"].length > 0) {
      let buffer = db["recordsets"][0];
      output = buffer;
      return res.status(200).json(output);
    } else {
      return res.status(400).json('ไม่พบข้อมูล');
    }
  } catch (error) {
    console.error("Query Error:", error);
    return res.status(500).json('เกิดข้อผิดพลาดที่ server');
  }
});

router.post('/QO/cancelRequest', async (req, res) => {
  console.log("--QO-cancelRequest--");

  try {
    const reqNo = (req.body.ReqNo || '').toString().trim();
    const sampleCode = (req.body.SampleCode || '').toString().trim();

    if (!reqNo) {
      return res.status(400).json({ message: 'Missing ReqNo' });
    }

    const sampleWhere = sampleCode
      ? `AND [SampleCode] = N'${_esc(sampleCode)}'`
      : '';

    const query = `
      UPDATE [QO].[dbo].[Request]
      SET
        [RequestStatus] = N'CANCEL',
        [SampleStatus] = N'CANCEL',
        [ItemStatus] = N'CANCEL'
      WHERE [ReqNo] = N'${_esc(reqNo)}'
        ${sampleWhere};
    `;

    const db = await mssql.qurey(query);
    const affected = db?.rowsAffected?.reduce?.((sum, value) => sum + value, 0) ?? 0;

    if (affected === 0) {
      return res.status(400).json({ message: 'No row updated' });
    }

    return res.status(200).json({ message: 'Cancel success', rowsAffected: affected });
  } catch (error) {
    console.error("QO cancelRequest Error:", error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
});

router.post('/QO/cancelRequestLegacy', async (req, res) => {
  console.log("--cancelRequest--");

  try {
    // let dataRow = JSON.parse(req.body.dataRow);
    let ReqNo = req.body.ReqNo;
    let allQueries = '';
    let fields = [];

    function pushField(name, value) {
      if (value !== '') {
        const escapedValue = value.toString().replace(/'/g, "''");
        fields.push(`[${name}] = N'${escapedValue}'`);
      } else {
        fields.push(`[${name}] = NULL`);
      }
    }

    pushField("ReqStatus", 'CANCEL');
    pushField("SampleStatus", 'CANCEL');
    pushField("ItemStatus", 'CANCEL');

    let query = `
      UPDATE [QO].[dbo].[Request]
      SET ${fields.join(',\n')}
      WHERE ReqNo = '${ReqNo}';
      `;
    allQueries += query + '\n';

    let db = await mssql.qurey(allQueries);
    // console.log(allQueries);
    // STEP 2: CREATE DELETE QUERY

    if (db["rowsAffected"][0] > 0) {
      console.log("Update Success");
      return res.status(200).json('อัปเดทข้อมูลสำเร็จ');
    } else {
      return res.status(400).json('ไม่พบข้อมูล');
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json('เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์');
  }
});

router.post('/QO/KPI', async (req, res) => {
  console.log('--KPI--');

  const year = parseInt(req.body.year, 10);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return res.status(400).json({ message: 'Invalid year' });
  }

  await loadHolidays();
  const parseCost = (value) => {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = Number(String(value).replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? parsed : 0;
  };

  // Include every request that has already been received (ReceivedDate set) for
  // the given year, regardless of whether it has reached COMPLETE status yet.
  // Working-day / out-due metrics still only count once the report is approved
  // (guarded below), so received-but-not-complete requests contribute their
  // sample amount and cost immediately.
  const query = `
    SELECT *
    FROM [QO].[dbo].[Request]
    WHERE YEAR(ReceivedDate) = ${year}
      AND ReceivedDate IS NOT NULL
      AND UPPER(LTRIM(RTRIM(ISNULL(RequestStatus, N'')))) NOT IN (N'REJECT', N'CANCEL')
      AND UPPER(LTRIM(RTRIM(ISNULL(SampleStatus, N'')))) NOT IN (N'REJECT', N'CANCEL')
      AND UPPER(LTRIM(RTRIM(ISNULL(ItemStatus, N'')))) NOT IN (N'REJECT', N'CANCEL')
  `;

  const db = await mssql.qurey(query);

  if (!db['recordset'] || db['recordset'].length === 0) {
    return res.status(400).json({ message: 'ไม่พบข้อมูล' });
  }

  const records = db['recordset'];

  // ── 1. Initialise monthly buckets (1–12) ─────────────────
  const monthly = {};
  for (let m = 1; m <= 12; m++) {
    monthly[m] = {
      month: m,
      sampleAmount: 0, // unique SampleCode across all ReqNo in the month
      workingDay: 0,   // sum of working-day spans per ReqNo
      outDue: 0,       // items where ReportApproveDate > AnalysisDue
      cost: 0,         // sum of item cost
    };
  }

  // ── 2. Group all rows by ReqNo ───────────────────────────
  const byReqNo = {};
  for (const row of records) {
    if (!byReqNo[row.ReqNo]) byReqNo[row.ReqNo] = [];
    byReqNo[row.ReqNo].push(row);
  }

  // ── 3. Process each ReqNo ────────────────────────────────
  for (const [, items] of Object.entries(byReqNo)) {
    // Determine which month this ReqNo belongs to
    // → use the earliest ReceivedDate among all items
    const receivedDates = items
      .filter((i) => i.ReceivedDate)
      .map((i) => new Date(i.ReceivedDate).getTime());

    if (receivedDates.length === 0) continue;

    const minReceived = new Date(Math.min(...receivedDates) - 7 * 60 * 60 * 1000);
    const month = minReceived.getMonth() + 1; // 1-based

    // ── Sample amount: count unique SampName in this ReqNo ──
    const uniqueSampleCodes = new Set(items.map((i) => i.SampleCode).filter(Boolean));
    monthly[month].sampleAmount += uniqueSampleCodes.size;
    monthly[month].cost += items.reduce((sum, item) => sum + parseCost(item.Cost), 0);

    // ── Working day: minReceivedDate → maxReportApproveDate ──
    const reportDates = items
      .filter((i) => i.ReportApproveDate)
      .map((i) => new Date(i.ReportApproveDate).getTime());

    if (reportDates.length > 0) {
      const maxReport = new Date(Math.max(...reportDates) - 7 * 60 * 60 * 1000);
      monthly[month]._wdSum = (monthly[month]._wdSum || 0) + countWorkingDays(minReceived, maxReport);
      monthly[month]._wdCount = (monthly[month]._wdCount || 0) + 1;
      // console.log(monthly[month]._wdCount);
    }

    // ── Out due: ใช้ AnalysisDue ที่มากที่สุดของ ReqNo ──

    // หา Max AnalysisDue ของ ReqNo นี้
    const dueDates = items
      .filter((i) => i.AnalysisDue)
      .map((i) => new Date(i.AnalysisDue).getTime());

    const maxDueDate =
      dueDates.length > 0
        ? new Date(Math.max(...dueDates) - 7 * 60 * 60 * 1000)
        : null;

    // หา Max ReportApproveDate
    const approveDates = items
      .filter((i) => i.ReportApproveDate)
      .map((i) => new Date(i.ReportApproveDate).getTime());

    const maxApproveDate =
      approveDates.length > 0
        ? new Date(Math.max(...approveDates) - 7 * 60 * 60 * 1000)
        : null;

    if (maxDueDate && maxApproveDate) {
      // ตัดเวลาออก
      maxDueDate.setHours(0, 0, 0, 0);
      maxApproveDate.setHours(0, 0, 0, 0);

      if (maxApproveDate > maxDueDate) {
        monthly[month].outDue += 1;
      }
    }
  }
  // ── 4. Compute average workingDay per month, then return ─
  const result = Object.values(monthly)
    .sort((a, b) => a.month - b.month)
    .map(({ _wdSum, _wdCount, ...m }) => ({
      ...m,
      workingDay: _wdCount > 0 ? parseFloat((_wdSum / _wdCount).toFixed(2)) : 0,
      cost: parseFloat((m.cost || 0).toFixed(2)),
    }));
  // console.log(result);
  return res.status(200).json(result);
});

router.post('/QO/KPIItem', async (req, res) => {
  console.log('--QO-KPIItem--');

  const year = parseInt(req.body.year, 10);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return res.status(400).json({ message: 'Invalid year' });
  }

  const columns = [
    { key: 'flashPoint', label: 'Flash Point', instrument: 'Flash Point' },
    { key: 'acidNumber', label: 'Acid Number', instrument: 'Acid Number (Auto-titration)' },
    { key: 'carbonResidue', label: 'Carbon Residue', instrument: 'Micro Carbon Residue Tester' },
    { key: 'waterKarlFisher', label: 'Water content by\nKarl Fisher', instrument: 'Water content (Karl Fisher)' },
    { key: 'waterDistillation', label: 'Water content\nDistillation', instrument: 'Water content (Distillation)' },
    { key: 'kinematicViscosity', label: 'Kinematic\nviscosity', instrument: 'Kinematic viscosity' },
    { key: 'coolingCurve', label: 'Characteristic\nTemperature', instrument: 'Cooling curve measurement' },
    { key: 'insolublePentane', label: 'Pentane', instrument: 'Insoluble pentane' },
    { key: 'report', label: 'Report' },
  ];
  const instrumentToKey = new Map(
    columns
      .filter((column) => column.instrument)
      .map((column) => [column.instrument.toUpperCase(), column.key])
  );
  const monthly = {};
  for (let m = 1; m <= 12; m++) {
    monthly[m] = { month: m, counts: {} };
    for (const column of columns) {
      monthly[m].counts[column.key] = 0;
    }
  }

  const monthFromDate = (value) => {
    if (!value) return null;
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) return null;
    return new Date(timestamp - 7 * 60 * 60 * 1000).getMonth() + 1;
  };

  try {
    const requestQuery = `
      SELECT
        [ReqNo],
        [SampleCode],
        [SampleStatus],
        [Instrument],
        [ReceivedDate]
      FROM [QO].[dbo].[Request]
      WHERE YEAR([ReceivedDate]) = ${year}
        AND [ReceivedDate] IS NOT NULL
        AND UPPER(LTRIM(RTRIM(ISNULL([RequestStatus], N'')))) NOT IN (N'REJECT', N'CANCEL')
        AND UPPER(LTRIM(RTRIM(ISNULL([SampleStatus], N'')))) NOT IN (N'REJECT', N'CANCEL')
        AND UPPER(LTRIM(RTRIM(ISNULL([ItemStatus], N'')))) NOT IN (N'REJECT', N'CANCEL')
    `;

    const db = await mssql.qurey(requestQuery);
    const reportSampleByKey = new Map();

    for (const row of db.recordset || []) {
      const month = monthFromDate(row.ReceivedDate);
      if (!month || !monthly[month]) continue;

      const instrumentKey = instrumentToKey.get((row.Instrument || '').trim().toUpperCase());
      if (instrumentKey) {
        monthly[month].counts[instrumentKey] += 1;
      }

      const sampleStatus = (row.SampleStatus || '').trim().toUpperCase();
      const reqNo = (row.ReqNo || '').trim();
      const sampleCode = (row.SampleCode || '').trim();
      if (sampleStatus === 'COMPLETE' && reqNo && sampleCode) {
        const reportKey = `${month}|${reqNo}|${sampleCode}`;
        reportSampleByKey.set(reportKey, month);
      }
    }

    for (const month of reportSampleByKey.values()) {
      monthly[month].counts.report += 2;
    }

    return res.status(200).json({
      columns: columns.map(({ key, label }) => ({ key, label })),
      monthlyData: Object.values(monthly).sort((a, b) => a.month - b.month),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

router.post('/QO/KPIItemByCustomer', async (req, res) => {
  console.log('--QO-KPIItemByCustomer--');

  const year = parseInt(req.body.year, 10);
  const month = parseInt(req.body.month, 10);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return res.status(400).json({ message: 'Invalid year' });
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return res.status(400).json({ message: 'Invalid month' });
  }

  const parseCost = (value) => {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = Number(String(value).replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const monthFromDate = (value) => {
    if (!value) return null;
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) return null;
    return new Date(timestamp - 7 * 60 * 60 * 1000).getMonth() + 1;
  };

  try {
    const emptyMonthly = () => {
      const monthly = {};
      for (let m = 1; m <= 12; m++) {
        monthly[m] = { item: 0, cost: 0 };
      }
      return monthly;
    };
    const byCustomer = new Map();

    const masterCustomerQuery = `
      SELECT DISTINCT LTRIM(RTRIM([CustFull])) AS [CustFull]
      FROM [QO].[dbo].[MasterPattern]
      WHERE LTRIM(RTRIM(ISNULL([CustFull], N''))) <> N''
      AND LTRIM(RTRIM(ISNULL([CustFull], N''))) <> N'Master'
      ORDER BY LTRIM(RTRIM([CustFull]))
    `;
    const masterCustomerDb = await mssql.qurey(masterCustomerQuery);
    for (const row of masterCustomerDb.recordset || []) {
      const customerName = (row.CustFull || '').toString().trim();
      if (!customerName || byCustomer.has(customerName)) continue;
      byCustomer.set(customerName, {
        customerName,
        monthly: emptyMonthly(),
      });
    }

    // Count every received request (ReceivedDate set) for the year as soon as it
    // is received, instead of waiting until all of its items reach COMPLETE.
    const requestQuery = `
      SELECT
        R.[CustFull],
        R.[ReceivedDate],
        R.[Cost]
      FROM [QO].[dbo].[Request] R
      WHERE YEAR(R.[ReceivedDate]) = ${year}
        AND R.[ReceivedDate] IS NOT NULL
        AND UPPER(LTRIM(RTRIM(ISNULL(R.[RequestStatus], N'')))) NOT IN (N'REJECT', N'CANCEL')
        AND UPPER(LTRIM(RTRIM(ISNULL(R.[SampleStatus], N'')))) NOT IN (N'REJECT', N'CANCEL')
        AND UPPER(LTRIM(RTRIM(ISNULL(R.[ItemStatus], N'')))) NOT IN (N'REJECT', N'CANCEL')
    `;

    const db = await mssql.qurey(requestQuery);

    for (const row of db.recordset || []) {
      const customerName = (row.CustFull || '').toString().trim() || '-';
      const rowMonth = monthFromDate(row.ReceivedDate);
      if (!rowMonth) continue;

      if (!byCustomer.has(customerName)) {
        byCustomer.set(customerName, {
          customerName,
          monthly: emptyMonthly(),
        });
      }

      const customer = byCustomer.get(customerName);
      customer.monthly[rowMonth].item += 1;
      customer.monthly[rowMonth].cost += parseCost(row.Cost);
    }

    const exportRows = Array.from(byCustomer.values())
      .sort((a, b) => a.customerName.localeCompare(b.customerName))
      .map((customer) => {
        const monthly = {};
        for (let m = 1; m <= 12; m++) {
          monthly[m] = {
            item: customer.monthly[m].item,
            cost: parseFloat(customer.monthly[m].cost.toFixed(2)),
          };
        }
        return {
          customerName: customer.customerName,
          monthly,
        };
      });

    const systemRows = exportRows.map((row) => ({
      customerName: row.customerName,
      item: row.monthly[month]?.item || 0,
      cost: row.monthly[month]?.cost || 0,
    }));

    return res.status(200).json({ systemRows, exportRows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

router.post('/QO/ItemByDueDate', async (req, res) => {
  //-------------------------------------
  console.log("--ItemByDueDate--");
  //-------------------------------------
  // console.log(req.body);
  let query = `
    WITH ReqMaxDue AS (
        SELECT 
            ReqNo,
            MAX(AnalysisDue) AS MaxAnalysisDue
        FROM [QO].[dbo].[Request]
        GROUP BY ReqNo
    )

    SELECT 
    RMD.MaxAnalysisDue AS AnalysisDue,

    COUNT(CASE WHEN R.ItemStatus = 'RECEIVE SAMPLE' THEN 1 END) AS RECEIVE,
    COUNT(CASE WHEN R.ItemStatus = 'LIST ITEM' THEN 1 END) AS WAITANALYSIS,
    COUNT(CASE WHEN R.ItemStatus = 'RECHECK 1' THEN 1 END) AS WAITLISTRECHECK1,
    COUNT(CASE WHEN R.ItemStatus = 'LIST RECHECK 1' THEN 1 END) AS WAITRECHECK1,
    COUNT(CASE WHEN R.ItemStatus = 'RECHECK 2' THEN 1 END) AS WAITLISTRECHECK2,
    COUNT(CASE WHEN R.ItemStatus = 'LIST RECHECK 2' THEN 1 END) AS WAITRECHECK2,
    COUNT(CASE WHEN R.ItemStatus = 'RECONFIRM' THEN 1 END) AS WAITLISTRECONFIRM,
    COUNT(CASE WHEN R.ItemStatus = 'LIST RECONFIRM' THEN 1 END) AS WAITRECONFIRM,
    COUNT(CASE WHEN R.ItemStatus = 'FINISH ITEM' OR R.ItemStatus = 'FINISH RECHECK 1' OR R.ItemStatus = 'FINISH RECHECK 2' OR R.ItemStatus = 'FINISH RECONFIRM' THEN 1 END) AS WAITAPPROVEJOB,
    COUNT(CASE WHEN R.ItemStatus = 'APPROVE ITEM' THEN 1 END) AS WAITAPPROVEREPORT

    FROM [QO].[dbo].[Request] R
    INNER JOIN ReqMaxDue RMD
        ON R.ReqNo = RMD.ReqNo

    WHERE RMD.MaxAnalysisDue BETWEEN 
        DATEADD(day,-45, CONVERT(date, GETDATE())) 
        AND DATEADD(day, 30, CONVERT(date, GETDATE()))

    GROUP BY RMD.MaxAnalysisDue
    ORDER BY RMD.MaxAnalysisDue ASC;
    `;
  let db = await mssql.qurey(query);
  let result = {
    Bangpoo: [],
  };

  for (const row of db["recordset"]) {

    const total = row.RECEIVE + row.WAITANALYSIS + row.WAITLISTRECHECK1 +
      row.WAITRECHECK1 + row.WAITLISTRECHECK2 + row.WAITRECHECK2 +
      row.WAITLISTRECONFIRM + row.WAITRECONFIRM + row.WAITAPPROVEJOB + row.WAITAPPROVEREPORT;

    if (total === 0) continue;

    const item = {
      DUEDATE: row.AnalysisDue,
      RECEIVE: row.RECEIVE,
      WAITANALYSIS: row.WAITANALYSIS,
      WAITLISTRECHECK1: row.WAITLISTRECHECK1,
      WAITRECHECK1: row.WAITRECHECK1,
      WAITLISTRECHECK2: row.WAITLISTRECHECK2,
      WAITRECHECK2: row.WAITRECHECK2,
      WAITLISTRECONFIRM: row.WAITLISTRECONFIRM,
      WAITRECONFIRM: row.WAITRECONFIRM,
      WAITAPPROVEJOB: row.WAITAPPROVEJOB,
      WAITAPPROVEREPORT: row.WAITAPPROVEREPORT,
    };

    result.Bangpoo.push(item);

  }

  if (db["recordset"].length > 0) {
    // console.log('200');
    return res.status(200).json(result);
  } else {
    // console.log('400');
    return res.status(400).json('ไม่พบข้อมูล');
  }
  //-------------------------------------

});

function countWorkingDays(startDate, endDate) {
  let count = 0;
  const cur = new Date(startDate);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  while (cur <= end) {
    const dateStr = cur.toISOString().split('T')[0];      // "YYYY-MM-DD"
    const isHoliday = holidays instanceof Set && holidays.has(dateStr);

    if (!isHoliday) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

async function generateBaseReqNo() {
  const currentYear = new Date().getFullYear().toString().slice(-2);

  const result = await mssql.qurey(`
    SELECT TOP 1 ReqNo FROM [QO].[dbo].[Request]
    WHERE ReqNo LIKE 'QUE-${currentYear}-%'
    ORDER BY ReqNo DESC
  `);

  let nextNumber = 1;
  if (result.recordset.length > 0) {
    const lastReqNo = result.recordset[0].ReqNo; // QUE-25-XXXX
    const lastNumberStr = lastReqNo.split('-')[2]; // 'XXXX'
    if (lastNumberStr) {
      nextNumber = parseInt(lastNumberStr) + 1;
    }
  }

  const numberPart = nextNumber.toString().padStart(4, '0'); // XXXX
  return `QUE-${currentYear}-${numberPart}`;
}

const formatDate = (date) => {
  if (!date || date.getTime() === 0) {
    return "";
  }
  let day = String(date.getUTCDate()).padStart(2, '0');
  let month = String(date.getUTCMonth() + 1).padStart(2, '0');
  let year = date.getUTCFullYear();
  return `${year}-${month}-${day}`;
};

function convertToISO(dateStr) {
  // 06-04-26 → [06, 04, 26]
  const [day, month, year] = dateStr.split('-');

  // แปลงปี 2 หลัก → 4 หลัก (สมมติ 20xx)
  const fullYear = '20' + year;

  // return yyyy-mm-dd
  return `${fullYear}-${month}-${day}`;
}

function convertToISODate(dateStr) {
  if (!dateStr) return '';
  const raw = dateStr.toString();
  const parts = raw.split('-');
  if (parts.length !== 3) return raw;
  if (parts[0].length === 4) return raw;

  const [day, month, year] = parts;
  const fullYear = year.length === 2 ? `20${year}` : year;
  return `${fullYear}-${month}-${day}`;
}

async function calculateAnalysisDue(startDate, addDays) {
  let output = { "AnalysisDue": null };
  let date = new Date(startDate);
  let addedDays = 1;

  if (!holidays) {
    throw new Error("Holidays data has not been loaded. Please call loadHolidays() first.");
  }

  if (addDays === null || addDays === '') {
    return { "AnalysisDue": "" };
  }

  while (addedDays < addDays) {
    const currentDate = date.toISOString().split('T')[0];

    const isHoliday = holidays.has(currentDate);
    // console.log(isHoliday);
    if (!isHoliday) {
      addedDays++;
    }

    date.setDate(date.getDate() + 1);
  }

  while (holidays.has(date.toISOString().split('T')[0])) {
    date.setDate(date.getDate() + 1);
  }

  output['AnalysisDue'] = formatDate(date);
  return output;
}

let holidays = null;
async function loadHolidays() {
  const query = `SELECT HolidayDate FROM [SAR].[dbo].[Master_Holiday]`;
  try {
    let db = await mssql.qurey(query);
    if (db && db.recordsets && db.recordsets[0]) {
      holidays = new Set(db.recordsets[0].map(record => record.HolidayDate.toISOString().split('T')[0]));
      // console.log("Holidays loaded:", holidays);
    }
  } catch (error) {
    console.error("Error loading holidays:", error);
    holidays = new Set();
  }
}

// ── Helper: escape single-quote เพื่อป้องกัน SQL Injection เบื้องต้น ──
function _esc(str) {
  if (str == null) return '';
  return String(str).replace(/'/g, "''");
}

function _sqlIdentifier(str) {
  return `[${String(str).replace(/]/g, ']]')}]`;
}

function _sqlTextValue(value) {
  if (value === '' || value === null || value === undefined) return 'NULL';
  return `N'${_esc(value)}'`;
}

function _qoRequestStructureColumns(alias = '') {
  const prefix = alias ? `${_sqlIdentifier(alias)}.` : '';
  return [
    'Id',
    'ReqNo',
    'SampleCode',
    'RequestStatus',
    'SampleStatus',
    'ItemStatus',
    'CustFull',
    'CustShort',
    'SampleNo',
    'SampleName',
    'Furnance',
    'Instrument',
    'ItemNo',
    'ItemName',
    'ReportName',
    'NewOil',
    'Min',
    'Max',
    'Remark',
    'FormatReport',
    'ReqSection',
    'ReqDate',
    'ReqUser',
    'SamplingDate',
    'UserEditSampling',
    'EditSamplingDate',
    'UserSend',
    'SendDate',
    'Receiver',
    'ReceivedDate',
    'UserEditReceived',
    'EditReceivedDate',
    'AnalysisDue',
    'UserEditAnalysisDue',
    'EditAnalysisDueDate',
    'UserReject',
    'RejectDate',
    'RemarkReject',
    'UserListItem',
    'ListItemDate',
    'UserAnalysis',
    'AnalysisDate',
    'Picture',
    'Report_Graph',
    'Result_1',
    'Result_2',
    'Result_3',
    'Result_4',
    'Result_5',
    'Result_6',
    'Result_7',
    'Result_8',
    'ResultApprove',
    'ItemApprover',
    'ItemApproveDate',
    'RemarkItemApprover',
    'ReportApprover',
    'ReportApproveDate',
    'RemarkReportApprover',
  ].map((column) => `${prefix}${_sqlIdentifier(column)}`).join(',\n      ');
}

function _safePathSegment(value) {
  const text = String(value || '').trim();
  const cleaned = text.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').replace(/\.+$/g, '').trim();
  return cleaned || 'unknown';
}

function _deleteCoolingUploadFiles(picturePaths) {
  const targets = new Set();
  const deletedFiles = [];
  const errors = [];

  for (const picturePath of picturePaths || []) {
    const rawPath = String(picturePath || '').trim();
    if (!rawPath) continue;

    const resolvedPath = nodePath.resolve(rawPath);
    const extension = nodePath.extname(resolvedPath).toLowerCase();
    const baseWithoutExtension = resolvedPath.slice(0, resolvedPath.length - extension.length);

    if (_isCoolingUploadFilePath(resolvedPath)) {
      targets.add(resolvedPath);
    }

    if (extension === '.png' || extension === '.pdf') {
      const pngPath = `${baseWithoutExtension}.png`;
      const pdfPath = `${baseWithoutExtension}.pdf`;
      if (_isCoolingUploadFilePath(pngPath)) targets.add(pngPath);
      if (_isCoolingUploadFilePath(pdfPath)) targets.add(pdfPath);
    }
  }

  for (const target of targets) {
    try {
      if (fs.existsSync(target) && fs.statSync(target).isFile()) {
        fs.unlinkSync(target);
        deletedFiles.push(target);
      }
    } catch (error) {
      errors.push({ path: target, message: error.message || String(error) });
    }
  }

  return { deletedFiles, errors };
}

function _isCoolingUploadFilePath(filePath) {
  const root = nodePath.resolve(COOLING_PDF_DIR).toLowerCase();
  const target = nodePath.resolve(filePath).toLowerCase();
  return target.startsWith(`${root}${nodePath.sep.toLowerCase()}`);
}

async function _renderPdfFirstPageToPng(pdfPath, imagePath) {
  const popplerPath = _resolvePopplerPdftocairoPath();
  const outputPrefix = nodePath.join(
    nodePath.dirname(imagePath),
    `${nodePath.basename(imagePath, nodePath.extname(imagePath))}__page`
  );
  const popplerOutputPath = `${outputPrefix}.png`;

  if (fs.existsSync(popplerOutputPath)) {
    fs.unlinkSync(popplerOutputPath);
  }

  await _execFileAsync(popplerPath, [
    '-png',
    '-singlefile',
    '-r',
    '150',
    '-f',
    '1',
    '-l',
    '1',
    pdfPath,
    outputPrefix,
  ]);

  if (!fs.existsSync(popplerOutputPath)) {
    throw new Error('PDF to image conversion failed: output image was not created');
  }

  if (fs.existsSync(imagePath)) {
    fs.unlinkSync(imagePath);
  }
  fs.renameSync(popplerOutputPath, imagePath);
}

function _resolvePopplerPdftocairoPath() {
  const bundledPath = nodePath.join(
    __dirname,
    '..',
    '..',
    'node_modules',
    'pdf-poppler',
    'lib',
    'win',
    'poppler-0.51',
    'bin',
    'pdftocairo.exe'
  );

  if (fs.existsSync(bundledPath)) {
    return bundledPath;
  }

  throw new Error(`Missing Poppler pdftocairo.exe: ${bundledPath}`);
}

function _execFileAsync(file, args) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        const detail = (stderr || stdout || error.message || '').toString().trim();
        reject(new Error(`PDF to image conversion failed${detail ? `: ${detail}` : ''}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function _qoResultSaveWorkflowStatusSql() {
  return `
        SELECT
          @ReqNo = CONVERT(NVARCHAR(4000), [ReqNo]),
          @SampleCode = CONVERT(NVARCHAR(4000), [SampleCode])
        FROM [QO].[dbo].[Request]
        WHERE CONVERT(NVARCHAR(4000), [Id]) = @RequestId;

        IF @ReqNo IS NULL OR @SampleCode IS NULL
          RAISERROR('Request workflow status update failed for Id: %s', 16, 1, @RequestId);

        IF UPPER(LTRIM(RTRIM(ISNULL(@NextItemStatus, N'')))) IN (
          N'FINISH ITEM',
          N'FINISH RECHECK 1',
          N'FINISH RECHECK 2',
          N'FINISH RECONFIRM'
        )
        BEGIN
          IF EXISTS (
            SELECT 1
            FROM [QO].[dbo].[Request]
            WHERE CONVERT(NVARCHAR(4000), [ReqNo]) = @ReqNo
              AND CONVERT(NVARCHAR(4000), [SampleCode]) = @SampleCode
              AND UPPER(LTRIM(RTRIM(ISNULL([RequestStatus], N'')))) NOT IN (N'REJECT', N'CANCEL')
              AND UPPER(LTRIM(RTRIM(ISNULL([ItemStatus], N'')))) NOT IN (N'REJECT', N'CANCEL')
          )
          AND NOT EXISTS (
            SELECT 1
            FROM [QO].[dbo].[Request]
            WHERE CONVERT(NVARCHAR(4000), [ReqNo]) = @ReqNo
              AND CONVERT(NVARCHAR(4000), [SampleCode]) = @SampleCode
              AND UPPER(LTRIM(RTRIM(ISNULL([RequestStatus], N'')))) NOT IN (N'REJECT', N'CANCEL')
              AND UPPER(LTRIM(RTRIM(ISNULL([ItemStatus], N'')))) NOT IN (
                N'REJECT',
                N'CANCEL',
                N'FINISH ITEM',
                N'FINISH RECHECK 1',
                N'FINISH RECHECK 2',
                N'FINISH RECONFIRM',
                N'APPROVE ITEM',
                N'COMPLETE'
              )
          )
          BEGIN
            UPDATE [QO].[dbo].[Request]
            SET [SampleStatus] = N'WAIT APPROVE'
            WHERE CONVERT(NVARCHAR(4000), [ReqNo]) = @ReqNo
              AND CONVERT(NVARCHAR(4000), [SampleCode]) = @SampleCode
              AND UPPER(LTRIM(RTRIM(ISNULL([RequestStatus], N'')))) NOT IN (N'REJECT', N'CANCEL');
          END

          IF EXISTS (
            SELECT 1
            FROM [QO].[dbo].[Request]
            WHERE CONVERT(NVARCHAR(4000), [ReqNo]) = @ReqNo
              AND UPPER(LTRIM(RTRIM(ISNULL([RequestStatus], N'')))) NOT IN (N'REJECT', N'CANCEL')
              AND UPPER(LTRIM(RTRIM(ISNULL([SampleStatus], N'')))) NOT IN (N'REJECT', N'CANCEL')
          )
          AND NOT EXISTS (
            SELECT 1
            FROM [QO].[dbo].[Request]
            WHERE CONVERT(NVARCHAR(4000), [ReqNo]) = @ReqNo
              AND UPPER(LTRIM(RTRIM(ISNULL([RequestStatus], N'')))) NOT IN (N'REJECT', N'CANCEL')
              AND UPPER(LTRIM(RTRIM(ISNULL([SampleStatus], N'')))) NOT IN (
                N'REJECT',
                N'CANCEL',
                N'WAIT APPROVE',
                N'COMPLETE'
              )
          )
          BEGIN
            UPDATE [QO].[dbo].[Request]
            SET [RequestStatus] = N'WAIT APPROVE'
            WHERE CONVERT(NVARCHAR(4000), [ReqNo]) = @ReqNo
              AND UPPER(LTRIM(RTRIM(ISNULL([RequestStatus], N'')))) NOT IN (N'REJECT', N'CANCEL');
          END
        END
`;
}

function _qoCoolingCurveValueForItemName(itemName, values) {
  const normalized = String(itemName || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (normalized.includes('400')) return values.CTime_400;
  if (normalized.includes('300')) return values.CTime_300;
  if (normalized.includes('hvalue') || normalized.includes('performance')) return values.CPerformance;
  if (
    normalized.includes('characteristic')
    || normalized.includes('charsc')
    || normalized.includes('temperature')
    || normalized.includes('temp')
  ) {
    return values.Characteristic;
  }
  return '';
}

function _qoCoolingResultColumnForStatus(status) {
  switch (String(status || '').trim().toUpperCase()) {
    case 'LIST ITEM':
    case 'FINISH ITEM':
      return 'Result_1';
    case 'LIST RECHECK 1':
    case 'FINISH RECHECK 1':
      return 'Result_3';
    case 'LIST RECHECK 2':
    case 'FINISH RECHECK 2':
      return 'Result_5';
    case 'LIST RECONFIRM':
    case 'FINISH RECONFIRM':
      return 'Result_7';
    default:
      return '';
  }
}

const QO_APPROVAL_EDITABLE_COLUMNS = [
  'Result_1',
  'Result_2',
  'Result_ppm_1',
  'Result_ppm_2',
  'SampleUse_1',
  'SampleUse_2',
  'CollectWater_1',
  'CollectWater_2',
  'SampleWeight_1',
  'SampleWeight_2',
  'W1_1',
  'W1_2',
  'W2_1',
  'W2_2',
  'W2_W1_1',
  'W2_W1_2',
  'W3_1',
  'W3_2',
  'Characteristic',
  'CTime_400',
  'CTime_300',
  'CPerformance',
];

function _qoApprovalInstrumentEditableSetters(row, optionalColumnsForTable) {
  const setters = [];
  for (const column of QO_APPROVAL_EDITABLE_COLUMNS) {
    if (!optionalColumnsForTable.has(column)) continue;
    if (!Object.prototype.hasOwnProperty.call(row, column)) continue;
    setters.push(`${_sqlIdentifier(column)} = ${_sqlTextValue(row[column])}`);
  }
  return setters;
}

function _qoApprovalRequestResultSetters(status, row, isCoolingCurve) {
  const result1Sql = _sqlTextValue(row.Result_1);
  const result2Sql = _sqlTextValue(row.Result_2);

  switch (String(status || '').trim().toUpperCase()) {
    case 'LIST ITEM':
    case 'FINISH ITEM':
      return isCoolingCurve
        ? [`[Result_1] = ${result1Sql}`]
        : [`[Result_1] = ${result1Sql}`, `[Result_2] = ${result2Sql}`];
    case 'LIST RECHECK 1':
    case 'FINISH RECHECK 1':
      return isCoolingCurve
        ? [`[Result_3] = ${result1Sql}`]
        : [`[Result_3] = ${result1Sql}`, `[Result_4] = ${result2Sql}`];
    case 'LIST RECHECK 2':
    case 'FINISH RECHECK 2':
      return isCoolingCurve
        ? [`[Result_5] = ${result1Sql}`]
        : [`[Result_5] = ${result1Sql}`, `[Result_6] = ${result2Sql}`];
    case 'LIST RECONFIRM':
    case 'FINISH RECONFIRM':
      return isCoolingCurve
        ? [`[Result_7] = ${result1Sql}`]
        : [`[Result_7] = ${result1Sql}`, `[Result_8] = ${result2Sql}`];
    default:
      return [];
  }
}

function _qoAverageResultText(result1, result2) {
  const texts = [result1, result2]
    .map((value) => String(value ?? '').trim())
    .filter((value) => value !== '' && value !== '-');
  if (texts.some(_qoIsLessThanResultText)) {
    const numericText = texts.find((value) => !_qoIsLessThanResultText(value) && Number.isFinite(Number(value)));
    return numericText || texts[0] || '';
  }
  const numbers = texts
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (numbers.length === 0) return '';

  const avg = numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
  const decimalPlaces = texts.reduce((max, value) => Math.max(max, _qoDecimalPlaces(value)), 0);
  return decimalPlaces === 0 ? String(Math.round(avg)) : avg.toFixed(decimalPlaces);
}

function _qoIsLessThanResultText(value) {
  return String(value || '').trim().startsWith('<');
}

// ── Karl Fischer LOQ rule ─────────────────────────────────────────────────
// When MasterPattern.LOQ_Karlfischer is true for the "Water content by Karl
// Fisher" item, an approved result below the limit of quantitation is reported
// as "Tr" (trace) instead of the number.
const QO_KARL_FISCHER_LOQ_LIMIT = 0.05;
const QO_KARL_FISCHER_TRACE_TEXT = 'Tr';
const QO_KARL_FISCHER_ITEM_NAME_KEYS = new Set([
  'watercontentbykarlfisher',
  'watercontentbykarlfischer',
]);

function _qoNormalizeName(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function _qoIsKarlFischerItemName(itemName) {
  return QO_KARL_FISCHER_ITEM_NAME_KEYS.has(_qoNormalizeName(itemName));
}

function _qoIsTrueFlag(value) {
  const text = String(value ?? '').trim().toLowerCase();
  return text === 'true' || text === '1' || text === 'yes' || text === 'y';
}

function _qoApplyKarlFischerLoq(resultApprove, loqEnabled) {
  if (!loqEnabled) return resultApprove;
  const numeric = Number(String(resultApprove ?? '').trim());
  if (!Number.isFinite(numeric) || numeric >= QO_KARL_FISCHER_LOQ_LIMIT) return resultApprove;
  return QO_KARL_FISCHER_TRACE_TEXT;
}

async function _qoMasterPatternHasLoqColumn() {
  const db = await mssql.qurey(`
    SELECT c.name AS ColumnName
    FROM [QO].sys.tables t
    INNER JOIN [QO].sys.schemas s ON s.schema_id = t.schema_id
    INNER JOIN [QO].sys.columns c ON c.object_id = t.object_id
    WHERE s.name = N'dbo'
      AND t.name = N'MasterPattern'
      AND c.name = N'LOQ_Karlfischer';
  `);
  return (db["recordsets"]?.[0] || []).length > 0;
}

// Map Request.Id -> true when that request row is a Karl Fischer water content
// item whose MasterPattern row has LOQ_Karlfischer enabled.
async function _loadKarlFischerLoqByRequestId(requestIds) {
  const ids = [...new Set((requestIds || []).map((id) => String(id || '').trim()).filter(Boolean))];
  const loqByRequestId = new Map();
  if (ids.length === 0) return loqByRequestId;
  if (!(await _qoMasterPatternHasLoqColumn())) return loqByRequestId;

  const idList = ids.map((id) => `N'${_esc(id)}'`).join(', ');
  const db = await mssql.qurey(`
    SELECT
      CONVERT(NVARCHAR(4000), r.[Id]) AS RequestId,
      r.[ItemName] AS ItemName,
      (
        SELECT TOP (1) mp.[LOQ_Karlfischer]
        FROM [QO].[dbo].[MasterPattern] mp
        WHERE mp.[CustShort] = r.[CustShort]
          AND mp.[SampleNo] = r.[SampleNo]
          AND mp.[ItemName] = r.[ItemName]
      ) AS LOQ_Karlfischer
    FROM [QO].[dbo].[Request] r
    WHERE CONVERT(NVARCHAR(4000), r.[Id]) IN (${idList});
  `);

  for (const row of db["recordsets"]?.[0] || []) {
    const enabled = _qoIsKarlFischerItemName(row.ItemName) && _qoIsTrueFlag(row.LOQ_Karlfischer);
    loqByRequestId.set(String(row.RequestId || '').trim(), enabled);
  }
  return loqByRequestId;
}

function _qoDecimalPlaces(value) {
  const text = String(value || '').trim();
  const pointIndex = text.indexOf('.');
  return pointIndex < 0 ? 0 : text.length - pointIndex - 1;
}

function _qoRecheckStatusForApproval(status) {
  switch (String(status || '').trim().toUpperCase()) {
    case 'FINISH ITEM':
    case 'FINISH RECHECK 1':
      return 'RECHECK 1';
    case 'FINISH RECHECK 2':
      return 'RECHECK 2';
    case 'FINISH RECONFIRM':
      return 'RECONFIRM';
    default:
      return '';
  }
}

function _qoInstrumentTable(instrument) {
  return _qoInstrumentTableFromName(_qoInstrumentTableName(instrument));
}

function _qoInstrumentTableName(instrument) {
  const instrumentName = String(instrument || '').trim();
  if (!instrumentName) throw new Error('Missing Instrument');
  return `Instrument_${instrumentName}`;
}

function _qoInstrumentIdColumn(instrument) {
  const instrumentName = String(instrument || '').trim();
  if (!instrumentName) throw new Error('Missing Instrument');
  return `Id_${instrumentName}`;
}

function _qoInstrumentTableFromName(tableName) {
  return `[QO].[dbo].${_sqlIdentifier(tableName)}`;
}

async function _resolveQoInstrumentRecordIdColumn(tableName, instrument) {
  const preferredColumn = _qoInstrumentIdColumn(instrument);
  const query = `
    SELECT
      c.name AS ColumnName,
      c.is_identity AS IsIdentity
    FROM [QO].sys.tables t
    INNER JOIN [QO].sys.schemas s ON s.schema_id = t.schema_id
    INNER JOIN [QO].sys.columns c ON c.object_id = t.object_id
    WHERE s.name = N'dbo'
      AND t.name = N'${_esc(tableName)}';
  `;

  const db = await mssql.qurey(query);
  const columns = db["recordsets"]?.[0] || [];
  if (columns.length === 0) {
    throw new Error(`Missing instrument table: ${tableName}`);
  }

  const preferred = columns.find((column) => column.ColumnName === preferredColumn);
  if (preferred) return preferred.ColumnName;

  const identity = columns.find((column) => Boolean(column.IsIdentity));
  if (identity) return identity.ColumnName;

  const requestId = columns.find((column) => column.ColumnName === 'Id');
  if (requestId) return requestId.ColumnName;

  throw new Error(`Missing instrument id column: ${tableName}.${preferredColumn}`);
}

function _qoItemStatusFilter(listCheck, finishCheck) {
  const includeList = listCheck !== false && listCheck !== 'false';
  const includeFinish = finishCheck !== false && finishCheck !== 'false';
  const statuses = [];

  if (includeList) {
    statuses.push('LIST ITEM', 'LIST RECHECK 1', 'LIST RECHECK 2', 'LIST RECONFIRM');
  }

  if (includeFinish) {
    statuses.push('FINISH ITEM', 'FINISH RECHECK 1', 'FINISH RECHECK 2', 'FINISH RECONFIRM');
  }

  if (statuses.length === 0) return '';
  return statuses.map((status) => `N'${_esc(status)}'`).join(', ');
}

async function _loadQoInstrumentOptionalColumns(tableNames, optionalColumns) {
  const uniqueNames = [...new Set(tableNames)];
  if (uniqueNames.length === 0 || optionalColumns.length === 0) return new Map();

  const tableList = uniqueNames.map((name) => `N'${_esc(name)}'`).join(', ');
  const columnList = optionalColumns.map((name) => `N'${_esc(name)}'`).join(', ');
  const query = `
    SELECT
      t.name AS TableName,
      c.name AS ColumnName
    FROM [QO].sys.tables t
    INNER JOIN [QO].sys.schemas s ON s.schema_id = t.schema_id
    INNER JOIN [QO].sys.columns c ON c.object_id = t.object_id
    WHERE s.name = N'dbo'
      AND t.name IN (${tableList})
      AND c.name IN (${columnList});
  `;

  const db = await mssql.qurey(query);
  const rows = db["recordsets"]?.[0] || [];
  const columnsByName = new Map(uniqueNames.map((name) => [name, new Set()]));

  for (const row of rows) {
    if (!columnsByName.has(row.TableName)) {
      columnsByName.set(row.TableName, new Set());
    }
    columnsByName.get(row.TableName).add(row.ColumnName);
  }

  return columnsByName;
}

async function _loadQoInstrumentTableMeta(tableNames, requiredColumns) {
  const uniqueNames = [...new Set(tableNames)];
  const tableList = uniqueNames.map((name) => `N'${_esc(name)}'`).join(', ');
  const columnList = requiredColumns.map((name) => `N'${_esc(name)}'`).join(', ');

  const query = `
    SELECT
      t.name AS TableName,
      c.name AS ColumnName,
      c.is_identity AS IsIdentity
    FROM [QO].sys.tables t
    INNER JOIN [QO].sys.schemas s ON s.schema_id = t.schema_id
    LEFT JOIN [QO].sys.columns c
      ON c.object_id = t.object_id
      AND c.name IN (${columnList})
    WHERE s.name = N'dbo'
      AND t.name IN (${tableList});
  `;

  const db = await mssql.qurey(query);
  const rows = db["recordsets"]?.[0] || [];
  const metaByName = new Map();

  for (const row of rows) {
    if (!metaByName.has(row.TableName)) {
      metaByName.set(row.TableName, {
        columns: new Set(),
        idIsIdentity: false,
      });
    }

    const meta = metaByName.get(row.TableName);
    if (row.ColumnName) {
      meta.columns.add(row.ColumnName);
      if (row.ColumnName === 'Id' && Boolean(row.IsIdentity)) {
        meta.idIsIdentity = true;
      }
    }
  }

  const missingTables = uniqueNames.filter((name) => !metaByName.has(name));
  const missingColumns = [];
  for (const name of uniqueNames) {
    const meta = metaByName.get(name);
    if (!meta) continue;
    for (const column of requiredColumns) {
      if (!meta.columns.has(column)) {
        missingColumns.push(`${name}.${column}`);
      }
    }
  }

  if (missingTables.length > 0 || missingColumns.length > 0) {
    throw new Error([
      missingTables.length > 0 ? `Missing instrument table: ${missingTables.join(', ')}` : '',
      missingColumns.length > 0 ? `Missing instrument column: ${missingColumns.join(', ')}` : '',
    ].filter(Boolean).join(' | '));
  }

  return metaByName;
}

module.exports = router;

