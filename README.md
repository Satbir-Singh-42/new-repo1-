# SolarSense: Intelligent Energy Solutions for a Sustainable Future

**Decentralized. Resilient. Equitable.**

SolarSense is an AI-powered decentralized energy trading platform that connects households with solar panels into a smart grid network. It intelligently manages energy flow, prevents grid overload, and ensures fair distribution—keeping the lights on even in challenging conditions.

![SolarSense](https://img.shields.io/badge/Energy-Trading-green)
![AI-Powered](https://img.shields.io/badge/AI-Powered-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![Express](https://img.shields.io/badge/Express.js-404D59?logo=express)
![Google AI](https://img.shields.io/badge/Google_AI-Gemini-orange)

## 🏠 Problem Statement

Energy grids are struggling with:
- Peak loads and unpredictable demand
- Unequal access to power
- Grid failures during outages and extreme weather
- Inefficient energy distribution systems

## ⚡ Our Solution

SolarSense creates a decentralized energy trading network where:
- Households with solar panels share excess energy
- AI automatically matches energy suppliers with demanders
- Community resilience is maintained during grid outages
- Fair pricing through intelligent market mechanisms

## 🚀 Key Features

### 1. Machine Learning Engine
- **Predictive Energy Generation**: ML algorithms predict solar output based on weather patterns
- **Demand Forecasting**: Advanced algorithms predict energy demand using time-of-day and household patterns
- **Intelligent Trading**: Automated matching of energy suppliers and demanders based on proximity and capacity
- **Battery Optimization**: ML-driven charge/discharge strategies for maximum grid stability

### 2. Live Demonstration Platform
- **Real-time Simulation**: Updates every 10 seconds with live energy trading operations
- **Weather Adaptation**: Interactive weather controls (sunny → cloudy → rainy → stormy) show immediate impact
- **Outage Simulation**: Power outage testing with automatic resilience scoring and recovery planning
- **ML Optimization Dashboard**: Real-time display of trading pairs, grid stability, and AI recommendations

### 3. Energy Trading Marketplace
- **Create Trade Offers**: Post buy/sell orders for energy
- **Live Marketplace**: Browse available energy offers and requests
- **Automatic Matching**: AI pairs compatible trades instantly
- **Real-time Updates**: Data refreshes every 10 seconds
- **Fair Pricing**: Market-based pricing around ₹4.50/kWh

### 4. Advanced Analytics
- **Network Monitoring**: Real-time tracking of households, generation capacity, and storage utilization
- **Trading Analytics**: Energy trade volumes, pricing, and carbon savings tracking
- **Efficiency Metrics**: Network efficiency, average trade distance, and optimization performance
- **Resilience Scoring**: Community response to grid outages

## 🛠 Technology Stack

### Frontend
- **React 18** with Vite build system
- **TypeScript** for type safety
- **Tailwind CSS** for responsive styling
- **shadcn/ui** components for consistent UI
- **Wouter** for client-side routing
- **TanStack Query** for data fetching and caching
- **React Hook Form** with Zod validation
- **Framer Motion** for animations

### Backend
- **Express.js** server with TypeScript
- **PostgreSQL** with Drizzle ORM
- **Passport.js** for authentication
- **bcryptjs** for password hashing
- **Express Sessions** with secure storage
- **CORS** configuration for security
- **Memory storage fallback** for development

### AI & ML
- **Google Generative AI** for chat assistance
- **Custom ML algorithms** for energy prediction
- **Weather-based forecasting** for solar generation
- **Demand prediction** using time-of-day patterns
- **Battery optimization strategies**

## Architecture

### Client-Server Separation
- **Frontend**: React SPA with Vite dev server
- **Backend**: Express.js API server with REST endpoints
- **Database**: PostgreSQL with Drizzle ORM
- **AI Integration**: Google Gemini AI for image analysis and chat

### Security Features
- **Password Hashing**: bcrypt for secure password storage
- **Session Management**: Express-session with PostgreSQL store
- **Input Validation**: Zod schemas for request validation
- **File Upload Security**: Multer with size and type restrictions
- **CORS Protection**: Configured for secure cross-origin requests

### Database Design
- **Users Table**: User authentication and profile data
- **Analyses Table**: Solar panel analysis results with user association
- **Chat Messages Table**: AI chat history with user and session tracking
- **Session Storage**: Secure session management with PostgreSQL backend

## Getting Started

### Prerequisites
- Node.js 20+ installed
- PostgreSQL database (optional - memory storage available)
- Environment variables configured

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd solarscope-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   NODE_ENV=development
   DATABASE_URL=postgresql://username:password@host:port/database
   GOOGLE_API_KEY=your_google_gemini_api_key
   ```

4. **Database Setup**
   ```bash
   npm run db:push
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`

### API Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/user` - Get current user info

#### Analysis
- `POST /api/validate-image` - Validate image content
- `POST /api/analyze/installation` - Analyze rooftop for installation planning
- `POST /api/analyze/fault-detection` - Detect faults in solar panels
- `GET /api/analyses` - Get user's analysis history
- `GET /api/analyses/session` - Get session-based analyses

#### AI Chat
- `POST /api/ai/chat` - Send message to AI assistant
- `GET /api/chat/messages` - Get chat history
- `POST /api/chat/clear` - Clear chat history

#### System
- `GET /api/health` - System health check
- `POST /api/clear-users` - Clear user data (development only)

## Project Structure

```
solarscope-ai/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── lib/           # Utilities and helpers
│   │   ├── hooks/         # Custom React hooks
│   │   └── pages/         # Page components
├── server/                 # Backend Express application
│   ├── ai-service.ts      # Google Gemini AI integration
│   ├── auth.ts            # Authentication setup
│   ├── routes.ts          # API route definitions
│   ├── storage.ts         # Database operations
│   └── index.ts           # Server entry point
├── shared/                 # Shared type definitions
│   └── schema.ts          # Database schema and types
├── package.json           # Project dependencies
├── drizzle.config.ts      # Database configuration
├── vite.config.ts         # Vite build configuration
└── tailwind.config.ts     # Tailwind CSS configuration
```

## Configuration

### Database Configuration
The application uses PostgreSQL with Drizzle ORM. Configure your database connection in the `.env` file:

```env
DATABASE_URL=postgresql://username:password@host:port/database
```

### AI Configuration
Get your Google Gemini API key from [Google AI Studio](https://aistudio.google.com/) and add it to your `.env` file:

```env
GOOGLE_API_KEY=your_api_key_here
```

### Development vs Production
- **Development**: Uses memory storage fallback if database is unavailable
- **Production**: Requires PostgreSQL database for data persistence


### 🚀 Deployment

You can deploy SolarScope AI easily using [Render](https://render.com) or any cloud platform that supports Node.js and PostgreSQL.
- **Build Command**: npm install && npm run build
- **Pre-Deploy Command**: npm run db:push
- **Start Command**: node start-production.js


## Performance Optimization

### Image Processing
- **Compression**: Automatic image compression (1200px max width, 80% quality)
- **Storage**: Efficient sessionStorage usage with cleanup routines
- **Caching**: React Query caching for API responses

### Database Optimization
- **Connection Pooling**: PostgreSQL connection pool management
- **Query Optimization**: Efficient Drizzle ORM queries
- **Session Management**: PostgreSQL session store for scalability

### AI Service Optimization
- **Rate Limiting**: Intelligent request throttling
- **Error Handling**: Robust error recovery and retry logic
- **Response Caching**: Strategic caching for repeated requests

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -m 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Check the documentation above
- Review the code comments for implementation details
- Ensure all environment variables are properly configured
- Verify your Google Gemini API key is valid and has sufficient quota

## Technical Details

### AI Integration
- **Google Gemini 2.0 Flash**: Latest AI model for image analysis
- **Content Validation**: AI-powered image classification
- **Structured Responses**: JSON-formatted AI responses for consistency

### Security Measures
- **Password Hashing**: bcrypt with salt rounds
- **Session Security**: Secure session cookies with PostgreSQL store
- **Input Validation**: Comprehensive request validation with Zod
- **File Upload Security**: Size limits and MIME type validation

### Performance Metrics
- **Build Time**: ~2 seconds for frontend, ~35ms for backend
- **Bundle Size**: Optimized with code splitting and tree shaking
- **API Response**: Average 2-4 seconds for AI analysis
- **Database**: Sub-100ms query response times

---

Built with ❤️ for the solar energy industry
