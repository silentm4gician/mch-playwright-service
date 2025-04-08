
# 🎥 Watch Scraper API (Playwright)

Este microservicio expone una API para obtener el **enlace directo al video** de un episodio de anime a partir de una URL de visualización de [monoschino2.com](https://monoschino2.com/), usando Playwright para resolver redirecciones, iframes, y contenido dinámico.

## 🚀 Endpoint

### `GET /api/watch`

#### 📌 Parámetros de query

| Parámetro | Tipo   | Descripción                                  | Requerido |
|-----------|--------|----------------------------------------------|-----------|
| `url`     | string | URL completa de la página `/ver/...` de Monoschino | ✅ Sí      |

---

### ✅ Ejemplo de Request

```
GET http://localhost:3001/api/watch?url=https://monoschino2.com/ver/aharen-san-wa-hakarenai-season-2-1
```

---

### 📦 Ejemplo de Response

```json
{
  "video": {
    "videoUrl": "https://cdn-lfs-us-1.hf.co/repos/...",
    "iframe": {
      "raw": "https://apu.animemovil2.com/embed2/?id=https://re.ironhentai.com/...",
      "clean": "https://re.ironhentai.com/..."
    }
  }
}
```

---

### 📄 Descripción de la respuesta

| Campo                 | Tipo   | Descripción                                                                 |
|----------------------|--------|-----------------------------------------------------------------------------|
| `videoUrl`           | string | Enlace directo al archivo `.mp4` o `.m3u8`, sin publicidad.                 |
| `iframe.raw`         | string | Iframe original embed extraído del sitio intermediario.                    |
| `iframe.clean`       | string | Redirección limpia, apuntando directamente al host que sirve el video.     |

---

## ⚠️ Notas

- Este microservicio utiliza [Playwright](https://playwright.dev/) para renderizar páginas con JavaScript y obtener iframes anidados.
- El sistema puede tardar **2-4 segundos** por request debido al procesamiento del navegador sin cabeza.
- Está pensado para usarse en conjunto con una API principal desplegada en Vercel u otro entorno ligero, delegando aquí las tareas más pesadas de scraping dinámico.

---

## 🧪 Desarrollo local

```bash
# Instalar dependencias
npm install

# Ejecutar servidor en localhost:3001
npm run dev
```

---

## 🛠 Tecnologías

- Node.js
- Express
- Playwright (headless Chromium)
- Axios
- Cheerio (opcional si integrás scraping estático)

---

## 👤 Autor  
GitHub: [@leandrogm](https://github.com/leandrogm)
