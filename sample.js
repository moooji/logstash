const createLogstash = require('./src')

// required
const url = process.env.LOGSTASH_URL

// optional
const tags = ['production', 'api']
const level = 'info'

// Create logger instance
const logger = createLogstash(url, tags, level)

for (let i = 0; i < 2; i++) {
  logger.fatal(new Error("Test!"), { data: 123 })
}
