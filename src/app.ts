import express from "express";
import shipmentRoute from "./routes/route";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

app.use("/api/shipment", shipmentRoute);

export default app;