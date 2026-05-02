const express = require("express");
const multer = require("multer");
const axios = require("axios");

const app = express();
const upload = multer();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const OWNER = "BerMatCode";
const REPO = "BerMatCode-WEB";
const BRANCH = "main";

// 📂 Ruta donde se guardarán los HTML
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

    // 📦 Guardar metadata (tipo base de datos simple)
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

      // actualizar archivo
      await axios.put(
        `https://api.github.com/repos/${OWNER}/${REPO}/contents/${dataPath}`,
        {
          message: "Actualizar proyectos",
          content: Buffer.from(
            JSON.stringify([
              ...proyectos,
              { titulo, descripcion, imagen, url: rawUrl },
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
      // crear archivo si no existe
      await axios.put(
        `https://api.github.com/repos/${OWNER}/${REPO}/contents/${dataPath}`,
        {
          message: "Crear base de datos proyectos",
          content: Buffer.from(
            JSON.stringify([
              { titulo, descripcion, imagen, url: rawUrl },
            ])
          ).toString("base64"),
          branch: BRANCH,
        },
        {
          headers: { Authorization: `token ${GITHUB_TOKEN}` },
        }
      );
    }

    res.json({
      ok: true,
      url: rawUrl,
    });

  } catch (error) {
    res.status(500).json({
      error: error.response?.data || error.message,
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
    const proyectos = JSON.parse(decoded);

    res.json(proyectos);

  } catch (e) {
    res.json([]);
  }
});

// 🚀 Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto " + PORT);
});
