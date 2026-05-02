const express = require("express");
const multer = require("multer");
const axios = require("axios");

const app = express();
const upload = multer();

// 🔐 Token desde Render (NO lo pongas aquí)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// 👇 CAMBIA ESTO POR TUS DATOS
const OWNER = "BerMatCode";
const REPO = "BerMatCode-WEB";

app.get("/", (req, res) => {
  res.send("Servidor funcionando 🚀");
});

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No se subió ningún archivo" });
    }

    const content = file.buffer.toString("base64");
    const path = `uploads/${Date.now()}-${file.originalname}`;

    await axios.put(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`,
      {
        message: "Subida automática desde Render",
        content: content,
      },
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
        },
      }
    );

    const url = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/${path}`;

    res.json({
      ok: true,
      url: url,
    });

  } catch (error) {
    res.status(500).json({
      error: error.response?.data || error.message,
    });
  }
});

// ⚠️ IMPORTANTE para Render
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto " + PORT);
});
