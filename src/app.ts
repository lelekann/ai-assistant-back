import express from "express";
import cors from "cors";
import shipmentRoute from "./routes/route";
import ordersRoute from "./routes/orders";
import certificatesRoute from "./routes/certificates";
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
app.use("/api/orders", ordersRoute);
app.use("/api/certificates", certificatesRoute);

export default app;