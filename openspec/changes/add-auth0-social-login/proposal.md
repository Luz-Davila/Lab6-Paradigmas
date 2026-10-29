## Why

UNA Chat no tiene autenticación: cualquiera que abra la URL puede leer y escribir mensajes, y la identidad es un nombre libre que se puede suplantar. La US-01 del Laboratorio 8 pide inicio de sesión social con Auth0 para acceder al chat sin crear ni recordar otra contraseña.

## What Changes

- Inicio de sesión con **Google** a través de Auth0 (OAuth 2.0 / OpenID Connect).
- Sesión del lado del servidor con cookie firmada; el navegador nunca recibe tokens de acceso.
- La ruta `/` queda protegida: sin sesión, el usuario es enviado al login de Auth0.
- El chat exige autenticación: el handshake de Socket.IO rechaza conexiones sin sesión válida.
- La interfaz muestra la identidad del usuario (nombre y avatar) y permite cerrar sesión.
- **BREAKING**: el chat deja de ser anónimo; se elimina el campo libre de "Username" y el nombre sale de la sesión.
- Si el usuario cancela el login o Auth0 devuelve un error, se muestra un mensaje claro y se ofrece reintentar.
- Configuración por variables de entorno: `.env` en local y variables del proyecto en Vercel. Sin secretos en el repositorio ni en el código del navegador.
- Despliegue en Vercel con el mismo flujo de inicio y cierre de sesión.
- Documentación: `README.md` con los pasos de Auth0, ejecución local y despliegue, más `.env.example`.

## Capabilities

### New Capabilities

- `auth/social-login`: inicio y cierre de sesión con un proveedor social vía Auth0, protección de la aplicación y del chat, identidad visible del usuario y manejo de cancelación o error.

### Modified Capabilities

- Ninguna: este repositorio todavía no tiene specs previas en `openspec/specs/`.

## Impact

- **Código**: `server.js` (middleware de sesión, rutas de login/logout/callback, protección del handshake de Socket.IO), `index.html` (barra de identidad, botón de salida, estados de error), `package.json` (nuevas dependencias: `express-openid-connect` y `dotenv`).
- **Pruebas**: unitarias de la lógica de sesión, integración de rutas protegidas, e2e del flujo de login con un proveedor simulado.
- **Configuración**: nuevo `.env.example`, `vercel.json` para el despliegue, y variables de entorno en Vercel.
- **Externo**: cuenta y aplicación de Auth0 con el proveedor Google habilitado; URLs de callback, logout y orígenes permitidos para local y Vercel.
- **Seguridad**: cookies `Secure` en producción, `SameSite=None` cuando el dominio de Vercel difiere del de Auth0, y ningún secreto expuesto al cliente.

## No objetivos

- No se cambia el transporte del chat: se mantiene Socket.IO.
- No se agregan roles, permisos ni almacenamiento de usuarios en base de datos.
- No se implementan otros proveedores sociales; la configuración queda lista para agregarlos luego.
- No se modifica la validación ni el saneamiento de mensajes de `libs/unalib.js`.
- No se resuelve en este cambio el comportamiento del chat en tiempo real en Vercel (las funciones serverless no mantienen WebSockets); se registra como riesgo aparte.
