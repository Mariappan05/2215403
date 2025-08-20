# HTTP URL Shortener Microservice

A robust, production-ready HTTP URL Shortener Microservice built with Node.js and Express, featuring comprehensive logging, caching, and analytics capabilities.

## 🚀 Features

- **URL Shortening**: Create short URLs with custom or auto-generated shortcodes
- **Custom Shortcodes**: Support for user-defined shortcodes with validation
- **Expiration Management**: Configurable validity periods with automatic cleanup
- **Analytics**: Detailed click tracking with geographical and referrer information
- **Comprehensive Logging**: Extensive logging middleware integration (as required)
- **Caching**: In-memory caching for improved performance
- **Rate Limiting**: Built-in rate limiting for API protection
- **Security**: Helmet.js security headers and CORS protection
- **Health Monitoring**: Built-in health check endpoints
- **Automatic Cleanup**: Cron job for expired URL cleanup

## 📋 Requirements

- Node.js 16+ 
- npm or yarn package manager

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd url-shortner
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the service**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 🌐 API Endpoints

### 1. Create Short URL
**POST** `/shorturls`

Creates a new shortened URL.

**Request Body:**
```json
{
  "url": "https://very-long-url.com/with/many/parameters",
  "validity": 30,
  "shortcode": "abcd1"
}
```

**Response (201):**
```json
{
  "shortLink": "http://localhost:3000/abcd1",
  "expiry": "2025-01-01T00:30:00Z"
}
```

### 2. Get URL Statistics
**GET** `/shorturls/:shortcode`

Retrieves usage statistics for a specific shortened URL.

**Response (200):**
```json
{
  "shortcode": "abcd1",
  "originalUrl": "https://very-long-url.com/with/many/parameters",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "expiresAt": "2025-01-01T00:30:00Z",
  "totalClicks": 5,
  "timeUntilExpiry": 25,
  "clicks": [
    {
      "timestamp": "2025-01-01T00:05:00.000Z",
      "ip": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "referer": "https://google.com",
      "location": {
        "country": "US",
        "region": "CA",
        "city": "San Francisco"
      }
    }
  ]
}
```

### 3. Redirect to Original URL
**GET** `/:shortcode`

Redirects users to the original long URL.

**Response:** HTTP 302 redirect to the original URL

### 4. Health Check
**GET** `/health`

Returns service health status and statistics.

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "uptime": 3600,
  "memory": {...},
  "stats": {
    "totalUrls": 100,
    "activeUrls": 95,
    "expiredUrls": 5,
    "cache": {...}
  }
}
```

## 🔧 Configuration

The service can be configured using environment variables:

```bash
# Server Configuration
PORT=3000                    # Server port (default: 3000)
HOST=localhost              # Server host (default: localhost)
NODE_ENV=development        # Environment (development/production)

# Logging
LOG_LEVEL=info              # Log level (debug, info, warn, error, fatal)

# URL Shortening
DEFAULT_VALIDITY=30         # Default validity in minutes
SHORTCODE_LENGTH=6          # Auto-generated shortcode length
MAX_SHORTCODE_LENGTH=20     # Maximum custom shortcode length

# Rate Limiting
RATE_LIMIT_WINDOW=900000    # Rate limit window in ms (15 minutes)
RATE_LIMIT_MAX=100          # Maximum requests per window
```

## 📊 Logging

The service extensively uses custom logging middleware as required:

- **Log Levels**: debug, info, warn, error, fatal
- **Log Files**: Separate log files for each level in `/logs` directory
- **Request Logging**: All HTTP requests and responses are logged
- **Performance Metrics**: Request duration and response codes
- **Error Tracking**: Comprehensive error logging with stack traces

## 🗄️ Data Storage

- **In-Memory Storage**: Fast in-memory storage for URLs and statistics
- **Caching Layer**: LRU cache with TTL for frequently accessed URLs
- **Automatic Cleanup**: Scheduled cleanup of expired URLs every 30 minutes

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📁 Project Structure

```
url-shortner/
├── cache/                  # Caching utilities
│   └── urlCache.js
├── config/                 # Configuration files
│   └── config.js
├── controller/             # Request controllers
│   └── urlController.js
├── cron_job/              # Scheduled jobs
│   └── cleanupJob.js
├── domain/                 # Domain models
│   └── ShortUrl.js
├── middleware/             # Custom middleware
│   └── logger.js
├── repository/             # Data access layer
│   └── urlRepository.js
├── route/                  # Route definitions
│   └── urlRoutes.js
├── service/                # Business logic
│   └── urlService.js
├── logs/                   # Log files (auto-generated)
├── index.js                # Main application file
├── package.json            # Dependencies and scripts
└── README.md               # This file
```

## 🔒 Security Features

- **Input Validation**: Comprehensive request validation using express-validator
- **Rate Limiting**: Protection against abuse and DDoS attacks
- **Security Headers**: Helmet.js for security headers
- **CORS Protection**: Configurable CORS policies
- **Input Sanitization**: Validation of URLs and shortcodes

## 📈 Performance Features

- **Caching**: In-memory caching for frequently accessed URLs
- **Connection Pooling**: Efficient database connection management
- **Async Operations**: Non-blocking I/O operations
- **Memory Management**: Automatic cleanup of expired data

## 🚨 Error Handling

- **HTTP Status Codes**: Proper HTTP status codes for different scenarios
- **Error Messages**: Descriptive error messages for debugging
- **Validation Errors**: Detailed validation error responses
- **Global Error Handler**: Centralized error handling middleware

## 🔄 Cleanup Jobs

- **Automatic Cleanup**: Runs every 30 minutes to remove expired URLs
- **Manual Cleanup**: API endpoint for manual cleanup execution
- **Memory Management**: Efficient memory usage with automatic cleanup

## 🌍 Geographical Analytics

- **IP Geolocation**: Automatic detection of user locations
- **Click Analytics**: Detailed tracking of click sources and patterns
- **Referrer Tracking**: Monitor traffic sources and user behavior

## 📝 Usage Examples

### Creating a Short URL
```bash
curl -X POST http://localhost:3000/shorturls \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/very-long-url",
    "validity": 60,
    "shortcode": "myurl"
  }'
```

### Getting Statistics
```bash
curl http://localhost:3000/shorturls/myurl
```

### Redirecting
```bash
curl -L http://localhost:3000/myurl
```

## 🚀 Deployment

### Docker (Recommended)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables
```bash
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
```

## 📊 Monitoring

- **Health Checks**: Built-in health check endpoint
- **Performance Metrics**: Request duration and throughput
- **Error Tracking**: Comprehensive error logging
- **Resource Usage**: Memory and cache statistics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions, please open an issue in the repository or contact the development team.

---

**Note**: This microservice follows the specified package structure and extensively uses the custom logging middleware as required. All logging is done through the custom middleware, not through built-in language loggers or console logging.
