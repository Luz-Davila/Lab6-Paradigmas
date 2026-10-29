// npm install para descargar los paquetes...

// librerias
var path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });

var validation = require('./libs/unalib');
var authLib = require('./libs/auth');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

// La configuración se valida al arrancar: si falta una variable, el proceso
// falla con un mensaje que nombra la que falta.
var config = authLib.validarConfiguracion();
var middlewareAuth = authLib.crearMiddleware(config);

app.disable('x-powered-by');
app.use(middlewareAuth);

// jQuery local: evita depender de un CDN y permite escanearlo con Snyk.
app.use('/vendor', express.static(path.join(__dirname, 'node_modules/jquery/dist')));

// Medios de prueba locales para las pruebas end-to-end.
app.use('/fixtures', express.static(path.join(__dirname, 'fixtures')));

// root: presentar html (solo con sesión)
app.get('/', authLib.exigirSesion(config), function(req, res){
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Identidad mínima del usuario autenticado, para que el cliente la muestre.
app.get('/api/me', function(req, res){
  var identidad = authLib.identidadDe(req);

  if (!identidad) {
    return res.status(401).json({ error: 'no_autenticado' });
  }

  return res.json(identidad);
});

// Pantalla de error de autenticación: mensaje claro y reintento.
app.get('/login-error', function(req, res){
  res.status(401).send(authLib.paginaError(req.query.motivo));
});

// En pruebas no hay tenant real: se simulan login y logout por cookie.
if (config.modoPrueba) {
  app.get('/login', function(req, res){
    var identidad = authLib.identidadDe(req);
    res.redirect(identidad ? '/' : '/login-error?motivo=sin_sesion');
  });

  app.get('/logout', function(req, res){
    res.setHeader('Set-Cookie', 'test_user=; Path=/; Max-Age=0; SameSite=Lax');
    res.redirect('/login-error?motivo=cancelado');
  });
}

// Cualquier error de autenticación del SDK termina en la pantalla de error.
app.use(function(err, req, res, next){
  if (res.headersSent) {
    return next(err);
  }

  console.error('Error de autenticación:', err && err.message);

  if (req.path === '/login-error') {
    return res.status(500).send(authLib.paginaError('error'));
  }

  return res.redirect('/login-error?motivo=error');
});

// El handshake de Socket.IO pasa por el mismo middleware de sesión.
io.engine.use(middlewareAuth);

io.use(function(socket, next){
  var identidad = authLib.identidadDe(socket.request);

  if (!identidad) {
    return next(new Error('unauthorized'));
  }

  socket.identidad = identidad;
  next();
});

// escuchar una conexion por socket
io.on('connection', function(socket){
  // si se escucha "chat message"
  socket.on('Evento-Mensaje-Server', function(msg){

    // El nombre no se toma del cliente: se impone el de la sesión.
    msg = authLib.mensajeConIdentidad(msg, socket.identidad);
    msg = validation.validateMessage(msg);
    // volvemos a emitir el mismo mensaje
    io.emit('Evento-Mensaje-Server', msg);
  });
});

// Se exporta la app, el servidor y el socket para poder probarlos con
// Jest + Supertest y socket.io-client sin abrir un puerto fijo.
function start(puerto) {
  var puertoFinal = puerto === undefined ? port : puerto;

  return http.listen(puertoFinal, function(){
    console.log('listening on *:' + puertoFinal);
  });
}

// Solo se levanta el servidor con "npm start" o "node server.js".
if (require.main === module) {
  start();
}

module.exports = {
  app: app,
  http: http,
  io: io,
  start: start,
  config: config
};
