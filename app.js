const express = require("express");
const twilio = require("twilio");
require("dotenv").config();

const app = express();
app.use(express.json());

const client = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Health check
app.get("/", (req, res) => {
  res.send("Twilio server running");
});

// STEP 1: transfer existing call to conference
app.post("/transfer", async (req, res) => {
  try {
    const { callSid } = req.body;
    console.log("Received callSid:", callSid);
    if (!callSid) {
      return res.status(400).json({ error: "callSid missing" });
    }

    await client.calls(callSid).update({
      url: `${process.env.BASE_URL}/conference`,
      method: "POST",
    });

    res.json({ status: "Transferring to live agent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Transfer failed" });
  }
});

// STEP 2: conference TwiML
app.post("/conference", (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();

  twiml.dial().conference(
    {
      startConferenceOnEnter: true,
      endConferenceOnExit: false,
    },
    "support-room"
  );

  res.type("text/xml");
  res.send(twiml.toString());
});

// STEP 3: call agent into conference
app.post("/call-agent", async (req, res) => {
  try {
    await client.calls.create({
      to: process.env.AGENT_MOBILE,
      from: process.env.TWILIO_NUMBER,
      url: `${process.env.BASE_URL}/conference`,
    });

    res.json({ status: "Agent called" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Agent call failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
