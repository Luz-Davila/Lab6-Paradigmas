## Context

Ver `proposal.md` para la motivación. El estado actual que condiciona el diseño:

- `server.js` sirve `index.html` con `res.sendFile`, monta Socket.IO sobre el mismo servidor HTTP y exporta `app`, `http`, `io` y `start()` para las pruebas.
- No hay capa de sesión ni lectura de `.env`; solo se usa `process.env.PORT`.
- `index.html` es un archivo estático con jQuery, sin build step, y hoy toma el nombre de un campo libre.
- Las pruebas de integración levantan la app en un puerto efímero y las e2e usan Playwright contra la app real.

## Goals / Non-Goals

**Goals:**

- Autenticación OAuth con Auth0 en local y en Vercel, sin exponer tokens ni secretos al navegador.
- Una sola fuente de identidad: el servidor decide quién es el usuario y el cliente solo la muestra.
- El chat (HTTP y Socket.IO) rechaza a quien no tenga sesión.
- Cambios mínimos en el cliente: se mantiene el HTML estático y la lógica de mensajes existente.

**Non-Goals:**

- Migrar el transporte del chat ni reescribir el frontend.
- Gestionar usuarios, roles o persistencia de perfiles.
- Soportar varios proveedores sociales de forma simultánea (queda configurable en Auth0).

## Decisions

### 1. `express-openid-connect` en lugar de una SPA con `@auth0/auth0-spa-js`

**Decisión:** usar el SDK server-side `express-openid-connect` con cookie de sesión cifrada.

**Por qué:** el proyecto ya es una app Express que sirve HTML; el SDK protege rutas con una línea, no expone tokens al navegador y permite reutilizar la misma sesión para autorizar el handshake de Socket.IO. Una SPA obligaría a guardar tokens en el navegador, a proteger el socket con un token propio y a agregar lógica de refresh.

**Alternativas descartadas:** SPA con tokens en memoria (más superficie de ataque y más código); sesión propia con Passport (reinventa lo que el SDK ya resuelve).

### 2. Proteger el handshake de Socket.IO con el mismo middleware de sesión

**Decisión:** montar el middleware de autenticación sobre el motor de Socket.IO (`io.engine.use(...)`), leer `req.oidc` en el handshake y rechazar con `next(new Error('unauthorized'))` cuando no haya sesión. En cada mensaje, el servidor sobrescribe `nombre` con el nombre de la sesión.

**Por qué:** el cliente no puede falsear la identidad y no hace falta un canal aparte para validar tokens. Como el socket viaja sobre el mismo origen y la misma cookie, no hay configuración CORS adicional.

**Alternativa descartada:** enviar un token desde el cliente al conectar (requiere exponerlo y validarlo a mano).

### 3. Identidad al cliente mediante `GET /api/me`

**Decisión:** endpoint que devuelve solo `{ nombre, picture }` desde `req.oidc.user`, y `index.html` lo consulta al cargar.

**Por qué:** mantiene `index.html` estático y testeable, evita interpolar datos en HTML y deja explícito qué campos son públicos. La barra de identidad y el botón de cerrar sesión se construyen con la API del DOM, igual que los mensajes.

### 4. Rutas y configuración

- `GET /` — protegida; sin sesión redirige a Auth0.
- `GET /callback` — la maneja el SDK; los errores se normalizan a `/login-error`.
- `GET /logout` — cierra sesión local y en Auth0, y vuelve al inicio.
- `GET /api/me` — identidad mínima del usuario autenticado.
- Variables: `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET`, `APP_BASE_URL`, `PORT`.
- Validación al arrancar: si falta una variable obligatoria, el proceso falla con un mensaje que nombra la variable; así se evita un arranque a medias.

### 5. Manejo de cancelación y errores

**Decisión:** una ruta `/login-error` lee `error` y `error_description` del callback, muestra un mensaje genérico en español (sin detalles internos) y un botón que reinicia el flujo. Se registra el detalle solo en el servidor.

**Por qué:** cumple el criterio 9 sin filtrar información sensible ni dejar al usuario en una pantalla muerta.

### 6. Despliegue en Vercel

**Decisión:** exportar la app Express como función serverless (`api/index.js` + `vercel.json`) y configurar las variables en el panel de Vercel.

**Por qué:** permite cumplir el flujo de login/logout en Vercel con el mismo código. **Limitación conocida:** las funciones serverless no mantienen WebSockets, así que el chat en tiempo real no funciona igual que en local. El login, la identidad y el cierre de sesión sí se pueden validar allá. Se documenta en el README y queda como riesgo abierto, fuera del alcance de esta historia.

### 7. Pruebas

- **Unitarias (Mocha):** validación de variables de entorno y normalización de identidad.
- **Integración (Jest + Supertest):** rutas protegidas con el middleware de autenticación sustituido por un doble de prueba; `/api/me` con y sin sesión; rechazo del handshake sin sesión.
- **E2E (Playwright):** el flujo completo contra Auth0 real queda como evidencia manual (capturas), y un modo de autenticación simulada —habilitado solo con `NODE_ENV=test` y una bandera explícita— cubre la UI: identidad visible, cierre de sesión y pantalla de error.

## Risks / Trade-offs

- **[Socket.IO no funciona en Vercel]** → se documenta la limitación, se valida el flujo de login/logout en Vercel y se deja el transporte como deuda técnica; si el profesor lo exige, se evalúa polling o SSE en un cambio aparte.
- **[Cookies bloqueadas por `SameSite`]** → en local y en un despliegue del mismo origen se usa `Lax`; si se configura dominio propio, `None; Secure`.
- **[Modo de autenticación simulada en pruebas]** → se activa solo con `NODE_ENV=test` más una bandera, se documenta y no se expone en el flujo normal.
- **[Sesión expirada con el chat abierto]** → el servidor rechaza los mensajes y el cliente muestra el aviso para volver a iniciar sesión.
- **[El nombre deja de ser editable]** → cambio visible para el usuario; se comunica en la interfaz (sin campo de nombre) y en el README.

## Migration Plan

1. Configurar la aplicación de Auth0 y las variables de entorno en local antes de levantar el servidor.
2. Desplegar a Vercel con las variables cargadas y las URLs registradas.
3. Rollback: revertir el commit del cambio y quitar las variables; el chat vuelve a su comportamiento anterior sin migración de datos.

## Open Questions

- Si el profesor exige el chat funcional en Vercel, decidir entre polling, SSE o un backend aparte para Socket.IO.
