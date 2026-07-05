const { app, ensureSchema } = require('../server');

module.exports = async (req, res) => {
  try {
    await ensureSchema();
  } catch (err) {
    console.warn(`[RCCB] Vercel handler en mode secours: ${String(err && err.message ? err.message : err)}`);
  }
  return app(req, res);
};
