# EcoLoop Kenya Backend

MongoDB Atlas backend API for EcoLoop Kenya e-commerce platform.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment file:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` with your MongoDB Atlas connection string:
   ```
   MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/ecoloop?retryWrites=true&w=majority
   PORT=3000
   ```

4. Start the server:
   ```bash
   npm start
   ```

## API Endpoints

- `GET /api/test` - Test MongoDB connection
- `POST /api/save` - Save data to windsurfdata collection
- `GET /api/data` - Get all data from windsurfdata collection

## Dependencies

- express - Web framework
- mongodb - MongoDB driver
- cors - Cross-origin resource sharing
- dotenv - Environment variable management
