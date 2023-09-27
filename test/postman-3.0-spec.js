const path = require('path');
const server = require('./server');
const swaggerTests = require('../src/swagger');

describe.only('Swagger definition to Postman test', () => {
  before(done => {
    server.run(() => {
      console.log('JSON Server is running');
      done();
    });
  });

  it('Global test run ok', async () => {
    const results = await swaggerTests(path.join(__dirname, '/swaggers/2.0/GET-global-postman.test-swagger.yaml'), {
      data: path.join(__dirname, '/data.json'),
      save: false // don't save postman collection to disk
    });

    console.assert(!results.tests.definition.some(result => result.code >= 5000), 'Errors in test.');
  });

  it('Global security run ok', async () => {
    const results = await swaggerTests(path.join(__dirname, '/swaggers/2.0/GET-global-security.test-swagger.yaml'), {
      data: path.join(__dirname, '/data.json'),
      save: false // don't save postman collection to disk
    });

    console.assert(!results.tests.definition.some(result => result.code >= 5000), 'Errors in test.');
  });

  it('OA 3.0: Pet Store run all', async () => {
    const results = await swaggerTests(path.join(__dirname, '/swaggers/3.0/petstore-swagger.yaml'), {
      data: path.join(__dirname, '/data.json'),
      save: true
    });

    console.assert(!results.tests.definition.some(result => result.code >= 5000), 'Errors in test.');
  });

  it.only('OA 3.0: Api Quality run all', async () => {
    const results = await swaggerTests(path.join(__dirname, '/swaggers/3.0/Gobierno-del-dato-1.0.0.yaml'), {
      data: path.join(__dirname, '/data-empty.json'),
      save: true
    });

    console.assert(!results.tests.definition.some(result => result.code >= 5000), 'Errors in test.');
  });

  it('Pet Store run all GETS in production', async () => {
    const results = await swaggerTests(path.join(__dirname, '/swaggers/2.0/petstore-swagger.yaml'), {
      run: path.join(__dirname, '/data.json'),
      save: true,
      production: true
    });

    console.assert(!results.tests.definition.some(result => result.code >= 5000), 'Errors in test.');
  });

  after(done => {
    server.stop(() => {
      done();
    });
  });
});
