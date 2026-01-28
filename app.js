const express = require("express");
const twilio = require("twilio");
require("dotenv").config();

const app = express();
app.use(express.json());

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Health check
app.get("/", (req, res) => {
  res.send("Twilio conference server running");
});

app.post("/transfer", async (req, res) => {
  try {
    const { callSid } = req.body;

    if (!callSid) {
      return res.status(400).send({ error: "callSid missing" });
    }

    // 1️⃣ Create conference
    const conference = await client.conferences.create({
      friendlyName: `millis-support-${Date.now()}`
    });

    // 2️⃣ Add USER (existing call)
    await client.conferences(conference.sid)
      .participants
      .create({
        callSid: callSid,
        endConferenceOnExit: true
      });

    // 3️⃣ Add AGENT
    await client.conferences(conference.sid)
      .participants
      .create({
        from: process.env.TWILIO_NUMBER,
        to: process.env.AGENT_MOBILE,
        earlyMedia: true
      });

    console.log("Conference started:", conference.sid);

    res.send({
      status: "connected",
      conferenceSid: conference.sid
    });

  } catch (err) {
    console.error("Transfer error:", err);
    res.status(500).send({ error: "Transfer failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
