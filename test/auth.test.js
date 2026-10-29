var assert = require('assert');
var auth = require('../libs/auth');

describe('libs/auth', function () {

  describe('validarConfiguracion', function () {

    it('debería fallar indicando las variables que faltan', function () {
      assert.throws(function () {
        auth.validarConfiguracion({ NODE_ENV: 'production' });
      }, /AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_SECRET/);
    });

    it('debería recortar espacios de los valores', function () {
      var config = auth.validarConfiguracion({
        AUTH0_DOMAIN: ' ejemplo.us.auth0.com ',
        AUTH0_CLIENT_ID: ' cliente ',
        AUTH0_CLIENT_SECRET: ' secreto ',
        AUTH0_SECRET: ' sesion ',
        APP_BASE_URL: 'http://localhost:3000/'
      });

      assert.equal(config.domain, 'ejemplo.us.auth0.com');
      assert.equal(config.clientID, 'cliente');
      assert.equal(config.clientSecret, 'secreto');
      assert.equal(config.secret, 'sesion');
      assert.equal(config.baseURL, 'http://localhost:3000');
      assert.equal(config.modoPrueba, false);
    });

    it('no debería exigir credenciales en modo de prueba', function () {
      var config = auth.validarConfiguracion({
        NODE_ENV: 'test',
        AUTH0_TEST_MODE: '1'
      });

      assert.equal(config.modoPrueba, true);
    });

  });

  describe('identidadDe', function () {

    it('debería devolver null sin sesión', function () {
      assert.equal(auth.identidadDe({}), null);
      assert.equal(auth.identidadDe({ oidc: { isAuthenticated: function () { return false; } } }), null);
    });

    it('debería devolver nombre y foto del usuario', function () {
      var req = {
        oidc: {
          isAuthenticated: function () { return true; },
          user: { name: 'Luz Dávila', picture: 'https://foto/1.png' }
        }
      };

      assert.deepEqual(auth.identidadDe(req), {
        nombre: 'Luz Dávila',
        picture: 'https://foto/1.png'
      });
    });

    it('debería usar el correo cuando no hay nombre', function () {
      var req = {
        oidc: {
          isAuthenticated: function () { return true; },
          user: { email: 'luz@una.ac.cr' }
        }
      };

      assert.equal(auth.identidadDe(req).nombre, 'luz@una.ac.cr');
    });

  });

  describe('mensajeConIdentidad', function () {

    var identidad = { nombre: 'Luz', picture: '' };

    it('debería reemplazar el nombre enviado por el cliente', function () {
      var salida = JSON.parse(auth.mensajeConIdentidad(
        JSON.stringify({ nombre: 'Intruso', mensaje: 'hola', color: '#FF0000' }),
        identidad
      ));

      assert.equal(salida.nombre, 'Luz');
      assert.equal(salida.mensaje, 'hola');
      assert.equal(salida.color, '#FF0000');
    });

    it('debería envolver un mensaje que no es JSON', function () {
      var salida = JSON.parse(auth.mensajeConIdentidad('<b>hola</b>', identidad));

      assert.equal(salida.nombre, 'Luz');
      assert.equal(salida.mensaje, '<b>hola</b>');
    });

  });

  describe('adaptarParaEngine', function () {

    it('debería entregar una request con los ayudantes de Express', function (done) {
      var http = require('http');
      var terminado = false;

      function terminar(error, servidor) {
        if (terminado) {
          return;
        }
        terminado = true;
        if (servidor) {
          servidor.close();
        }
        done(error);
      }

      // Simula el middleware de Auth0: necesita req.get y res.cookie, que la
      // request cruda del motor de Socket.IO no tiene.
      var adaptado = auth.adaptarParaEngine(function (req, res, next) {
        try {
          assert.equal(typeof req.get, 'function');
          assert.equal(req.get('x-prueba'), 'ok');
          assert.equal(typeof res.cookie, 'function');
          assert.equal(typeof res.clearCookie, 'function');
          res.statusCode = 204;
          res.end();
          terminar(null, servidor);
        } catch (e) {
          terminar(e, servidor);
        }
      });

      var servidor = http.createServer(adaptado);

      servidor.listen(0, function () {
        var puerto = servidor.address().port;

        http.get({
          host: '127.0.0.1',
          port: puerto,
          path: '/socket.io/?EIO=4&transport=polling',
          headers: { 'x-prueba': 'ok' }
        }, function (res) {
          res.resume();
        }).on('error', function (e) {
          terminar(e, servidor);
        });
      });
    });

  });

});
