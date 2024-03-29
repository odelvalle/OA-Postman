// @ts-nocheck
/// <reference path="../index.d.ts"/>

'use strict';

const request = require('request-promise-native');
const ps = require('postman-collection');
const Variable = require('postman-collection/lib').Variable;

const Endpoint = require('./endpoint');
// const deinitionTests = require('./definition-test');
const DefinitionError = require('./errors').DefinitionError;

class Endpoints {
  /**
   *Creates an instance of Endpoints.
   * @param {*} definition API Definition
   * @param {*} globalVariables Global variables for test
   * @param {string} tokenUrl Url to get OAuth token
   * @memberof Endpoints
   */
  constructor (definition, globalVariables, tokenUrl) {
    this.definition = definition;
    this.endpoints = [];
    this.globalVariables = globalVariables;
    this.tokenUrl = tokenUrl;
  }

  parse (path, methods) {
    Object.keys(methods).forEach(method => {
      if (method.startsWith('x-')) return;
      const def = methods[method];

      const swaggerCommons = {
        consumes: this.definition.consumes || def.consumes,
        produces: this.definition.produces || def.produces,
        schemes: this.definition.schemes
      };

      const endpoint = new Endpoint(method, path, def, swaggerCommons);
      if (endpoint) this.endpoints.push(endpoint);
    });
  }

  async export (onExportEndpoint) {
    const result = {
      collection: new ps.Collection({
        info: {
          name: this.definition.info.title,
          version: this.definition.info.version
        }
      }),
      tests: {
        definition: [],
        collection: []
      }
    };

    let securities;
    let globalSecurity;
    const securityDefinitions = { securities: [] };

    if (this.definition.securityDefinitions) {
      Object.keys(this.definition.securityDefinitions).forEach(sec => {
        securityDefinitions.securities.push(Object.assign({ key: sec }, this.definition.securityDefinitions[sec]));
      });

      const securityValues = this.globalVariables.filter(obj => {
        return obj.name === 'client_id' || obj.name === 'client_secret' ||
          obj.name === 'username' || obj.name === 'password';
      }) || [];

      securityDefinitions.value = securityValues.reduce((obj, item) => {
        obj[item.name] = item.value;
        return obj;
      }, {});

      securities = await getSecurities(securityDefinitions, this.tokenUrl);

      if (this.definition.security) {
        // Get first security key
        const key = Object.keys(this.definition.security[0])[0];
        globalSecurity = securities[key];

        if (globalSecurity.variable) this.globalVariables.push(globalSecurity.variable);
      }
    }

    /** @type {Array<DefinitionErrorDetail>} */
    const results = [];
    this.endpoints.forEach(endpoint => {
      try {
        let security;
        const securityDefinitions = endpoint.def.security || this.definition.securityDefinitions || [];
        if (securityDefinitions && securityDefinitions.length > 0) {
          const key = Object.keys(endpoint.def.security[0])[0];
          security = securities[key];

          if (security && security.variable &&
            !this.globalVariables.some(variable => variable.name === security.variable.name)) {
            this.globalVariables.push(security.variable);
          }
        }

        let members = endpoint.export(this.definition['x-pm-test'], security || globalSecurity);
        let folder;
        if (endpoint.def.tags && endpoint.def.tags.length > 0) {
          folder = result.collection.items.find(member => member.name === endpoint.def.tags[0], null);
          if (folder) folder.item.push({ name: endpoint.def.summary || endpoint.url, item: members });
          else members = { name: endpoint.def.tags[0], item: [{ name: endpoint.def.summary || endpoint.url, item: members }] };
        }

        if (!folder) result.collection.items.members = result.collection.items.members.concat(members);
        onExportEndpoint(endpoint.method + ': ' + endpoint.url);

        // Test definition results
        // results = results.concat(deinitionTests.definitionTestsPassed(
        //   endpoint,
        //   endpoint.def.buildPostmanItems || this.definition.security
        // ));
      } catch (error) {
        process.stdout.write(`Error exporting endpoint ${endpoint.method} ${endpoint.url}.\n`);
        throw error;
      }
    });

    if (results.length > 0 && results.some(result => result.code >= 5000)) {
      throw new DefinitionError('Tests definition fails.', results);
    }

    result.tests.definition = results;

    this.globalVariables.forEach(variable => {
      if (variable.name === 'base-url') {
        result.collection.variables.add(new Variable({
          key: 'base-url',
          id: 'base-url',
          value: variable.value + (this.definition.basePath || ''),
          type: 'string'
        }));

        return;
      }

      result.collection.variables.add(new Variable({
        key: variable.name,
        id: variable.name,
        value: variable.value,
        type: 'string'
      }));
    });

    if (!this.globalVariables.some(variable => variable.name === 'base-url')) {
      result.collection.variables.add(new Variable({
        key: 'base-url',
        id: 'base-url',
        value: this.definition.servers[0].url,
        type: 'string'
      }));
    }

    return result;
  }
}

async function getSecurities (securityDef, tokenUrl) {
  const security = {};

  // only support password flow
  const oauth = securityDef.securities.filter(security => security.type === 'oauth2');
  for (const oauth2 of oauth) {
    switch (oauth2.flow) {
      case 'password': {
        const b = Buffer.from(securityDef.value.client_id + ':' + securityDef.value.client_secret);

        const authRequest = {
          url: tokenUrl || oauth2.tokenUrl,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: 'Basic ' + b.toString('base64')
          },
          form: {
            grant_type: security.flow,
            scope: Object.keys(oauth2.scopes).join(','),
            username: securityDef.value.username,
            password: securityDef.value.password
          }
        };

        try {
          const response = await request.post(authRequest);
          const result = JSON.parse(response);
          security[oauth2.key] = {
            param: {
              in: 'header',
              name: 'Authorization',
              value: '{{authorization}}'
            },
            variable: {
              name: 'authorization',
              value: result.token_type + ' ' + result.access_token
            }
          };
        } catch (error) {
          process.stdout.write(error);
        }

        break;
      }
      default:
        security[oauth2.key] = {
          param: {
            in: 'header',
            name: 'Authorization',
            value: '{{authorization}}'
          },
          variable: {
            name: 'authorization',
            value: 'unsupported'
          }
        };
    }
  };

  securityDef.securities.filter(security => security.type === 'basic')
    .forEach(basic => {
      const b = Buffer.from(securityDef.value.client_id + ':' + securityDef.value.client_secret);

      security[basic.key] = {
        param: {
          in: 'header',
          name: 'Authorization',
          value: `{{${basic.name}}}`
        },
        variable: {
          name: basic.name,
          value: 'Basic ' + b.toString('base64')
        }
      };
    });

  securityDef.securities.filter(security => security.type === 'apiKey')
    .forEach(apiKey => {
      security[apiKey.key] = {
        param: {
          in: apiKey.in,
          name: apiKey.name,
          value: `{{${apiKey.name}}}`
        }
      };
    });

  return security;
}

module.exports = Endpoints;
