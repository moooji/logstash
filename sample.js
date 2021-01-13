const createLogstash = require('./src')

// required
const url = 'https://dsr-logsss.touchtech.com'

// optional
const tags = ['production', 'api']
const level = 'info'

// Create logger instance
const logger = createLogstash(url, tags, level)

for (let i = 0; i < 10; i++) {
  logger.info('new!', { data: 123 })
}
