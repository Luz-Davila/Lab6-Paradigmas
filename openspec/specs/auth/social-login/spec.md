# auth/social-login Specification

## Purpose
Permite que las personas usen UNA Chat identificándose con una cuenta social a través de Auth0, sin crear ni recordar una contraseña adicional, y garantiza que solo usuarios autenticados accedan al chat.
## Requirements
### Requirement: Inicio de sesión con proveedor social

El sistema SHALL ofrecer un inicio de sesión OAuth 2.0 mediante Auth0 con al menos un proveedor social habilitado (Google), tanto en el ambiente local como en el desplegado.

#### Scenario: Inicio de sesión exitoso en local

- **WHEN** un visitante sin sesión abre UNA Chat en `http://localhost:3000`
- **THEN** el sistema lo redirige a Auth0, este lo autentica con Google y lo devuelve a UNA Chat con una sesión activa

#### Scenario: Inicio de sesión exitoso en Vercel

- **WHEN** un visitante sin sesión abre la URL del proyecto en Vercel
- **THEN** completa el mismo flujo de autenticación social y regresa autenticado a UNA Chat

### Requirement: Configuración de Auth0 y URLs permitidas

El sistema SHALL operar con una aplicación de Auth0 configurada para UNA Chat, con las URLs de retorno, de cierre de sesión y los orígenes permitidos correspondientes al ambiente local y al dominio de Vercel.

#### Scenario: Retorno desde Auth0 permitido

- **WHEN** Auth0 devuelve al usuario a la URL de retorno registrada para el ambiente en uso
- **THEN** el sistema acepta la respuesta y establece la sesión

#### Scenario: URL de retorno no registrada

- **WHEN** la URL de retorno solicitada no está registrada en la aplicación de Auth0
- **THEN** Auth0 rechaza la solicitud y UNA Chat informa que no fue posible iniciar sesión

### Requirement: Identidad visible y cierre de sesión

El sistema SHALL mostrar la identidad del usuario autenticado y permitirle cerrar sesión desde la interfaz.

#### Scenario: Identidad visible

- **WHEN** un usuario autenticado abre el chat
- **THEN** la interfaz muestra su nombre y avatar provenientes de la sesión, sin pedirle un nombre de usuario

#### Scenario: Cierre de sesión

- **WHEN** el usuario autenticado activa la opción de cerrar sesión
- **THEN** el sistema termina la sesión local y en Auth0, y vuelve a la pantalla de inicio de sesión

### Requirement: Acceso al chat restringido a usuarios autenticados

El sistema SHALL exigir una sesión válida para leer o enviar mensajes y SHALL rechazar las conexiones de Socket.IO sin sesión.

#### Scenario: Acceso sin sesión

- **WHEN** alguien intenta abrir la aplicación o conectarse al socket sin una sesión válida
- **THEN** el sistema le solicita iniciar sesión y no le entrega ni acepta mensajes

#### Scenario: Sesión expirada durante el uso

- **WHEN** la sesión del usuario expira mientras el chat está abierto
- **THEN** el sistema deja de aceptar mensajes y le pide volver a autenticarse

### Requirement: Configuración por variables de entorno sin secretos expuestos

El sistema SHALL tomar toda la configuración de autenticación (dominio, identificador de cliente, secreto de cliente, secreto de sesión y URL base) de variables de entorno, sin incluir secretos en el repositorio ni en el código que llega al navegador.

#### Scenario: Configuración ausente

- **WHEN** el servidor arranca sin alguna de las variables obligatorias de Auth0
- **THEN** el sistema no inicia el flujo de autenticación y registra un error claro indicando qué variable falta

#### Scenario: Inspección del navegador

- **WHEN** se revisan las respuestas y los archivos que recibe el navegador
- **THEN** no aparece el secreto de cliente ni el secreto de sesión

### Requirement: Manejo de cancelación y errores de autenticación

El sistema SHALL informar de forma clara cuando el usuario cancela el inicio de sesión o Auth0 devuelve un error, y SHALL ofrecer la posibilidad de reintentarlo.

#### Scenario: Cancelación del proveedor

- **WHEN** el usuario cancela la autorización en la pantalla de Google o de Auth0
- **THEN** UNA Chat muestra un mensaje comprensible y un botón para intentar de nuevo

#### Scenario: Error devuelto por Auth0

- **WHEN** Auth0 responde con un error de autenticación
- **THEN** el sistema muestra el mensaje de error sin detalles sensibles y permite reintentar el flujo

