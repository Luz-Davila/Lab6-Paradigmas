const { test, expect } = require('@playwright/test');

// Medios locales servidos por el propio backend: no dependen de internet.
const IMAGEN = '/fixtures/chat-test.png';
const VIDEO = '/fixtures/chat-test.mp4';
const YOUTUBE = 'https://www.youtube.com/watch?v=qYwlqx-JLok';
const SCRIPT_XSS = '<script>alert("XSS")</script>';

async function enviar(page, texto) {
  await page.getByPlaceholder('Mensaje o URL de imagen/video').fill(texto);
  await page.getByRole('button', { name: 'Send' }).click();
}

function origenDe(page) {
  return new URL(page.url()).origin;
}

// El modo de prueba acepta esta cookie como sesión (ver libs/auth.js).
test.beforeEach(async ({ context, page }) => {
  await context.addCookies([
    { name: 'test_user', value: 'Luz', url: 'http://127.0.0.1:3100' }
  ]);
  await page.goto('/');
});

test.describe('UNA Chat end-to-end', () => {

  test('debería mostrar la identidad de la sesión', async ({ page }) => {
    await expect(page.locator('#usuario')).toHaveText('Luz');
    await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
  });

  test('debería mostrar una imagen enviada como URL', async ({ page }) => {
    await enviar(page, origenDe(page) + IMAGEN);

    const imagen = page.locator('#messages img.media-chat').last();

    await expect(imagen).toBeVisible();
    await expect
      .poll(() => imagen.evaluate((el) => el.complete && el.naturalWidth > 0))
      .toBe(true);
  });

  test('debería mostrar el reproductor de un video enviado como URL', async ({ page }) => {
    await enviar(page, origenDe(page) + VIDEO);

    const video = page.locator('#messages video.media-chat').last();

    await expect(video).toBeVisible();
    await expect(video).toHaveAttribute('controls', /.*/);
    await expect
      .poll(() => video.evaluate((el) => el.readyState >= 1))
      .toBe(true);
  });

  test('debería insertar el reproductor de YouTube con el id validado', async ({ page }) => {
    await enviar(page, YOUTUBE);

    const iframe = page.locator('#messages iframe.media-chat').last();

    await expect(iframe).toBeVisible();
    await expect(iframe).toHaveAttribute('src', 'https://www.youtube.com/embed/qYwlqx-JLok');
  });

  test('no debería ejecutar un script inyectado en el mensaje', async ({ page }) => {
    const alertas = [];

    // Se registra antes del envío: si el XSS se ejecuta, la prueba falla.
    page.on('dialog', async (dialog) => {
      alertas.push(dialog.message());
      await dialog.dismiss();
    });

    await enviar(page, SCRIPT_XSS);

    const mensaje = page.locator('#messages li span').last();

    await expect(mensaje).toContainText(SCRIPT_XSS);
    await expect(page.locator('#messages script')).toHaveCount(0);
    expect(alertas).toEqual([]);
  });

  test('debería mostrar el nombre de la sesión como autor', async ({ page }) => {
    await enviar(page, 'hola desde la sesión');

    await expect(page.locator('#messages li b').last()).toHaveText('Luz');
  });

  test('debería pedir iniciar sesión cuando no hay sesión', async ({ context, page }) => {
    await context.clearCookies();
    await page.goto('/');

    await expect(page).toHaveURL(/login-error/);
    await expect(page.getByRole('link', { name: 'Reintentar' })).toBeVisible();
  });

  test('debería cerrar la sesión desde la barra', async ({ page }) => {
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();

    await expect(page).toHaveURL(/login-error/);
  });

});
