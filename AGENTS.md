# UNA Chat (Lab 5 → Lab 8)

> **TL;DR:** Chat en tiempo real con Express + Socket.IO y cliente jQuery; el servidor valida y sanea todo mensaje antes de reemitirlo. Base del Lab 8, donde se agrega login social con Auth0.

## Stack

- Backend: Node.js + Express + Socket.IO (`server.js`, puerto `process.env.PORT || 3000`).
- Frontend: un solo `index.html` con CSS y JS embebidos, jQuery servido localmente desde `node_modules` (`/vendor`).
- Validación: `libs/unalib.js` (funciones puras, sin efectos secundarios).
- Pruebas: Mocha (`test/`), Jest + Supertest (`tests/integration/`), Playwright (`tests/e2e/`).

## Mapa

```
server.js            Servidor Express + Socket.IO; exporta app/http/io/start para pruebas
index.html           Cliente completo; construye el DOM sin concatenar HTML
libs/unalib.js       Límites de longitud, escapeHtml y validación de URLs/YouTube
test/                Unitarias (Mocha)
tests/integration/   Jest + Supertest + socket.io-client, sin puerto fijo
tests/e2e/           Playwright sobre la app real
fixtures/            Imagen y video de prueba servidos por el backend
.snyk                Política de escaneo de dependencias
```

Flujo: el cliente emite `Evento-Mensaje-Server` con JSON (`nombre`, `mensaje`, `color`) → `validation.validateMessage` → se reemite a todos → el cliente renderiza con la API del DOM.

## Comandos

```bash
npm install
npm start                 # http://localhost:3000
npm test                  # Mocha
npm run test:integration  # Jest
npm run test:e2e          # Playwright (Chromium)
npm run test:all          # las tres capas
npm run security          # Snyk, severidad alta
```

## Reglas

- Nada del cliente llega al DOM sin validar (URLs) o escapar (texto libre). El orden importa: `&` primero en `escapeHtml`.
- Los límites y valores por defecto viven en `libs/unalib.js`; no duplicarlos en el cliente.
- Comentarios y textos de interfaz en español.
- Nunca commitear `.env` ni credenciales. El `.gitignore` ya los excluye; `.env.example` es la excepción permitida.
- Antes de dar por terminado un cambio: `npm run test:all`.

## Pendiente (Lab 8 · US-01)

Autenticación social con Auth0: aplicación y proveedor social, URLs de callback/logout para local y Vercel, identidad y cierre de sesión en la interfaz, chat protegido, despliegue en Vercel, `README.md`, `.env.example` y manejo de cancelación/error de login. Se trabaja con OpenSpec.
