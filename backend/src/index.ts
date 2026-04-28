import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

import healthRouter from './routes/health.js';
import vehicleRouter from './routes/vehicle.js';
import inspectionRouter from './routes/inspection.js';

const app = express();
const port = Number(process.env.PORT || 5050);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use(healthRouter);
app.use(vehicleRouter);
app.use(inspectionRouter);

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
