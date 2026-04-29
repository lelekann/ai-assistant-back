import express from "express";
import shipmentRoute from "./routes/route";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());

app.use("/api/shipment", shipmentRoute);

export default app;