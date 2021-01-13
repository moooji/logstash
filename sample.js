const createLogstash = require('./src')

// required
const url = process.env.LOGSTASH_URL

// optional
const tags = ['production', 'api']
const level = 'info'

// Create logger instance
const logger = createLogstash(url, tags, level)

for (let i = 0; i < 1000; i++) {
  logger.info('Hello Logger!', { data: 123 })
}
