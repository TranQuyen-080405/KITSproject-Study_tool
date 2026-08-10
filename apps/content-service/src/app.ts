// This file configures the Express application for the Content Service.
import express from "express";
import { router } from "./routes/index.js";

export const app = express();

app.use(express.json());
app.use(router);
