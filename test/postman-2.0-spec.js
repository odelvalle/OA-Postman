/*eslint node/no-unpublished-require:0*/

const server = require('./server');
const swaggerTests = require('../src/swagger');

describe('Swagger definition to Postman test', () => {
  before(done => {
    server.run(() => {
      console.log('JSON Server is running');
      done();
    });
  });

  it('Global test run ok', async () => {
    try {
      const results = await swaggerTests(`${__dirname}/swaggers/2.0/GET-global-postman.test-swagger.yaml`, {
        run: `${__dirname}/data.json`,
        save: false // don't save postman collection to disk
      });

      console.assert(!results.tests.definition.some(result => result.code >= 5000), 'Errors in test.');
    } catch (error) { throw error; }
  });

  it('Global security run ok', async () => {
    try {
      const results = await swaggerTests(`${__dirname}/swaggers/2.0/GET-global-security.test-swagger.yaml`, {
        run: `${__dirname}/data.json`,
        save: false // don't save postman collection to disk
      });

      console.assert(!results.tests.definition.some(result => result.code >= 5000), 'Errors in test.');
    } catch (error) { throw error; }
  });

  it('Pet Store run all', async () => {
    try {
      const results = await swaggerTests(`${__dirname}/swaggers/2.0/petstore-swagger.yaml`, {
        run: `${__dirname}/data.json`,
        save: true
      });

      console.assert(!results.tests.definition.some(result => result.code >= 5000), 'Errors in test.');
    } catch (error) { throw error; }
  });

  it('Pet Store run all GETS in production', async () => {
    try {
      const results = await swaggerTests(`${__dirname}/swaggers/2.0/petstore-swagger.yaml`, {
        run: `${__dirname}/data.json`,
        save: true,
        production: true
      });

      console.assert(!results.tests.definition.some(result => result.code >= 5000), 'Errors in test.');
    } catch (error) { throw error; }
  });

  after(done => {
    server.stop(() => {
      done();
    });
  });
});
