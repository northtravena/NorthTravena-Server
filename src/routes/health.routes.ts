import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ success: true, message: "North Travena API", uptime: process.uptime() });
});

export default router;
