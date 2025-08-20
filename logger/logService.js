const axios = require('axios');

const MAX_MESSAGE_LENGTH = 48;

const sendLog = async (token, level, packageName, message) => {
    try {
        const truncatedMessage = message.substring(0, MAX_MESSAGE_LENGTH);
        
        console.log('Sending log:', {
            level,
            package: packageName,
            message: truncatedMessage
        });

        const response = await axios.post('http://20.244.56.144/evaluation-service/logs', 
            {
                stack: "backend",
                level: level,
                package: packageName,
                message: truncatedMessage
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('Log response:', response.status, response.data);
        return response.data;
    } catch (error) {
        console.error('Log Error Details:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
        });
        throw error;
    }
};

module.exports = { sendLog };