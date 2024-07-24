const dotenv = require('dotenv');
dotenv.config();

exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ apiKey: process.env.API_KEY })
  };
};
