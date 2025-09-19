import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();


const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static("public"))

// Replace with your OpenRouter API key
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Generate a story paragraph
app.post("/api/story", async (req, res) => {
  const { choice } = req.body;

  // const prompt = choice
  //   ? `Continue the dark fantasy adventure. The player chose: ${choice}. Write one short paragraph (10-20 words).`
  //   : "Start a dark fantasy DnD-style adventure.Make sure the story is creative and attention grabbing, Also try to use easy and simple words. Write one short paragraph (10-20 words).";

  const prompt = choice
    ? `The player chose: ${choice}. Write one short paragraph (10-20 words).`
    : "Start a fun and simple children’s adventure story. Use short and clear sentences. Make it playful and easy to read. Write one short paragraph (10-20 words).";


  
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "mistralai/devstral-small-2505:free",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 200
      })
    });

    const data = await response.json();
    console.log(data);
    const output = data.choices?.[0];
    const text =
      output?.message?.content || // Chat-style models
      output?.text ||             // Text-style models
      "My friend and I walked into the school at night with a small flashlight";
    // const text = data.paragraph || "story api didnt gave the story";
    // console.log(text);

    res.json({ paragraph: text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch story." });
  }
});

// Generate choices
app.post("/api/choices", async (req, res) => {
  const { lastParagraph } = req.body;

//   const prompt = `Based on this paragraph:\n"${lastParagraph}"\nGenerate exactly 2 dark fantasy story choices.
// Each choice must be one line only, between 10 and 15 words. Also try to use easy and simple words.
// Do not add numbering, extra text, or explanations. Just output the two choices as separate lines.`;




  const prompt = `Based on this paragraph:\n"${lastParagraph}"\nGenerate exactly 2 simple story choices for children.
  Each choice must be one line only, between 10 and 15 words.
  Use easy and clear words only.
  Do not add numbering, extra text, or explanations.
  Do not use commas, quotation marks, question marks, exclamation marks, or other special characters.
  Just output the two choices as separate lines.`;



  

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "mistralai/devstral-small-2505:free",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 100
      })
    });

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";
    const options = raw.split("\n").filter(l => l.trim()).slice(0, 2);

    res.json({ choices: options });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch choices." });
  }
});


app.get('/', (req, res) => {
  res.redirect('/home.html');
})

app.listen(3000, () => console.log("✅ Server running on http://localhost:3000"));
