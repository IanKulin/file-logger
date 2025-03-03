import FileLogger from "./lib/file-logger.js"

// Create a logger instance
const securityLogger = new FileLogger({
  path: "./data",
  fileName: "security",
  rotate: "weekly",
})

// Log some messages (non-blocking)
securityLogger("User logged in")
securityLogger("Added new student")
securityLogger("Password changed")

// Create another logger for a different purpose
const errorLogger = new FileLogger({
  path: "./logs",
  fileName: "errors",
  rotate: "daily",
})

try {
  // Some operation that might fail
  throw new Error("Something went wrong")
} catch (error) {
  errorLogger(`Error: ${error.message}`)
}

console.log("Logging continues in the background")

