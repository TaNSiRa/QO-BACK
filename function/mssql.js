const sql = require('mssql');
const logger = require("./logFile");
const config = {
  user: "sa",
  password: "Automatic",
  // password: "12345678",
  database: "",
  server: '172.23.10.51',
  // server: '127.0.0.1',
  pool: {
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000,
  },
  options: {
    encrypt: false, // for azure
    trustServerCertificate: true, // change to true for local dev / self-signed certs
    appName: "QO-BACK"
  }
}

// สร้าง Pool ครั้งเดียว ใช้ร่วมกันทุก query
const pool = new sql.ConnectionPool(config);
const poolConnect = pool.connect();

pool.on("error", (err) => {
  console.error("SQL Pool error:", err);
  logger.error("SQL Pool error", err, {});
});

const getPool = async () => {
  await poolConnect;
  return pool;
};

exports.qureySecu = async (qureyText, params) => {
  try {
    const p = await getPool();
    const request = p.request();
    params.forEach((param) => {
      request.input(param.name, sql[param.type], param.value);
    });
    const result = await request.query(qureyText);
    return result;
  } catch (err) {
    console.log("Query error:", err);
    await logger.error("Database query failed", err, {
      query: qureyText,
      params: params,
    });
    console.log("return err");
    return { err: true };
  }
};

exports.qurey = async (input) => {
  try {
    const p = await getPool();
    const result = await p.request().query(input);
    return result;
  } catch (err) {
    console.log("Query error:", err);
    try {
      await logger.error("Database query failed", err, {
        query: input,
      });
      console.log("return err");
    } catch (logErr) {
      console.log("logger error err : ", logErr);
      throw logErr;
    }
    throw err;
  }
};

exports.stringQureyLog = (action, user, detail) => {
  detail = detail.replace(/'/g, "''");
  let stringQuery = `
  INSERT INTO log_data (action,action_user,action_detail) VALUES ('${action}','${user}',N'${detail}');`;
  return stringQuery;
};

exports.stringSafeN = (textIn) => {
  try {
    textIn = textIn.replace(/'/g, "''");
    return textIn;
  } catch {
    console.log("stringSafeN err : ", textIn);
    return "";
  }
};