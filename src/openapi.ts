import { camelCase, pascalCase } from "change-case";
import {
  strapiSchema,
  strapiSchemaAttribute,
  loadSchemas,
  getAttributeTargetPascal,
  saveAs,
  loadSchemasPaths,
} from "./utils";
import { OpenAPIV3 } from "openapi-types";
import { generateSource } from "oazapfts/lib/codegen";
import * as fs from "fs";
import * as path from "path";
import { format } from "prettier";

export function genAttributeOAD(
  attribute: strapiSchemaAttribute,
  propertyName: string,
  schemas: { [key: string]: strapiSchema }
) {
  switch (attribute.type) {
    case "relation":
      if (
        attribute.relation === "oneToMany" ||
        attribute.relation === "manyToMany"
      ) {
        return {
          type: "array",
          items: {
            $ref: `#/components/schemas/${getAttributeTargetPascal(
              attribute,
              schemas,
              propertyName
            )}`,
          },
        } as OpenAPIV3.ArraySchemaObject;
      } else {
        return {
          $ref: `#/components/schemas/${getAttributeTargetPascal(
            attribute,
            schemas,
            propertyName
          )}`,
        } as OpenAPIV3.ReferenceObject;
      }
    case "date":
      return {
        type: "string",
        format: "date",
      } as OpenAPIV3.SchemaObject;
    case "datetime":
      return {
        type: "string",
        format: "date-time",
      } as OpenAPIV3.SchemaObject;
    case "time":
      return {
        type: "string",
        format: "time",
      } as OpenAPIV3.SchemaObject;
    case "timestamp":
      return {
        type: "string",
        format: "timestamp",
      } as OpenAPIV3.SchemaObject;
    case "integer":
    case "biginteger":
      return {
        type: "integer",
      } as OpenAPIV3.SchemaObject;
    case "decimal":
    case "float":
      return {
        type: "integer",
      } as OpenAPIV3.SchemaObject;
    case "email":
      return {
        type: "string",
        format: "email",
      } as OpenAPIV3.SchemaObject;
    case "password":
      return {
        type: "string",
        format: "password",
      } as OpenAPIV3.SchemaObject;
    case "string":
    case "text":
    case "richtext":
    case "uid":
      return {
        type: "string",
      } as OpenAPIV3.SchemaObject;
    default:
      return {
        type: attribute.type,
      } as OpenAPIV3.SchemaObject;
  }
}

export function genAttributesOAD(
  schema: strapiSchema,
  schemas: { [key: string]: strapiSchema }
) {
  let properties: {
    [key: string]:
      | OpenAPIV3.ReferenceObject
      | OpenAPIV3.BaseSchemaObject
      | OpenAPIV3.ArraySchemaObject;
  } = {};
  for (const propertyName in schema.attributes) {
    if (Object.prototype.hasOwnProperty.call(schema.attributes, propertyName)) {
      properties[propertyName] = genAttributeOAD(
        schema.attributes[propertyName],
        propertyName,
        schemas
      );
    }
  }
  return properties;
}

export function genSchemaOAD(
  schema: strapiSchema,
  schemas: { [key: string]: strapiSchema }
) {
  let properties = genAttributesOAD(schema, schemas);
  return {
    type: "object",
    properties,
  } as OpenAPIV3.SchemaObject;
}

export function genSchemaNoiseOAD(schema: strapiSchema) {
  const components = {};
  const request: OpenAPIV3.SchemaObject = {
    type: "object",
    properties: {
      data: {
        $ref: `#/components/schemas/${pascalCase(schema.info.singularName)}`,
      },
    },
  };
  const response: OpenAPIV3.SchemaObject = {
    type: "object",
    properties: {
      id: {
        type: "number",
      },
      attributes: {
        $ref: `#/components/schemas/${pascalCase(schema.info.singularName)}`,
      },
    },
  };
  const LR: OpenAPIV3.SchemaObject = {
    type: "object",
    properties: {
      data: {
        type: "array",
        items: {
          $ref: `#/components/schemas/${pascalCase(
            schema.info.singularName
          )}Response`,
        },
      },
      meta: {
        $ref: "#/components/schemas/ListResponseMeta",
      },
    },
  };

  // @ts-ignore
  components[`${pascalCase(schema.info.singularName)}Response`] = response;
  // @ts-ignore
  components[`${pascalCase(schema.info.singularName)}ListResponse`] = LR;
  // @ts-ignore
  components[`${pascalCase(schema.info.singularName)}Request`] = request;

  return components;
}

export function generateCommonOAD(schemas: { [key: string]: strapiSchema }) {
  return {
    openapi: "3.0.0",
    info: {
      version: "1.0.0",
      title: "DOCUMENTATION",
      description: "",
      termsOfService: "YOUR_TERMS_OF_SERVICE_URL",
      contact: {
        name: "TEAM",
        email: "contact-email@something.io",
        url: "mywebsite.io",
      },
      license: {
        name: "Apache 2.0",
        url: "https://www.apache.org/licenses/LICENSE-2.0.html",
      },
    },
    "x-strapi-config": {
      path: "/documentation",
      showGeneratedFiles: true,
      generateDefaultResponse: true,
      plugins: ["email", "upload", "users-permissions"],
    },
    servers: [
      {
        url: "http://localhost:1337/api",
        description: "Development server",
      },
    ],
    externalDocs: {
      description: "Find out more",
      url: "https://docs.strapi.io/developer-docs/latest/getting-started/introduction.html",
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Error: {
          type: "object",
          required: ["error"],
          properties: {
            data: {
              nullable: true,
              oneOf: [
                {
                  type: "object",
                },
                {
                  type: "array",
                  items: {
                    type: "object",
                  },
                },
              ],
            },
            error: {
              type: "object",
              properties: {
                status: {
                  type: "integer",
                },
                name: {
                  type: "string",
                },
                message: {
                  type: "string",
                },
                details: {
                  type: "object",
                },
              },
            },
          },
        },
        ListResponseMeta: {
          type: "object",
          properties: {
            pagination: {
              properties: {
                page: {
                  type: "integer",
                },
                pageSize: {
                  type: "integer",
                  minimum: 25,
                },
                pageCount: {
                  type: "integer",
                  maximum: 1,
                },
                total: {
                  type: "integer",
                },
              },
            },
          },
        },
      },
    },
    paths: {},
  } as OpenAPIV3.Document;
}

export function generateOpenApiDoc(strapiDir: string, clientDir: string) {
  return new Promise((resolve, reject) => {
    let wdir = `${strapiDir}/src/api`;
    loadSchemas(wdir).then((schemas) => {
      const components = {};
      const pms: Promise<void>[] = [];
      for (const schemaName in schemas) {
        if (Object.prototype.hasOwnProperty.call(schemas, schemaName)) {
          const schema = schemas[schemaName];
          const tComp = {};
          // @ts-ignore
          tComp[`${pascalCase(schema.info.singularName)}`] = genSchemaOAD(
            schema,
            schemas
          );
          Object.assign(tComp, genSchemaNoiseOAD(schema));

          pms.push(
            saveAs(
              JSON.stringify(tComp, null, 2),
              `${clientDir}/components/${pascalCase(
                schema.info.singularName
              )}.json`
            )
          );
          Object.assign(components, tComp);
        }
      }
      Promise.all(pms).then(() => {
        saveAs(
          JSON.stringify(components, null, 2),
          `${clientDir}/components.json`
        );

        const doc = generateCommonOAD(schemas);
        // @ts-ignore
        doc.components.schemas = { ...doc.components.schemas, ...components };
        loadSchemasPaths(wdir).then((paths) => {
          doc.paths = paths;
          saveAs(
            JSON.stringify(doc, null, 2),
            `${clientDir}/openapi-doc.json`
          ).then(() => {
            resolve(true);
          });
        });
      });
    });
  });
}

export function generateGuard(schema: strapiSchema) {
  const pname = pascalCase(schema.info.singularName);
  return `export function is${pname}(o: any): o is ${pname} {
  return ${Object.keys(schema.attributes)
    .map((attName) => {
      return `o.${attName} !== undefined`;
    })
    .join(" ||\n")};
}
export function is${pname}Response(o: any): o is ${pname}Response {
  return o.id !== undefined && is${pname}(o.attributes);
}
`;
}

export function generateFromResponse(schema: strapiSchema) {
  const pname = pascalCase(schema.info.singularName);
  return `export function from${pname}Response(data: any): ${pname} & { id?: number } {
  if (is${pname}Response(data)) {
    return {
      id: data.id,
      ...data.attributes,
    } as ${pname} & { id?: number };
  } else if (is${pname}(data)) {
    return data as ${pname} & { id?: number };
  }
  return {};
}
`;
}

export function generateApiClient(strapiDir: string, outputDir: string) {
  return new Promise((resolve, reject) => {
    const docpath = outputDir + "/../openapi/openapi-doc.json";
    if (fs.existsSync(docpath)) {
      generateSource(docpath)
        .then((source) => {
          loadSchemas(`${strapiDir}/src/api`).then((schemas) => {
            const extraApi: string[] = [""];
            for (const schemaName in schemas) {
              if (Object.prototype.hasOwnProperty.call(schemas, schemaName)) {
                const schema = schemas[schemaName];
                extraApi.push(generateGuard(schema));
                extraApi.push(generateFromResponse(schema));
              }
            }
            saveAs(
              // format(
                source + extraApi.join("\n"),
              // ),
              outputDir + "/client.ts"
            ).then(() => {
              resolve(true);
            });
            fs.copyFile(
              "templates/apiResource.ts",
              outputDir + "/apiResource.ts",
              (err) => {
                if (err) throw err;
              }
            );
          });
        })
        .catch((err) => {
          reject(err);
        });
    }
  });
}
