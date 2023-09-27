// @ts-nocheck
'use strict';

const Item = require('postman-collection').Item;
const vkbeautify = require('vkbeautify');
const JSONSchemaFaker = require('json-schema-faker');

const Events = require('./events');

const opts = JSONSchemaFaker.option.getDefaults();
opts.useDefaultValue = true;
opts.useExamplesValue = true;
opts.failOnInvalidFormat = false;
opts.failOnInvalidTypes = false;

class Endpoint {
  /**
   * Creates an instance of Endpoint.
   * @param {string} method
   * @param {string} url
   * @param {*} def
   * @param {*} swaggerCommons
   * @memberof Endpoint
   */
  constructor (method, url, def, swaggerCommons) {
    this.method = method;
    this.url = url;
    this.def = def;
    this.swaggerCommons = swaggerCommons;

    this.postmanItems = [];
  }

  export (globalTests, security) {
    this.globalTests = {
      parameters: (globalTests && globalTests.params) || [],
      tests: (globalTests && globalTests.tests) || []
    };

    this.security = security && this.def.security && this.def.security.length === 0 ? undefined : security;

    buildPostmanItems(this);
    return this.postmanItems;
  }
}

function buildPostmanItems (endpoint) {
  /** @todo Only support application/json */
  const content = (endpoint.def.consumes && endpoint.def.consumes.length > 0 && endpoint.def.consumes[0]) ||
  (endpoint.swaggerCommons.consumes && endpoint.swaggerCommons.consumes[0]) || undefined;

  const accept = (endpoint.def.produces && endpoint.def.produces.length > 0 && endpoint.def.produces[0]) ||
  (endpoint.swaggerCommons.produces && endpoint.swaggerCommons.produces[0]) || undefined;

  if (!endpoint.def.responses) return;

  Object.keys(endpoint.def.responses).forEach(status => {
    // const response = endpoint.def.responses[status];

    // No test for default && 5XX response
    if (status === 'default' || Number(status) >= 500) return;

    const tests = buildDefaultsTest(endpoint, Number(status));

    const globalParameters = endpoint.globalTests.parameters.filter(p => {
      const responses = (p.except && p.except.responses) || [];
      const methods = (p.except && p.methods) || [];

      return !responses.map(String).includes(status) && !methods.includes(endpoint.method);
    });

    const globalTests = getGlobalsTest(endpoint, status);
    tests.forEach(test => {
      test.params = test.params || [];

      // add globals parameters if not exist in test
      test.params = (globalParameters || []).filter(dp => dp.in !== 'body').reduce((acc, p) => {
        if (!acc.find(pl => pl.name === p.name && pl.in === p.in)) acc.push(p);
        return acc;
      }, test.params);

      // add all parameters in definition if not exist in test
      test.params = (endpoint.def.parameters || []).filter(dp => dp.in !== 'body').reduce((acc, p) => {
        if (!acc.find(pl => p.name === pl.name && p.in === pl.in)) {
          acc.push({
            name: p.name,
            in: p.in,
            value: defaultVal(p),
            disabled: true
          });
        }

        return acc;
      }, test.params);

      test.raw = (test.raw || '') + globalTests;

      if (status !== '401' && endpoint.security &&
        !test.params.find(p => endpoint.security.param.name === p.name &&
          endpoint.security.param.in === p.in)) test.params.push(endpoint.security.param);

      endpoint.postmanItems.push(buildPostmanItem(endpoint, test, content, accept, status));
    });
  });
}

function getGlobalsTest (endpoint, status) {
  let raw = '';
  endpoint.globalTests.tests.forEach(test => {
    if (!test.except.responses.map(String).includes(status) && !test.except.methods.includes(endpoint.method)) {
      raw += test.raw;
    }
  });

  return raw;
}

function buildOksTest (endpoint, status) {
  const tests = [];
  if (!endpoint.def.parameters) return tests;

  tests.push({
    description: `[${status}] ${endpoint.def.responses[status].description} - required parameters`,
    params: []
  });

  const requiredParams = endpoint.def.parameters.filter(p => p.required);

  requiredParams.forEach(parameter => {
    tests[0].params.push({
      name: parameter.name,
      in: parameter.in,
      value: defaultVal(parameter, { requiredOnly: true }),
      disabled: false
    });
  });

  // If all parameters are required, no need to generate test to optional parameters
  const body = endpoint.def.parameters.find(p => p.in === 'body');
  if (requiredParams.length === endpoint.def.parameters.length && !body) return tests;

  if (endpoint.def.parameters.length === 1 &&
    body && body.schema && (body.schema.required || []).length === Object.keys(body.schema.properties || []).length) return tests;

  tests.push({
    description: `[${status}] ${endpoint.def.responses[status].description} - all parameters`,
    params: []
  });

  // opts.requiredOnly = false;
  // opts.alwaysFakeOptionals = true;

  endpoint.def.parameters.forEach(parameter => {
    tests[1].params.push({
      name: parameter.name,
      in: parameter.in,
      value: defaultVal(parameter),
      disabled: false
    });
  });

  // opts.requiredOnly = true;
  // opts.alwaysFakeOptionals = false;

  // Query parameters
  const pathParameters = endpoint.def.parameters.filter(p => p.in === 'path');
  const headerParameters = endpoint.def.parameters.filter(p => p.in === 'header');

  endpoint.def.parameters.filter(p => p.in === 'query').forEach(parameter => {
    const queryTest = {
      description: `[${status}] ${endpoint.def.responses[status].description} - ${parameter.name}`,
      params: [{
        name: parameter.name,
        in: parameter.in,
        value: defaultVal(parameter),
        disabled: false
      }]
    };

    if (body) {
      queryTest.params.push({
        name: parameter.name,
        in: parameter.in,
        value: defaultVal(parameter),
        disabled: false
      });
    }

    if (pathParameters) {
      pathParameters.forEach(p => {
        queryTest.params.push({
          name: p.name,
          in: p.in,
          value: defaultVal(p),
          disabled: false
        });
      });
    }

    if (headerParameters) {
      headerParameters.forEach(p => {
        queryTest.params.push({
          name: p.name,
          in: p.in,
          value: defaultVal(p),
          disabled: false
        });
      });
    }

    tests.push(queryTest);
  });

  return tests;
}

function buildBadRequestTest (endpoint, status) {
  const buildTest = (parameter, parameters, body) => {
    const test = {
      description: `[${status}] Invalid ${parameter.name}`,
      params: [{
        name: parameter.name,
        in: parameter.in,
        value: defaultInvalidVal(parameter),
        disabled: false
      }]
    };

    if (parameters) {
      parameters.forEach(p => {
        test.params.push({
          name: p.name,
          in: p.in,
          value: defaultVal(p),
          disabled: false
        });
      });
    }

    if (body) {
      test.params.push({
        name: body.name,
        in: body.in,
        value: defaultVal(body),
        disabled: false
      });
    }

    return test;
  };
  const tests = [];
  if (!endpoint.def.parameters) return tests;

  const body = endpoint.def.parameters.find(p => p.in === 'body');

  endpoint.def.parameters.forEach(parameter => {
    tests.push(buildTest(parameter, endpoint.def.parameters.filter(p => p.name !== parameter.name), body));
  });

  // set options to generate all parameters
  if (!body || !body.schema.required || body.schema.required.length === 0) return tests;

  const requireBody = body.schema.required.map(p => p);
  requireBody.forEach(property => {
    body.schema.required = requireBody.map(p => p);

    const index = body.schema.required.indexOf(property);
    body.schema.required.splice(index, 1);

    const test = {
      description: `[${status}] ${endpoint.def.responses[status].description} - w/ ${property}`,
      params: []
    };

    test.params.push({
      name: body.name,
      in: 'body',
      value: defaultVal(body, { requiredOnly: true }),
      disabled: false
    });

    tests.push(test);
  });

  return tests;
}

function buildDefaultsTest (endpoint, status) {
  if (status >= 200 && status < 300) return buildOksTest(endpoint, status);
  if (status === 400) return buildBadRequestTest(endpoint, status);

  const tests = [];
  tests.push({
    description: `[${status}] ${endpoint.def.responses[status].description}`
  });

  if (!endpoint.def.parameters) return tests;

  tests[0].params = [];
  endpoint.def.parameters.forEach(parameter => {
    tests[0].params.push({
      name: parameter.name,
      in: parameter.in,
      value: defaultVal(parameter),
      disabled: !parameter.required
    });
  });

  return tests;
}

function buildPostmanItem (endpoint, test, content, accept, status) {
  let url = endpoint.url;

  const headerParam = test.params.filter(param => param.in === 'header');
  const pathParameters = test.params.filter(param => param.in === 'path');
  const formParameters = test.params.filter(param => param.in === 'formData');
  const urlVariables = [];

  const bodyParam = test.params.find(param => param.in === 'body');

  pathParameters.forEach(param => {
    urlVariables.push({ key: param.name, value: param.value.toString() });
    url = url.replace(`{${param.name}}`, param.variable ? `{{${param.name}}}` : `:${param.name}`);
  });

  const item = new Item({
    name: (test.description || `[${status}] on ${url}`).replace('[url]', url),
    request: {
      method: endpoint.method,
      url: `{{base-url}}${url}`,
      // @ts-ignore
      header: [
        { key: 'accept', value: accept }
      ]
    }
  });

  if (content) item.request.headers.add({ key: 'content-type', value: Number(status) === 415 ? 'text/html' : content });

  test.params.filter(param => param.in === 'query')
    .forEach(param => {
      item.request.url.query.members.push({
        key: param.name,
        value: param.value.toString(),
        disabled: param.disabled
      });
    });

  if (headerParam.length > 0) {
    headerParam.forEach(header => {
      item.request.headers.members.push({
        key: header.name,
        value: header.value,
        disabled: header.disabled
      });
    });
  }

  if (urlVariables.length > 0) item.request.url.variable = urlVariables;

  if (formParameters.length > 0) {
    item.request.body = { mode: 'formData', formdata: [] };

    formParameters.forEach(form => {
      item.request.body.formdata.push({
        key: form.name,
        value: form.type !== 'file' ? form.value.toString() : undefined,
        src: form.type === 'file' ? form.value : undefined,
        type: form.type
      });
    });
  }

  if (bodyParam) {
    item.request.body = { mode: 'raw', raw: bodyParam[content] || JSON.stringify({}) };

    try {
      if (content.endsWith('xml')) item.request.body.raw = vkbeautify.xml(bodyParam.value[content]);
      else if (content.endsWith('json')) item.request.body.raw = vkbeautify.json(bodyParam.value[content]);
    } catch (err) {
      process.stdout.write(`Unknown body content. Add raw content to endpoint ${endpoint.method} ${endpoint.url}.\n`);
    }
  }

  item.events.add(Events.getTests(endpoint, accept, status, test));
  item.disabled = endpoint.def['x-ignore-test'] === true;

  return item;
}

function defaultVal (parameter) {
  JSONSchemaFaker.option(opts);

  const value = JSONSchemaFaker.generate(parameter.schema);
  return parameter.in === 'body' ? { 'application/json': value } : value;
}

function defaultInvalidVal (parameter) {
  if (parameter.schema.type === 'string' && parameter.schema.enum) return '0000000000000000';
  if (parameter.schema.type === 'string' && parameter.schema.minLength > 0) return '';
  if (parameter.schema.type === 'string' && parameter.schema.maxLength > 0) return 'X'.repeat(parameter.schema.maxLength + 1);

  return 'fake-invalid-value';
}

module.exports = Endpoint;
