import fs from "node:fs/promises"
import path from "node:path"

const MILLISECONDS_IN_A_DAY = 86400000 // 1000 ms/sec × 60 sec/min × 60 min/hr × 24 hrs/day

function getISOWeekNumber(date) {
  // Copy date to avoid modifying the original
  const d = new Date(date)
  // Set to nearest Monday
  d.setHours(0, 0, 0, 0)
  // Thursday in current week decides the year
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  // January 4 is always in week 1
  const week1 = new Date(d.getFullYear(), 0, 4)
  // Adjust to Thursday in week 1
  week1.setDate(week1.getDate() + 3 - ((week1.getDay() + 6) % 7))
  // Calculate week number
  return 1 + Math.round(((d - week1) / MILLISECONDS_IN_A_DAY - 3 + ((week1.getDay() + 6) % 7)) / 7)
}

  class FileLogger {
    constructor({
      path: logPath = "./logs", 
      fileName = "app", 
      rotate = "daily", 
      maxFiles = 30,
      maxSize = 10 * 1024 * 1024, // 10MB default
    }) {
      this.logPath = logPath
      this.fileName = fileName
      this.rotate = rotate
      this.maxFiles = maxFiles
      this.maxSize = maxSize
      this.currentLogFile = null
      this.lastRotationCheck = null
      this.writeQueue = Promise.resolve()
  
      this.initLogFile()
      return this.log.bind(this)
    }
  
  // Initialize the log file path (non-blocking)
  initLogFile() {
    this.ensureDirectoryExists().catch((err) => {
      console.error("Error creating log directory:", err)
    })

    const now = new Date()
    this.lastRotationCheck = now
    this.currentLogFile = this.generateLogFileName(now)
  }

    // Add log message to the queue and do the checks
    log(message) {
      const timestamp = new Date().toISOString()
      const logEntry = `[${timestamp}] ${message}\n`
  
      this.writeQueue = this.writeQueue
        .then(() => this.rotateLogIfNeeded())
        .then(() => this.appendLogEntry(logEntry))
        .catch(console.error(`Failed to log: ${logEntry}`))
    }
  
    async rotateLogIfNeeded() {
      const now = new Date()
      if (this.shouldRotate(now)) {
        this.lastRotationCheck = now
        this.currentLogFile = this.generateLogFileName(now)
        await this.cleanupOldLogs()
      }
    }
  
    async cleanupOldLogs() {
      try {
        const files = await fs.readdir(this.logPath)
        const logFiles = files
          .filter(file => file.startsWith(this.fileName) && file.endsWith('.log'))
          .sort()
  
        while (logFiles.length >= this.maxFiles) {
          const oldestFile = logFiles.shift()
          await fs.unlink(path.join(this.logPath, oldestFile))
        }
      } catch (error) {
        this.errorHandler('Log cleanup failed', error)
      }
    }
  
    async appendLogEntry(logEntry) {
      await this.ensureDirectoryExists()
      
      // Check file size before appending
      try {
        const stats = await fs.stat(this.currentLogFile)
        if (stats.size > this.maxSize) {
          this.currentLogFile = this.generateLogFileName(new Date())
        }
      } catch {
        // File doesn't exist, which is fine
      }
  
      await fs.appendFile(this.currentLogFile, logEntry)
    }
  

  shouldRotate(now) {
    if (!this.lastRotationCheck) return true

    const last = this.lastRotationCheck

    switch (this.rotate) {
      case "daily":
        return (
          now.getDate() !== last.getDate() ||
          now.getMonth() !== last.getMonth() ||
          now.getFullYear() !== last.getFullYear()
        )
      case "weekly": {
        return (
          getISOWeekNumber(now) !== getISOWeekNumber(last) || 
          now.getFullYear() !== last.getFullYear()
        )
      }
      case "monthly":
        return now.getMonth() !== last.getMonth() || now.getFullYear() !== last.getFullYear()
      default:
        return false
    }
  }

  generateLogFileName(date) {
    let dateSuffix

    switch (this.rotate) {
      case "daily":
        // YYYYMMDD
        dateSuffix = date.toISOString().slice(0, 10).replace(/-/g, "") 
        break
      case "weekly": {
        // YYYYMMDD but it's the Monday of the current week
        const day = date.getDate() - (date.getDay() || 7) + 1 // Adjust for Sunday (0)
        const monday = new Date(date)
        monday.setDate(day)
        dateSuffix = monday.toISOString().slice(0, 10).replace(/-/g, "")
        break
      }
      case "monthly":
        // YYYYMM
        dateSuffix = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`
        break
      default:
        dateSuffix = date.toISOString().slice(0, 10).replace(/-/g, "")
    }

    return path.join(this.logPath, `${this.fileName}-${dateSuffix}.log`)
  }

  async ensureDirectoryExists() {
    try {
      await fs.access(this.logPath)
    } catch (error) {
      // Directory doesn't exist, create it
      await fs.mkdir(this.logPath, { recursive: true })
    }
  }
}

export default FileLogger
