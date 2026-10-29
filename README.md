# UNA Chat

Chat en tiempo real del curso de Paradigmas de Programación (UNA, Campus Nicoya). Usa Express + Socket.IO en el servidor y un cliente único en HTML/jQuery, sin build step.

Esta versión agrega la **US-01 del Laboratorio 8**: inicio de sesión con Google a través de Auth0, sesión del lado del servidor, chat protegido e identidad visible con cierre de sesión.

## Requisitos

- Node.js 20.19 o superior (probado con 22.20).
- Una cuenta de Auth0 (plan gratuito).
- Opcional para desplegar: una cuenta de Vercel.

## Configuración de Auth0

1. Crear una cuenta en [auth0.com](https://auth0.com) y un tenant.
2. En **Applications → Create Application**:
   - Nombre: `UNA Chat`.
   - Tipo: **Regular Web Application**.
3. En **Settings** anotar `Domain`, `Client ID` y `Client Secret`.
4. Completar las URLs (agregar también el dominio de Vercel cuando exista):
   - **Allowed Callback URLs:** `http://localhost:3000/callback`
   - **Allowed Logout URLs:** `http://localhost:3000`
   - **Allowed Web Origins:** `http://localhost:3000`
5. En **Authentication → Social**, habilitar **Google** y conectarlo a la aplicación.

## Variables de entorno

Copiar `.env.example` a `.env` y completar:

```bash
cp .env.example .env
```

| Variable | Para qué sirve |
|---|---|
| `AUTH0_DOMAIN` | Dominio del tenant, sin `https://` ni barra final |
| `AUTH0_CLIENT_ID` | Identificador de la aplicación |
| `AUTH0_CLIENT_SECRET` | Secreto de la aplicación (nunca al repositorio) |
| `AUTH0_SECRET` | Clave de 64 caracteres hex para cifrar la cookie de sesión |
| `APP_BASE_URL` | `http://localhost:3000` en local; el dominio de Vercel al desplegar |
| `PORT` | Puerto local (3000 por defecto) |

Generar `AUTH0_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Si falta una variable obligatoria, el servidor no arranca y el mensaje indica cuál falta.

## Ejecución local

```bash
npm install
npm start
```

Abrir `http://localhost:3000`. Sin sesión, la aplicación redirige a Auth0; con sesión, el chat muestra el nombre y la foto del usuario y el botón **Cerrar sesión**.

## Pruebas

```bash
npm test                  # unitarias (Mocha)
npm run test:integration  # integración (Jest + Supertest + socket.io-client)
npm run test:e2e          # end-to-end (Playwright, Chromium)
npm run test:all          # las tres capas
npm run security          # Snyk, severidad alta
```

Las pruebas no usan el tenant real: con `NODE_ENV=test` y `AUTH0_TEST_MODE=1` se activa un doble de autenticación (`libs/auth.js`) que acepta la cookie `test_user` o el encabezado `x-test-user`. Ese modo está deshabilitado fuera de las pruebas.

## Despliegue en Vercel

1. Importar el repositorio en Vercel.
2. Cargar en **Settings → Environment Variables** las mismas variables del `.env`, con:
   - `APP_BASE_URL` = `https://<proyecto>.vercel.app`
   - `AUTH0_SECRET` distinto al de local (recomendado).
3. En Auth0, agregar:
   - Callback: `https://<proyecto>.vercel.app/callback`
   - Logout: `https://<proyecto>.vercel.app`
   - Web Origins: `https://<proyecto>.vercel.app`
4. Desplegar. `vercel.json` y `api/index.js` publican la app Express como función serverless.

## Limitaciones conocidas

- **Socket.IO en Vercel:** las funciones serverless no mantienen conexiones WebSocket, así que el chat en tiempo real no funciona igual que en local. El inicio y cierre de sesión, la identidad y la protección de rutas sí se validan en el despliegue. Queda como deuda técnica migrar el transporte (polling, SSE o un backend aparte) si se necesita el chat completo en producción.
- La cookie de sesión usa `SameSite=Lax`; si se configura un dominio propio distinto al de Auth0, hay que ajustarla a `None; Secure`.

## Estructura

```
server.js            Express + Socket.IO, rutas protegidas y /api/me
libs/auth.js         Configuración de Auth0, identidad y middleware de sesión
libs/unalib.js       Validación y saneamiento de mensajes
index.html           Cliente (identidad, chat, avisos de sesión)
api/index.js         Entrada serverless para Vercel
openspec/            Especificaciones y cambios del proyecto
test/                Unitarias (Mocha)
tests/integration/   Integración (Jest)
tests/e2e/           End-to-end (Playwright)
```

## Evidencias

- Local: pendiente de captura con el tenant real.
- Vercel: pendiente del despliegue.
