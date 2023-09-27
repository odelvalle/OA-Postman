/*eslint node/no-unpublished-require:0*/

const swaggerTests = require('../src/swagger');

describe('Swagger definition to Postman test', () => {
  it('Fail on GET whitout correct response 2XX', done => {
    swaggerTests(`${__dirname}/swaggers/2.0/GET-whitout-response-2XX-swagger.yaml`)
      .then(() => done(new Error('Test fail')))
      .catch(error => {
        if (error.name === 'DefinitionError' &&
        error.results.some(result => result.code === 5001)) { done(); return; }

        done(error);
      });
  });

  it('Fail on GET whitout consumes', done => {
    swaggerTests(`${__dirname}/swaggers/2.0/GET-whitout-consumes-swagger.yaml`)
      .then(() => done(new Error('Test fail')))
      .catch(error => {
        if (error.name === 'DefinitionError' &&
        error.results.some(result => result.code === 8001)) { done(); return; }
        done(error);
      });
  });

  it('Fail on GET security whitout response 401', done => {
    swaggerTests(`${__dirname}/swaggers/2.0/GET-whitout-response-401-swagger.yaml`)
      .then(() => done(new Error('Test fail')))
      .catch(error => {
        if (error.name === 'DefinitionError' &&
        error.results.some(result => result.code === 6001)) { done(); return; }
        done(error);
      });
  });

  it('Fail on enum parameter whitout response 400', done => {
    swaggerTests(`${__dirname}/swaggers/2.0/parameter-enum-response-400-swagger.yaml`)
      .then(() => done(new Error('Test fail')))
      .catch(error => {
        if (error.name === 'DefinitionError' &&
        error.results.some(result => result.code === 7002)) { done(); return; }
        done(error);
      });
  });

  it('Fail on not string parameter whitout response 400', done => {
    swaggerTests(`${__dirname}/swaggers/2.0/parameter-not-string-response-400-swagger.yaml`)
      .then(() => done(new Error('Test fail')))
      .catch(error => {
        if (error.name === 'DefinitionError' &&
        error.results.some(result => result.code === 7003)) { done(); return; }
        done(error);
      });
  });

  it('Fail on parameter required whitout response 404', done => {
    swaggerTests(`${__dirname}/swaggers/2.0/parameter-required-response-404-swagger.yaml`)
      .then(() => done(new Error('Test fail')))
      .catch(error => {
        if (error.name === 'DefinitionError' &&
        error.results.some(result => result.code === 7001)) { done(); return; }
        done(error);
      });
  });

  it('Ok on parameter required with ignore 404', done => {
    swaggerTests(`${__dirname}/swaggers/2.0/parameter-required-ignore-404-swagger.yaml`)
      .then(() => done())
      .catch(error => done(error));
  });

  it('GET ok with warning on parameter required', done => {
    swaggerTests(`${__dirname}/swaggers/2.0/GET-ok-swagger.yaml`)
      .then(result => {
        if (result.tests.definition.some(result => result.code === 4000) &&
          !result.tests.definition.some(result => result.code >= 5000)) {
          done();
          return;
        };

        done(new Error('Test fail'));
      })
      .catch(error => done(error));
  });

  it('Methods not implemented', done => {
    swaggerTests(`${__dirname}/swaggers/2.0/not-implemented-swagger.yaml`)
      .then(() => done())
      .catch(error => done(error));
  });

  it('Fail on POST whitout correct response 2XX', done => {
    swaggerTests(`${__dirname}/swaggers/2.0/POST-whitout-response-2XX-swagger.yaml`)
      .then(() => done(new Error('Test fail')))
      .catch(error => {
        if (error.name === 'DefinitionError' &&
        error.results.some(result => result.code === 5003)) { done(); return; }

        done(error);
      });
  });

  it('Fail on POST whitout correct response 400', done => {
    swaggerTests(`${__dirname}/swaggers/2.0/POST-whitout-response-400-swagger.yaml`)
      .then(() => done(new Error('Test fail')))
      .catch(error => {
        if (error.name === 'DefinitionError' &&
        error.results.some(result => result.code === 5002)) { done(); return; }

        done(error);
      });
  });

  it('POST ok', done => {
    swaggerTests(`${__dirname}/swaggers/2.0/POST-ok-swagger.yaml`)
      .then(() => done())
      .catch(error => done(error));
  });

  it('Fail on PUT whitout correct response 2XX', done => {
    swaggerTests(`${__dirname}/swaggers/2.0/PUT-whitout-response-2XX-swagger.yaml`)
      .then(() => done(new Error('Test fail')))
      .catch(error => {
        if (error.name === 'DefinitionError' &&
        error.results.some(result => result.code === 5005)) { done(); return; }

        done(error);
      });
  });

  it('Fail on PUT whitout correct response 400', done => {
    swaggerTests(`${__dirname}/swaggers/2.0/PUT-whitout-response-400-swagger.yaml`)
      .then(() => done(new Error('Test fail')))
      .catch(error => {
        if (error.name === 'DefinitionError' &&
        error.results.some(result => result.code === 5004)) { done(); return; }

        done(error);
      });
  });

  it('PUT ok', done => {
    swaggerTests(`${__dirname}/swaggers/2.0/PUT-ok-swagger.yaml`)
      .then(() => done())
      .catch(error => done(error));
  });

  it('Fail on PATCH whitout correct response 2XX', done => {
    swaggerTests(`${__dirname}/swaggers/2.0/PATCH-whitout-response-2XX-swagger.yaml`)
      .then(() => done(new Error('Test fail')))
      .catch(error => {
        if (error.name === 'DefinitionError' &&
        error.results.some(result => result.code === 5007)) { done(); return; }

        done(error);
      });
  });

  it('Fail on PATCH whitout correct response 400', done => {
    swaggerTests(`${__dirname}/swaggers/2.0/PATCH-whitout-response-400-swagger.yaml`)
      .then(() => done(new Error('Test fail')))
      .catch(error => {
        if (error.name === 'DefinitionError' &&
        error.results.some(result => result.code === 5006)) { done(); return; }

        done(error);
      });
  });

  it('PATCH ok', done => {
    swaggerTests(`${__dirname}/swaggers/2.0/PATCH-ok-swagger.yaml`)
      .then(() => done())
      .catch(error => done(error));
  });

  it('Fail on DELETE whitout correct response 2XX', done => {
    swaggerTests(`${__dirname}/swaggers/2.0/DELETE-whitout-response-2XX-swagger.yaml`)
      .then(() => done(new Error('Test fail')))
      .catch(error => {
        if (error.name === 'DefinitionError' &&
        error.results.some(result => result.code === 5008)) { done(); return; }

        done(error);
      });
  });

  it('DELETE ok', done => {
    swaggerTests(`${__dirname}/swaggers/2.0/DELETE-ok-swagger.yaml`)
      .then(() => done())
      .catch(error => done(error));
  });
});
