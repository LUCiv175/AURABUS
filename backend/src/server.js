const app = require('./app');
const config = require('./config');

const port = config.api.port;

app.listen(port, () => {
  console.log(`Server API listening on port ${port}`);
});