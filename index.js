import express from "express";
import axios from "axios";
import "dotenv/config";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

async function sendWhatsApp(to, text) {
  await axios.post(
    `https://graph.facebook.com/v19.0/${process.env.WA_PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      text: { body: text }
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.WA_TOKEN}`,
        "Content-Type": "application/json"
      }
    }
  );
}

async function askGPT(message) {
  const r = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "أنت بوت خدمة عملاء لمؤسسة تتبع تبوك للأنظمة الأمنية. رد باللهجة السعودية وباختصار."
        },
        { role: "user", content: message }
      ]
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      }
    }
  );

  return r.data.choices[0].message.content;
}

app.post("/webhook", async (req, res) => {
  res.sendStatus(200);
  const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!msg?.text?.body) return;

  const reply = await askGPT(msg.text.body);
  await sendWhatsApp(msg.from, reply);
});

app.listen(PORT, () => console.log("Bot running on port", PORT));
