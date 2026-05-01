const cloudinary = require('cloudinary').v2;
const logger = require('./logger');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const streamifier = require('streamifier');

/**
 * Utility function to wrap promises with an exponential backoff retry mechanism.
 * Retries only on network/server errors (not 400s).
 * @param {Function} asyncFn - The async function to execute.
 * @param {number} retries - Maximum number of retries (default 2).
 * @param {number} delay - Initial delay in ms (default 500).
 */
const withRetry = async (asyncFn, retries = 2, delay = 500) => {
  try {
    return await asyncFn();
  } catch (error) {
    // Only retry on 5xx errors or network failures (e.g., ETIMEDOUT). Do not retry on 4xx (bad request).
    const isClientError = error.http_code && error.http_code >= 400 && error.http_code < 500;
    
    if (retries > 0 && !isClientError) {
      logger.warn(`Cloudinary operation failed. Retrying in ${delay}ms...`, { error: error.message });
      await new Promise(res => setTimeout(res, delay));
      return withRetry(asyncFn, retries - 1, delay * 2); // Exponential backoff
    }
    
    throw error;
  }
};

/**
 * Upload buffer to Cloudinary with timeout
 */
const uploadToCloudinary = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Cloudinary upload timeout'));
    }, 15000);

    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      clearTimeout(timeout);
      if (error) return reject(error);
      resolve(result);
    });

    streamifier.createReadStream(buffer).pipe(stream);
  });
};

module.exports = {
  cloudinary,
  withRetry,
  uploadToCloudinary
};
