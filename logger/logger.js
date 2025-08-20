const { getAuthToken } = require('./authService');
const { sendLog } = require('./logService');

const validLevels = ['debug', 'info', 'warn', 'error', 'fatal'];
const validPackages = ['cache', 'controller', 'cron_job', 'db', 'domain', 
                      'handler', 'repository', 'route', 'service'];

class Logger {
    static async log(level, packageName, message) {
        try {
            if (!validLevels.includes(level)) {
                throw new Error('Invalid log level');
            }
            if (!validPackages.includes(packageName)) {
                throw new Error('Invalid package name');
            }

            const token = await getAuthToken();
            await sendLog(token, level, packageName, message);
        } catch (error) {
            console.error('Logging failed:', error.message);
            // Don't throw here - we don't want logging failures to crash the app
        }
    }
}

module.exports = Logger;