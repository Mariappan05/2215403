const axios = require('axios');

const sendLog = async (token, level, package, message) => {
    try {
        const response = await axios.post('http://20.244.56.144/evaluation-service/logs', 
            {
                stack: "backend",
                level: level,
                package: package,
                message: message
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('Log sending error:', error);
        throw error;
    }
};

module.exports = { sendLog };