// Autenticación con Auth0 para UNA Chat.
//
// Concentra la lectura de configuración, la identidad del usuario y el
// middleware de sesión. En pruebas se usa un doble controlado por variables de
// entorno, para no depender de un tenant real ni de credenciales.

var VARIABLES_OBLIGATORIAS = [
  'AUTH0_DOMAIN',
  'AUTH0_CLIENT_ID',
  'AUTH0_CLIENT_SECRET',
  'AUTH0_SECRET'
];

// El SDK se carga solo cuando se usa de verdad: sus dependencias son ESM y
// Jest no puede requerirlas en el modo de prueba.
var sdk = null;

function cargarSdk() {
  if (!sdk) {
    sdk = require('express-openid-connect');
  }
  return sdk;
}

// El modo de prueba solo se activa con las dos variables a la vez.
function esModoPrueba(env) {
  env = env || process.env;
  return env.NODE_ENV === 'test' && env.AUTH0_TEST_MODE === '1';
}

function validarConfiguracion(env) {
  env = env || process.env;
  var modoPrueba = esModoPrueba(env);

  if (modoPrueba) {
    return {
      modoPrueba: true,
      baseURL: (env.APP_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')
    };
  }

  var faltantes = VARIABLES_OBLIGATORIAS.filter(function (nombre) {
    return !env[nombre] || String(env[nombre]).trim() === '';
  });

  if (faltantes.length > 0) {
    throw new Error(
      'Faltan variables de entorno obligatorias para Auth0: ' + faltantes.join(', ') +
      '. Copiá .env.example a .env y completá los valores.'
    );
  }

  return {
    modoPrueba: false,
    domain: String(env.AUTH0_DOMAIN).trim(),
    clientID: String(env.AUTH0_CLIENT_ID).trim(),
    clientSecret: String(env.AUTH0_CLIENT_SECRET).trim(),
    secret: String(env.AUTH0_SECRET).trim(),
    baseURL: String(env.APP_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')
  };
}

// Devuelve la identidad pública del usuario autenticado, o null.
function identidadDe(req) {
  if (!req || !req.oidc || typeof req.oidc.isAuthenticated !== 'function') {
    return null;
  }

  if (!req.oidc.isAuthenticated()) {
    return null;
  }

  var usuario = req.oidc.user || {};
  var nombre = usuario.name || usuario.nickname || usuario.email || 'Usuario';

  return {
    nombre: String(nombre).trim(),
    picture: typeof usuario.picture === 'string' ? usuario.picture : ''
  };
}

function leerCookie(req, buscada) {
  var crudo = req && req.headers ? req.headers.cookie : '';
  if (!crudo) {
    return null;
  }

  var partes = String(crudo).split(';');
  for (var i = 0; i < partes.length; i++) {
    var parte = partes[i].trim();
    var separador = parte.indexOf('=');
    if (separador === -1) {
      continue;
    }
    if (parte.slice(0, separador) === buscada) {
      try {
        return decodeURIComponent(parte.slice(separador + 1));
      } catch (e) {
        return null;
      }
    }
  }

  return null;
}

// Doble de prueba: autentica según el encabezado x-test-user o la cookie test_user.
function middlewarePrueba(req, res, next) {
  var nombre = req.headers['x-test-user'] || leerCookie(req, 'test_user');
  req.oidc = {
    isAuthenticated: function () {
      return Boolean(nombre);
    },
    user: nombre ? { name: String(nombre), picture: '' } : undefined
  };
  next();
}

function crearMiddleware(config) {
  if (config.modoPrueba) {
    return middlewarePrueba;
  }

  return cargarSdk().auth({
    issuerBaseURL: 'https://' + config.domain,
    baseURL: config.baseURL,
    clientID: config.clientID,
    clientSecret: config.clientSecret,
    secret: config.secret,
    authRequired: false,
    idpLogout: true,
    authorizationParams: {
      scope: 'openid profile email'
    },
    routes: {
      login: '/login',
      callback: '/callback',
      logout: '/logout',
      postLogoutRedirect: '/'
    }
  });
}

// Exige sesión. En producción delega en res.oidc.login() (la misma ruta que
// usa /login); en pruebas redirige a la pantalla de error.
function exigirSesion(config) {
  if (config.modoPrueba) {
    return function (req, res, next) {
      if (identidadDe(req)) {
        return next();
      }
      return res.redirect('/login-error?motivo=sin_sesion');
    };
  }

  return function (req, res, next) {
    if (identidadDe(req)) {
      return next();
    }

    // Se usa la ruta /login, que ya está probada en este entorno, en lugar de
    // construir el redirect desde acá.
    return res.redirect('/login');
  };
}

// El SDK de Auth0 espera ayudantes de Express (req.get, res.cookie), pero el
// motor de Socket.IO entrega req/res crudos y su respuesta de upgrade no
// admite cambiarle el prototipo. Se agregan solo los ayudantes necesarios.
function agregarSetCookie(res, valor) {
  var previas = typeof res.getHeader === 'function' ? res.getHeader('Set-Cookie') : undefined;
  var lista = previas ? (Array.isArray(previas) ? previas.slice() : [previas]) : [];
  lista.push(valor);
  res.setHeader('Set-Cookie', lista);
}

function adaptarParaEngine(middleware) {
  var cookie = require('cookie');

  return function (req, res, next) {
    if (typeof req.get !== 'function') {
      req.get = req.header = function (nombre) {
        var valor = this.headers[String(nombre).toLowerCase()];
        return Array.isArray(valor) ? valor[0] : valor;
      };
    }

    if (typeof res.cookie !== 'function') {
      res.cookie = function (nombre, valor, opciones) {
        agregarSetCookie(this, cookie.serialize(nombre, valor, opciones));
        return this;
      };
    }

    if (typeof res.clearCookie !== 'function') {
      res.clearCookie = function (nombre, opciones) {
        var limpieza = Object.assign({}, opciones, { expires: new Date(0), maxAge: 0 });
        agregarSetCookie(this, cookie.serialize(nombre, '', limpieza));
        return this;
      };
    }

    return middleware(req, res, next);
  };
}

// Página de error de autenticación, sin datos sensibles.
function paginaError(motivo) {
  var mensajes = {
    sin_sesion: 'Necesitás iniciar sesión para entrar al chat.',
    cancelado: 'Cancelaste el inicio de sesión. Podés intentarlo de nuevo.',
    error: 'No pudimos completar el inicio de sesión. Intentá otra vez.'
  };
  var texto = mensajes[motivo] || mensajes.error;

  return [
    '<!doctype html>',
    '<html lang="es">',
    '<head><meta charset="utf-8"><title>No se pudo iniciar sesión</title>',
    '<style>',
    'body{font:16px Helvetica,Arial;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#f5f5f5;color:#111}',
    'main{background:#fff;padding:32px;border-radius:12px;max-width:420px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.08)}',
    'h1{font-size:20px;margin:0 0 12px}',
    'p{color:#444;line-height:1.5}',
    'a{display:inline-block;margin-top:16px;padding:10px 18px;background:#111;color:#fff;text-decoration:none;border-radius:8px}',
    '</style></head>',
    '<body><main>',
    '<h1>No se pudo iniciar sesión</h1>',
    '<p>' + texto + '</p>',
    '<a href="/login">Reintentar</a>',
    '</main></body></html>'
  ].join('');
}

// Mensaje que se reenvía al chat: el nombre siempre sale de la sesión.
function mensajeConIdentidad(msg, identidad) {
  var crudo = typeof msg === 'string' ? msg : '';
  var datos = null;

  try {
    datos = JSON.parse(crudo);
  } catch (e) {
    datos = null;
  }

  if (datos && typeof datos === 'object' && !Array.isArray(datos)) {
    datos.nombre = identidad.nombre;
    return JSON.stringify(datos);
  }

  var contenido = typeof datos === 'string' ? datos : crudo;
  return JSON.stringify({ nombre: identidad.nombre, mensaje: contenido });
}

module.exports = {
  esModoPrueba: esModoPrueba,
  validarConfiguracion: validarConfiguracion,
  identidadDe: identidadDe,
  crearMiddleware: crearMiddleware,
  adaptarParaEngine: adaptarParaEngine,
  exigirSesion: exigirSesion,
  paginaError: paginaError,
  mensajeConIdentidad: mensajeConIdentidad,
  middlewarePrueba: middlewarePrueba
};
