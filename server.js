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

    // 📂 rutas
    const htmlPath = generarRuta(htmlFile.originalname);
    const imgPath = `img/${Date.now()}-${imgFile.originalname}`;

    const htmlContent = htmlFile.buffer.toString("base64");
    const imgContent = imgFile.buffer.toString("base64");

    // 📄 subir HTML
    await axios.put(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${htmlPath}`,
      {
        message: "Subida HTML",
        content: htmlContent,
        branch: BRANCH,
      },
      {
        headers: { Authorization: `token ${GITHUB_TOKEN}` },
      }
    );

    // 🖼️ subir imagen
    await axios.put(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${imgPath}`,
      {
        message: "Subida imagen",
        content: imgContent,
        branch: BRANCH,
      },
      {
        headers: { Authorization: `token ${GITHUB_TOKEN}` },
      }
    );

    const htmlUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${htmlPath}`;
    const imgUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${imgPath}`;

    // 📦 guardar metadata
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
      // no existe, se crea luego
    }

    const nuevo = {
      titulo,
      descripcion,
      imagen: imgUrl,
      url: htmlUrl,
      fecha: Date.now()
    };

    const nuevoContenido = Buffer.from(
      JSON.stringify([...proyectos, nuevo], null, 2)
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
        headers: { Authorization: `token ${GITHUB_TOKEN}` },
      }
    );

    res.json({
      ok: true,
      url: htmlUrl,
      img: imgUrl
    });

  } catch (error) {
    console.log("ERROR REAL:", error.response?.data || error.message);

    res.status(500).json({
      error: error.response?.data || error.message,
    });
  }
});
