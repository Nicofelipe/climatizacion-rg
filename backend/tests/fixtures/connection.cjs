// Misma conexión que la aplicación. Se carga aparte porque varias pruebas reemplazan el módulo sqlServer.
require('dotenv').config({ quiet: true });
require('tsx/cjs');
const file = require.resolve('../../src/database/sqlServer.ts');
const cached = require.cache[file];
delete require.cache[file];
module.exports = require(file).connectionString();
if (cached) require.cache[file] = cached; else delete require.cache[file];
