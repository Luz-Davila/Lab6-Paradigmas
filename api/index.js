// Punto de entrada serverless para Vercel.
// Reutiliza la misma app Express que se ejecuta en local.
var { app } = require('../server');

module.exports = app;
