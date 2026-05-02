
const express = require("express");
const multer = require("multer");
const axios = require("axios");

const app = express();
const upload = multer();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const OWNER = "BerMatCode";
const REPO = "BerMatCode-WEB";
const BRANCH = "main";

// 🌐 Inicio
app.get("/", (req, res) => {
  res.send("Servidor funcionando BerMatCode 🚀");
});

// 📤 SUBIR HTML + IMG + DATOS
app.post("/upload", upload.fields([
  { name: "html", maxCount: 1 },
  { name: "img", maxCount: 1 }
]), async (req, res) => {

  try {
    const htmlFile = req.files["html"]?.[0];
    const imgFile = req.files["img"]?.[0];

    const { titulo, descripcion } = req.body;

    if (!htmlFile || !imgFile) {
      return res.status(400).json({ error: "Faltan archivos" });
    }

    // 📂 RUTAS FIJAS (2026/01)
    const htmlPath = `2026/01/${Date.now()}-${htmlFile.originalname}`;
    const imgPath = `2026/01/img/${Date.now()}-${imgFile.originalname}`;

    const htmlContent = htmlFile.buffer.toString("base64");
    const imgContent = imgFile.buffer.toString("base64");

    // 📄 Subir HTML
    await axios.put(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${htmlPath}`,
      {
        message: "Subida HTML",
        content: htmlContent,
        branch: BRANCH,
      },
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
        },
      }
    );

    // 🖼️ Subir imagen
    await axios.put(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${imgPath}`,
      {
        message: "Subida imagen",
        content: imgContent,
        branch: BRANCH,
      },
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
        },
      }
    );

    const htmlUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${htmlPath}`;
    const imgUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${imgPath}`;

    // 📦 BASE DE DATOS (JSON)
    const dataPath = "data/proyectos.json";

    let proyectos = [];
    let sha = null;

    try {
      const existing = await axios.get(
        `https://api.github.com/repos/${OWNER}/${REPO}/contents/${dataPath}`,
        {
          headers: { Authorization: `token ${GITHUB_TOKEN}` },
        }
      );

      const decoded = Buffer.from(existing.data.content, "base64").toString();
      proyectos = JSON.parse(decoded);
      sha = existing.data.sha;

    } catch (e) {
      // Si no existe, se crea abajo
    }

    const nuevoProyecto = {
      titulo,
      descripcion,
      imagen: imgUrl,
      url: htmlUrl,
      fecha: Date.now()
    };

    const nuevoContenido = Buffer.from(
      JSON.stringify([...proyectos, nuevoProyecto], null, 2)
    ).toString("base64");

    await axios.put(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${dataPath}`,
      {
        message: "Actualizar proyectos",
        content: nuevoContenido,
        sha: sha || undefined,
        branch: BRANCH,
      },
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
        },
      }
    );

    res.json({
      ok: true,
      url: htmlUrl,
      imagen: imgUrl
    });

  } catch (error) {
    console.log("ERROR REAL:", error.response?.data || error.message);

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
