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

});
