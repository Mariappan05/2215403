const { getAuthToken } = require('./authService');
const { sendLog } = require('./logService');

const validLevels = ['debug', 'info', 'warn', 'error', 'fatal'];
const validPackages = ['cache', 'controller', 'cron_job', 'db', 'domain', 
                      'handler', 'repository', 'route', 'service'];

class Logger {
    static async log(level, package, message) {
        try {
            if (!validLevels.includes(level)) {
                throw new Error('Invalid log level');
            }
            if (!validPackages.includes(package)) {
                throw new Error('Invalid package name');
            }

            const token = await getAuthToken();
            await sendLog(token, level, package, message);
        } catch (error) {
            console.error('Logging failed:', error);
            throw error;
        }
    }
}

module.exports = Logger;