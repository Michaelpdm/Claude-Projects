module.exports = (req, res, next) => {
  // If no API_KEY is configured yet, allow through (graceful during setup)
  if (!process.env.API_KEY) return next();

  const provided = req.headers['x-api-key'];
  if (provided === process.env.API_KEY) return next();

  res.status(401).json({ error: 'Unauthorized' });
};
