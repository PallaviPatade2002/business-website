// On hosts whose disk resets on restart (e.g. Render free), set AUTO_SEED=1 to refill demo data.
if (process.env.AUTO_SEED) require('./seed');
const app = require('./app');
const port = process.env.PORT || 5002;
app.listen(port, () => console.log(`Business site API running on http://localhost:${port}`));
