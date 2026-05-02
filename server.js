const express = require("express");
const multer = require("multer");
const axios = require("axios");
const cors = require("cors");

const app = express();
const upload = multer();

app.use(cors()); // ✅ PERMITE CONEXIÓN DESDE TU HTML

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const OWNER = "BerMatCode";
const REPO = "BerMatCode-WEB";
const BRANCH = "main";

// 📂 Ruta automática por fecha
function generarRuta(nombreArchivo) {
  const fecha = new Date();
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");

  return `${año}/${mes}/${Date.now()}-${nombreArchivo}`;
}

// 🌐 Inicio
app.get("/", (req, res) => {
  res.send("Servidor funcionando BerMatCode 🚀");
});

// 📤 SUBIR HTML
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const { titulo, descripcion, imagen } = req.body;

    if (!file) {
      return res.status(400).json({ error: "No se subió archivo" });
    }

    if (!GITHUB_TOKEN) {
      return res.status(500).json({ error: "Falta GITHUB_TOKEN en Render" });
    }

    const path = generarRuta(file.originalname);
    const content = file.buffer.toString("base64");

    // 📄 Subir HTML
    await axios.put(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`,
      {
        message: "Subida automática HTML",
        content: content,
        branch: BRANCH,
      },
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
        },
      }
    );

    const rawUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${path}`;

    // 📦 Guardar metadata
    const dataPath = "data/proyectos.json";
    let proyectos = [];

    try {
      const existing = await axios.get(
        `https://api.github.com/repos/${OWNER}/${REPO}/contents/${dataPath}`,
        {
          headers: { Authorization: `token ${GITHUB_TOKEN}` },
        }
      );

      const decoded = Buffer.from(existing.data.content, "base64").toString();
      proyectos = JSON.parse(decoded);

      await axios.put(
        `https://api.github.com/repos/${OWNER}/${REPO}/contents/${dataPath}`,
        {
          message: "Actualizar proyectos",
          content: Buffer.from(
            JSON.stringify([
              ...proyectos,
              { titulo, descripcion, imagen, url: rawUrl }
            ])
          ).toString("base64"),
          sha: existing.data.sha,
          branch: BRANCH,
        },
        {
          headers: { Authorization: `token ${GITHUB_TOKEN}` },
        }
      );

    } catch {
      await axios.put(
        `https://api.github.com/repos/${OWNER}/${REPO}/contents/${dataPath}`,
        {
          message: "Crear proyectos",
          content: Buffer.from(
            JSON.stringify([
              { titulo, descripcion, imagen, url: rawUrl }
            ])
          ).toString("base64"),
          branch: BRANCH,
        },
        {
          headers: { Authorization: `token ${GITHUB_TOKEN}` },
        }
      );
    }

    res.json({ ok: true, url: rawUrl });

  } catch (error) {
    console.error("ERROR:", error.response?.data || error.message);

    res.status(500).json({
      error: "Error subiendo archivo",
      detalle: error.response?.data || error.message
    });
  }
});

// 📥 OBTENER PROYECTOS
app.get("/proyectos", async (req, res) => {
  try {
    const dataPath = "data/proyectos.json";

    const response = await axios.get(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${dataPath}`,
      {
        headers: { Authorization: `token ${GITHUB_TOKEN}` },
      }
    );

    const decoded = Buffer.from(response.data.content, "base64").toString();
    res.json(JSON.parse(decoded));

  } catch {
    res.json([]);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto " + PORT);
});
