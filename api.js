/**
 * Proxy Server (n8n as source of jobs + interviews)
 * -------------------------------------------------
 * Runs on: http://localhost:3000
 *
 * Responsibilities:
 * - Fetch jobs from n8n
 * - Forward job application
 * - Handle FULL interview chat via ONE POST endpoint
 */

const express = require("express");
const fetch = require("node-fetch"); // npm i node-fetch@2
const cors = require("cors");

const app = express();
const PORT = 3000;

/* ==============================
   CONFIG
================================ */

const N8N_JOBS_ENDPOINT = "https://loveofn8n.app.n8n.cloud/webhook/get-jobs";
const N8N_APPLY_ENDPOINT = "https://YOUR-N8N-URL/webhook/apply-job";
const N8N_INTERVIEW_ENDPOINT = "https://loveofn8n.app.n8n.cloud/webhook/interview";

/* ==============================
   MIDDLEWARE
================================ */

app.use(cors());
app.use(express.json());

/* ==============================
   GET ALL JOBS
================================ */

app.get("/jobs", async (req, res) => {
  try {
    const response = await fetch(N8N_JOBS_ENDPOINT);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("GET /jobs error:", err);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

/* ==============================
   APPLY FOR JOB
================================ */

app.post("/apply", async (req, res) => {
  try {
    const { job_id, candidate_name, email } = req.body;

    if (!job_id) {
      return res.status(400).json({ error: "job_id is required" });
    }

    const response = await fetch(N8N_APPLY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_id,
        candidate_name,
        email
      })
    });

    const result = await response.json();
    res.json(result);
  } catch (err) {
    console.error("POST /apply error:", err);
    res.status(500).json({ error: "Failed to apply" });
  }
});

/* ==============================
   INTERVIEW ENDPOINT (SINGLE SOURCE)
   Frontend → POST /interview
================================ */

/**
 * Expected payload from frontend:
 * {
 *   job_id: "JOB-001",
 *   session_id: "uuid-or-generated",
 *   message: "candidate response",
 *   history: [
 *     { role: "ai", content: "question" },
 *     { role: "user", content: "answer" }
 *   ]
 * }
 *
 * n8n handles:
 * - Question generation
 * - Follow-ups
 * - Scoring
 * - Completion detection
 */

app.post("/interview", async (req, res) => {
  try {
    const { job_id, session_id, message, history } = req.body;

    if (!job_id || !session_id) {
      return res.status(400).json({ error: "job_id and session_id required" });
    }

    const response = await fetch(N8N_INTERVIEW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_id,
        session_id,
        message,
        history
      })
    });
    const aiReply = await response.json();

    /**
     * Expected response from n8n:
     * {
     *   reply: "Next interview question...",
     *   score: 68,
     *   completed: false
     * }
     */

    res.json(aiReply);
  } catch (err) {
    console.error("POST /interview error:", err);
    res.status(500).json({ error: "Interview failed" });
  }
});

/* ==============================
   HEALTH CHECK
================================ */

app.get("/", (req, res) => {
  res.send("Proxy server running");
});

/* ==============================
   START SERVER
================================ */

app.listen(PORT, () => {
  console.log(`Proxy server running at http://localhost:${PORT}`);
});
