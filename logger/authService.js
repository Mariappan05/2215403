const axios = require('axios');

const getAuthToken = async () => {
    try {
        const response = await axios.post('http://20.244.56.144/evaluation-service/auth', {
            email: "2215403@nec.edu.in",
            name: "mariappan r",
            rollNo: "2215403",
            accessCode: "xsZTTn",
            clientID: "68ed252e-d0e0-4b8c-947b-63a72655f578",
            clientSecret: "FqpQnDPxqnjdtNCB"
        });
        return response.data.token;
    } catch (error) {
        console.error('Auth Error:', error);
        throw error;
    }
};

module.exports = { getAuthToken };