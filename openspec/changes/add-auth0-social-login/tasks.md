## 1. Configuración de Auth0

- [x] 1.1 Crear la cuenta personal en Auth0 y un tenant para UNA Chat.
- [x] 1.2 Crear una aplicación de tipo Regular Web Application y anotar dominio, client ID y client secret.
- [x] 1.3 Habilitar el proveedor social Google en la conexión de la aplicación.
- [x] 1.4 Registrar `http://localhost:3000/callback` como URL de retorno y `http://localhost:3000` como origen permitido.
- [ ] 1.5 Registrar la URL de retorno y el origen del dominio de Vercel (se completan en el paso 6.1).
- [x] 1.6 Generar un `AUTH0_SECRET` con `openssl rand -hex 32` (o equivalente) para cifrar la cookie de sesión.

## 2. Dependencias y configuración local

- [x] 2.1 Instalar `express-openid-connect` y `dotenv` como dependencias de producción.
- [x] 2.2 Crear `.env.example` con `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET`, `APP_BASE_URL` y `PORT`, sin valores reales.
- [x] 2.3 Crear el `.env` local a partir del ejemplo y cargarlo al arrancar el servidor.
- [x] 2.4 Validar al arranque que las variables obligatorias existan y fallar con un mensaje que nombre la que falta.

## 3. Servidor

- [x] 3.1 Configurar el middleware `auth` de `express-openid-connect` con la sesión cifrada y las rutas de login, callback y logout.
- [x] 3.2 Proteger `GET /` y las rutas estáticas necesarias; dejar público solo lo indispensable (estilos, scripts, fixtures de prueba).
- [x] 3.3 Implementar `GET /api/me` devolviendo únicamente `nombre` y `picture` de `req.oidc.user`.
- [x] 3.4 Montar el middleware de sesión sobre `io.engine` y rechazar el handshake sin sesión válida.
- [x] 3.5 Sobrescribir el `nombre` de cada mensaje con la identidad de la sesión antes de validar y reemitir.
- [x] 3.6 Implementar `/login-error` con mensaje genérico en español y enlace para reintentar el login.
- [x] 3.7 Verificar que `start()` y las exportaciones actuales sigan funcionando para las pruebas.

## 4. Cliente

- [x] 4.1 Quitar el campo de nombre de usuario y mostrar nombre y avatar desde `/api/me`.
- [x] 4.2 Agregar el botón de cerrar sesión que navega a `/logout`.
- [x] 4.3 Mostrar el mensaje de error de autenticación con botón de reintento cuando corresponda.
- [x] 4.4 Avisar en la interfaz cuando la sesión expire y se deje de aceptar el envío de mensajes.
- [x] 4.5 Mantener la construcción del DOM con la API del DOM, sin concatenar HTML.

## 5. Pruebas

- [x] 5.1 Unitarias: validación de variables de entorno y normalización de la identidad.
- [x] 5.2 Integración: `/` redirige sin sesión y responde con sesión; `/api/me` con y sin sesión.
- [x] 5.3 Integración: el handshake de Socket.IO se rechaza sin sesión y se acepta con sesión.
- [x] 5.4 Integración: el nombre del mensaje reemitido es el de la sesión, no el enviado por el cliente.
- [x] 5.5 E2E: identidad visible, cierre de sesión y pantalla de error con el modo de autenticación simulada habilitado solo en pruebas.
- [x] 5.6 Correr `npm run test:all` y dejar las tres capas en verde.

## 6. Despliegue y documentación

- [ ] 6.1 Crear el proyecto en Vercel desde el repositorio y anotar el dominio asignado.
- [ ] 6.2 Cargar las variables de entorno de Auth0 en Vercel (sin exponer secretos en el repo).
- [x] 6.3 Agregar `vercel.json` y el punto de entrada serverless que exporta la app Express.
- [ ] 6.4 Verificar en Vercel el inicio y cierre de sesión, la identidad y la pantalla de error.
- [x] 6.5 Escribir el `README.md` con los pasos de Auth0, ejecución local, variables y despliegue.
- [x] 6.6 Documentar la limitación de Socket.IO en Vercel y su impacto en el chat en tiempo real.

## 7. Cierre

- [ ] 7.1 Revisar los criterios de aceptación de la US-01 uno por uno y adjuntar evidencias de local y Vercel.
- [ ] 7.2 Archivar el cambio con `openspec archive add-auth0-social-login` y verificar que las specs principales queden actualizadas.
