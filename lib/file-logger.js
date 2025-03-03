import fs from "node:fs/promises"
import path from "node:path"

class FileLogger {
  constructor({ path: logPath = "./logs", fileName = "app", rotate = "daily" }) {
    this.logPath = logPath
    this.fileName = fileName
    this.rotate = rotate
    this.currentLogFile = null
    this.lastRotationCheck = null

    // Initialize the log file path
    this.initLogFile()

    // Bind the instance to make it callable
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

  // Main logging method - non-blocking
  log(message) {
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] ${message}\n`

    // Check if we need to rotate the log file
    const now = new Date()
    if (this.shouldRotate(now)) {
      this.lastRotationCheck = now
      this.currentLogFile = this.generateLogFileName(now)
    }

    // Write to the log file without awaiting
    fs.appendFile(this.currentLogFile, logEntry).catch((error) => {
      console.error("Error writing to log file:", error)
    })
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
        // Get the week number (using Monday as first day of week)
        const getWeekNumber = (d) => {
          // Copy date to avoid modifying the original
          const date = new Date(d)
          // Set to nearest Monday
          date.setHours(0, 0, 0, 0)
          // Thursday in current week decides the year
          date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7))
          // January 4 is always in week 1
          const week1 = new Date(date.getFullYear(), 0, 4)
          // Adjust to Thursday in week 1
          week1.setDate(week1.getDate() + 3 - ((week1.getDay() + 6) % 7))
          // Calculate week number
          return 1 + Math.round(((date - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
        }

        return getWeekNumber(now) !== getWeekNumber(last) || now.getFullYear() !== last.getFullYear()
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
        dateSuffix = date.toISOString().slice(0, 10).replace(/-/g, "") // YYYYMMDD
        break
      case "weekly": {
        // Get the Monday of the current week
        const day = date.getDate() - (date.getDay() || 7) + 1 // Adjust for Sunday (0)
        const monday = new Date(date)
        monday.setDate(day)
        dateSuffix = monday.toISOString().slice(0, 10).replace(/-/g, "")
        break
      }
      case "monthly":
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

