import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import app from './app.js';
import { initDB } from './db/connection.js';

const PORT = process.env.PORT || 3001;

// Initialize database
initDB();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
