
/**
 * @typedef {Object} Definition
 * @property {Array<string>} consumes - API Consumes
 * @property {Array<string>} produces - API Produces
 * @property {Array} schemes - API Schemes
 * @property {Object} info - API Info
 * @property {string} info.title - API Title
 * @property {string} info.version - API Version
 * @property {Array<{ url: string }>} servers - API servers
 * @property {Object} securityDefinitions - Security definitions
 * @property {Array} paths - Paths definition
 */

const operations = ['get', 'post', 'put', 'delete', 'options', 'head', 'patch', 'trace'];

/**
 * @param {*} definition
 * @param {*} options
 *
 * @returns {Definition}
 */
const parseSwagger = (definition, options = {}) => {
  Object.keys(definition.paths).forEach(path => {
    const pathItems = definition.paths[path];
    operations.forEach(method => {
      const def = pathItems[method];
      if (!def) return;

      def.parameters.forEach(param => {
        if (!param.schema) {
          param.schema = {
            type: param.type,
            format: param.format,
            items: param.items
          };
        }
      });
    });
  });

  const servers = [];
  servers.push({ url: definition.schemes[0] + '://' + definition.host + (definition.basePath || '') });

  return {
    consumes: definition.consumes,
    produces: definition.produces,
    schemes: definition.schemes,
    servers,
    info: {
      title: definition.info.title,
      version: definition.info.version
    },
    securityDefinitions: definition.securityDefinitions,
    paths: definition.paths
  };
};

/**
 * @param {*} definition
 * @param {*} options
 *
 * @returns {Definition}
 */
const parseOpenApi = (definition, options = {}) => {
  Object.keys(definition.paths).forEach(path => {
    const pathItems = definition.paths[path];
    const globalParameters = pathItems.parameters || [];
    operations.forEach(method => {
      const def = pathItems[method];
      if (!def) return;

      def.parameters = [...def.parameters || [], ...globalParameters];
      if (def.requestBody) {
        def.consumes = Object.keys(def.requestBody.content);

        // default to application/json
        const content = def.requestBody.content['application/json'] || def.requestBody.content[def.consumes[0]];

        def.parameters.push({
          in: 'body',
          name: 'body',
          description: def.requestBody.description,
          required: true,
          // TODO: Only support JSON
          schema: content.schema
        });
      }

      const [response] = Object.keys(def.responses);
      if (response === '204') return;

      // TODO: Only suport one produces to all responses
      if (!def.responses) {
        throw new Error(`[${def.summary}] No responses defined`);
      }

      if (def.responses[response].content === undefined) {
        process.stdout.write(`[${def.summary}] No content defined in response ${response}`);

        // asume application/json if no produces
        def.responses[response].content = { 'application/json': {} };
      }

      def.produces = Object.keys(def.responses[response].content);
    });
  });

  return {
    consumes: null,
    produces: null,
    schemes: null,
    servers: definition.servers,
    info: {
      title: definition.info.title,
      version: definition.info.version
    },
    securityDefinitions: definition.components.securitySchemes,
    paths: definition.paths
  };
};

exports.ParseDefinition = class {
  /**
   *
   * @param {*} definition
   * @param {*} options
   *
   * @returns {Definition}
   *
   */
  static parse (definition, options = {}) {
    if (definition.swagger) return parseSwagger(definition, options);
    if (definition.openapi) return parseOpenApi(definition, options);

    throw new Error('Invalid definition version');
  }
};
