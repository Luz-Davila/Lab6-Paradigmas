// Se activa el doble de autenticación antes de cargar el servidor.
process.env.NODE_ENV = 'test';
process.env.AUTH0_TEST_MODE = '1';

const request = require('supertest');
const { io: ioClient } = require('socket.io-client');
const { app, http, io } = require('../../server');
const validation = require('../../libs/unalib');

jest.setTimeout(10000);

let server;
let puerto;
let cliente;

// Conecta un cliente real de Socket.IO al servidor de prueba.
// Sin usuario, el handshake debe ser rechazado.
function conectar(usuario) {
  return new Promise((resolve, reject) => {
    const opciones = {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false
    };

    if (usuario) {
      opciones.extraHeaders = { Cookie: 'test_user=' + encodeURIComponent(usuario) };
    }

    const socket = ioClient(`http://127.0.0.1:${puerto}`, opciones);

    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}

// Envía un mensaje y espera el mensaje saneado que difunde el backend.
function enviar(socket, payload) {
  return new Promise((resolve) => {
    socket.once('Evento-Mensaje-Server', (msg) => resolve(JSON.parse(msg)));
    socket.emit('Evento-Mensaje-Server', payload);
  });
}

beforeAll((done) => {
  // Puerto 0: el sistema operativo asigna uno libre y no choca con el 3000.
  server = http.listen(0, () => {
    puerto = server.address().port;
    done();
  });
});

beforeEach(async () => {
  cliente = await conectar('Luz');
});

afterEach(() => {
  jest.restoreAllMocks();

  if (cliente) {
    cliente.close();
    cliente = null;
  }
});

afterAll(async () => {
  await new Promise((resolve) => io.close(resolve));

  if (server.listening) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('Integración backend + una-lib', () => {

  describe('Ruta HTTP GET /', () => {

    it('debería servir el chat en HTML cuando hay sesión', async () => {
      const respuesta = await request(app).get('/').set('Cookie', 'test_user=Luz');

      expect(respuesta.status).toBe(200);
      expect(respuesta.headers['content-type']).toContain('text/html');
      expect(respuesta.text).toContain('Chat Socket.IO UNA');
    });

    it('debería redirigir al login cuando no hay sesión', async () => {
      const respuesta = await request(app).get('/');

      expect(respuesta.status).toBe(302);
      expect(respuesta.headers.location).toContain('/login-error');
    });

  });

  describe('Ruta HTTP GET /api/me', () => {

    it('debería devolver la identidad de la sesión', async () => {
      const respuesta = await request(app).get('/api/me').set('Cookie', 'test_user=Luz');

      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toEqual({ nombre: 'Luz', picture: '' });
    });

    it('debería responder 401 sin sesión', async () => {
      const respuesta = await request(app).get('/api/me');

      expect(respuesta.status).toBe(401);
      expect(respuesta.body.error).toBe('no_autenticado');
    });

  });

  describe('Handshake de Socket.IO', () => {

    it('debería rechazar la conexión sin sesión', async () => {
      await expect(conectar(null)).rejects.toThrow();
    });

    it('debería aceptar la conexión con sesión', async () => {
      expect(cliente.connected).toBe(true);
    });

  });

  describe('Evento Socket.IO Evento-Mensaje-Server', () => {

    it('debería aceptar una URL de imagen válida y devolver un <img>', async () => {
      const salida = await enviar(cliente, JSON.stringify({
        nombre: 'Luz',
        mensaje: 'https://image.com/foto.png',
        color: '#FF0000'
      }));

      expect(salida.tipo).toBe('imagen');
      expect(salida.url).toBe('https://image.com/foto.png');
      expect(salida.mensaje).toContain('<img src="https://image.com/foto.png"');
      expect(salida.nombre).toBe('Luz');
      expect(salida.color).toBe('#FF0000');
    });

    it('debería aceptar una URL de video válida y devolver un <video>', async () => {
      const salida = await enviar(cliente, JSON.stringify({
        nombre: 'Luz',
        mensaje: 'https://video.com/clip.mp4',
        color: '#00FF00'
      }));

      expect(salida.tipo).toBe('video');
      expect(salida.url).toBe('https://video.com/clip.mp4');
      expect(salida.mensaje).toContain('<video');
      expect(salida.mensaje).toContain('controls');
    });

    it('debería aceptar un enlace de YouTube y devolver el iframe del reproductor', async () => {
      const salida = await enviar(cliente, JSON.stringify({
        nombre: 'Luz',
        mensaje: 'https://www.youtube.com/watch?v=qYwlqx-JLok&t=30s',
        color: '#0000FF'
      }));

      expect(salida.tipo).toBe('video_youtube');
      expect(salida.videoId).toBe('qYwlqx-JLok');
      expect(salida.mensaje).toContain('https://www.youtube.com/embed/qYwlqx-JLok');
      expect(salida.mensaje).not.toContain('&t=30s');
    });

    it('debería sanear un intento de inyección con <script>', async () => {
      const salida = await enviar(cliente, JSON.stringify({
        nombre: 'Luz',
        mensaje: '<script>alert("XSS")</script>',
        color: '#FF0000'
      }));

      expect(salida.tipo).toBe('texto');
      expect(salida.mensaje).not.toContain('<script');
      expect(salida.mensaje).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    });

    it('debería rechazar una URL no permitida como javascript:', async () => {
      const salida = await enviar(cliente, JSON.stringify({
        nombre: 'Luz',
        mensaje: 'javascript:alert(1)',
        color: '#FF0000'
      }));

      expect(salida.tipo).toBe('texto');
      expect(salida.url).toBe('');
      expect(salida.mensaje).toBe('javascript:alert(1)');
    });

    it('debería sanear un mensaje que ni siquiera es JSON', async () => {
      const salida = await enviar(cliente, '<img src=x onerror=alert(1)>');

      expect(salida.tipo).toBe('texto');
      expect(salida.mensaje).toBe('&lt;img src=x onerror=alert(1)&gt;');
      expect(salida.nombre).toBe('Luz');
    });

    it('debería ignorar el nombre enviado por el cliente y usar el de la sesión', async () => {
      const salida = await enviar(cliente, JSON.stringify({
        nombre: 'Intruso',
        mensaje: 'hola',
        color: '#FF0000'
      }));

      expect(salida.nombre).toBe('Luz');
    });

    it('debería rechazar una URL con credenciales incrustadas', async () => {
      const salida = await enviar(cliente, JSON.stringify({
        nombre: 'Luz',
        mensaje: 'https://user:pass@image.com/foto.png',
        color: '#FF0000'
      }));

      expect(salida.tipo).toBe('texto');
      expect(salida.url).toBe('');
    });

    it('debería invocar validateMessage con el nombre de la sesión', async () => {
      const espia = jest.spyOn(validation, 'validateMessage');

      await enviar(cliente, JSON.stringify({
        nombre: 'Intruso',
        mensaje: 'hola',
        color: '#FF0000'
      }));

      expect(espia).toHaveBeenCalledTimes(1);
      expect(espia.mock.calls[0][0]).toContain('"nombre":"Luz"');
    });

  });

});
