const fs = require("fs").promises;
const path = require("path");
var dt = require("./dateTime");

class Logger {
    constructor(logDir = __dirname) {
        this.logDir = logDir;
        this.errorLogFile = path.join(logDir, "../error.log");
        this.appLogFile = path.join(logDir, "../app.log");
        this.maxLogSize = 10 * 1024 * 1024; // 10MB
    }

    // แยกประเภท log
    async log(level, message, data = {}) {
        try {
            const logFile = level === "ERROR" ? this.errorLogFile : this.appLogFile;

            // Check log rotation
            await this.rotateLogIfNeeded(logFile);

            let timestamp = new Date().toISOString();
            timestamp = dt.formatDateTimeToSQL(timestamp);
            const logEntry = {
                timestamp,
                level,
                message,
                data,
            };

            const logLine =
                JSON.stringify(logEntry, null, 2) + "\n" + "-".repeat(50) + "\n";
            await fs.appendFile(logFile, logLine);
        } catch (err) {
            console.error("Logging failed:", err);
        }
    }

    // Log error พร้อม context
    async error(message, error, context = {}) {
        console.error("in error");
        await this.log("ERROR", message, {
            error: {
                message: error.message || error.toString(),
                stack: error.stack || "No stack trace",
                name: error.name || "Unknown Error",
            },
            context,
        });
    }

    // Log ข้อมูลทั่วไป
    async info(message, data = {}) {
        await this.log("INFO", message, data);
    }

    // Log warning
    async warn(message, data = {}) {
        await this.log("WARN", message, data);
    }

    // Log debug (สำหรับ development)
    async debug(message, data = {}) {
        if (process.env.NODE_ENV !== "production") {
            await this.log("DEBUG", message, data);
        }
    }

    // Database specific logging
    async dbError(query, params, error) {
        await this.error("Database Query Failed", error, {
            query: query,
            params: params,
            timestamp: new Date().toISOString(),
        });
    }

    async dbSuccess(query, params, result) {
        await this.info("Database Query Success", {
            query: query,
            paramCount: params ? params.length : 0,
            rowsAffected: result.rowsAffected || 0,
            recordCount: result.recordset ? result.recordset.length : 0,
        });
    }

    // Log rotation
    async rotateLogIfNeeded(logFile) {
        try {
            const stats = await fs.stat(logFile);
            if (stats.size > this.maxLogSize) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
                const backupFile = logFile.replace(".log", `_${timestamp}.log`);
                await fs.rename(logFile, backupFile);
                console.log(`Log rotated: ${backupFile}`);
            }
        } catch (err) {
            // ไฟล์ไม่มี หรือ error อื่น ๆ - ไม่ต้องทำอะไร
        }
    }

    // Clear logs (สำหรับ maintenance)
    async clearLogs() {
        try {
            await fs.unlink(this.errorLogFile);
            await fs.unlink(this.appLogFile);
            console.log("Logs cleared successfully");
        } catch (err) {
            console.log("No logs to clear or error clearing logs:", err.message);
        }
    }

    // อ่าน logs (สำหรับดู logs)
    async readErrorLogs(lines = 50) {
        try {
            const content = await fs.readFile(this.errorLogFile, "utf8");
            const logLines = content.split("-".repeat(50) + "\n");
            return logLines.slice(-lines);
        } catch (err) {
            return ["No error logs found"];
        }
    }

    async readAppLogs(lines = 50) {
        try {
            const content = await fs.readFile(this.appLogFile, "utf8");
            const logLines = content.split("-".repeat(50) + "\n");
            return logLines.slice(-lines);
        } catch (err) {
            return ["No app logs found"];
        }
    }
}

// Export singleton instance
const logger = new Logger();

module.exports = logger;