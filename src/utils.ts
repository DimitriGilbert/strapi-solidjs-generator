import fs from "fs";
import { camelCase, pascalCase, paramCase, capitalCase } from "change-case";
import path from "path";
import { OpenAPIV3 } from "openapi-types";

export type allbject = { [key: string]: string };
export type strapiSchema = {
  kind: string;
  collectionName: string;
  attributes: {
    [key: string]: strapiSchemaAttribute;
  };
  info: {
    singularName: string;
    pluralName: string;
    displayName: string;
  };
};

export type strapiSchemaAttribute = {
  type: string;
  relation?: string;
  target?: string;
};

export function loadSchemas(
  path: string
): Promise<{ [key: string]: strapiSchema }> {
  return new Promise((resolve, reject) => {
    const schemas: { [key: string]: any } = {};

    fs.promises
      .readdir(`${path}`, {
        withFileTypes: true,
      })
      .then((files) => {
        let fp: Promise<void | allbject>[] = [];
        files.forEach((file) => {
          if (file.isDirectory()) {
            fp.push(
              fs.promises
                .readFile(
                  `${path}/${file.name}/content-types/${file.name}/schema.json`
                )
                .then((schema) => {
                  let ret: allbject = {};
                  ret[`${file.name}`] = JSON.parse(schema.toString());
                  return ret;
                })
                .catch((err) => {
                  reject(err);
                })
            );
          }
        });
        Promise.all(fp).then((aSchemas) => {
          aSchemas.forEach((schema) => {
            Object.assign(schemas, schema);
          });
          resolve(schemas);
        });
      })
      .catch((err) => {
        reject(err);
      });
  });
}
export function loadSchemasPaths(
  path: string
): Promise<{ [key: string]: OpenAPIV3.PathItemObject }> {
  return new Promise((resolve, reject) => {
    const paths: { [key: string]: OpenAPIV3.PathItemObject } = {};

    fs.promises
      .readdir(`${path}`, {
        withFileTypes: true,
      })
      .then((files) => {
        let fp: Promise<void | allbject>[] = [];
        files.forEach((file) => {
          if (file.isDirectory()) {
            fp.push(
              fs.promises
                .readFile(
                  `${path}/${file.name}/documentation/1.0.0/${file.name}.json`
                )
                .then((path) => {
                  let ret: allbject = JSON.parse(path.toString());
                  // ret[`${file.name}`] = JSON.parse(path.toString());
                  return ret;
                })
                .catch((err) => {
                  reject(err);
                })
            );
          }
        });
        Promise.all(fp).then((apaths) => {
          apaths.forEach((path) => {
            Object.assign(paths, path);
          });
          resolve(paths);
        });
      })
      .catch((err) => {
        reject(err);
      });
  });
}

export const renderUtils = {
  camelCase,
  pascalCase,
  paramCase,
  capitalCase,
};

export function strapiTypeToTSType(
  type: string,
  schemas?: { [key: string]: strapiSchema },
  schemaAttribute?: strapiSchemaAttribute
): string {
  switch (type) {
    case "enumeration":
      return "unknown";
    case "timestamp":
    case "number":
      return "number";
    case "relation":
      if (schemas && schemaAttribute) {
        let tgt = schemaAttribute.target?.split(".")[1];
        if (tgt && Object.prototype.hasOwnProperty.call(schemas, tgt)) {
          switch (schemaAttribute.relation) {
            case "manyToOne":
              return `${pascalCase(schemas[tgt].info.singularName)}T`;
            case "oneToMany":
            default:
              return `${pascalCase(schemas[tgt].info.singularName)}T[]`;
          }
        }
      }
    case "json":
      return "{[key:string]:unknown}";
    case "date":
    case "time":
    case "datetime":
      return "Date";
    case "boolean":
      return "boolean";
    case "string":
    case "text":
    case "richtext":
    case "email":
    case "media":
    case "password":
    case "uid":
    default:
      return "string";
  }
}

export function getAttributeTargetPascal(
  attribute: strapiSchemaAttribute,
  schemas: { [key: string]: strapiSchema },
  def: string = ""
): string {
  return pascalCase(
    schemas[attribute.target?.split(".")[1] || def]?.info.singularName || def
  );
}
export async function saveAs(content: string | Buffer, file: string) {
  if (!fs.existsSync(path.dirname(file))) {
    await fs.promises.mkdir(path.dirname(file), { recursive: true });
  }
  if (fs.existsSync(file)) {
    await fs.promises.cp(file, file + ".bak");
  }
  return fs.promises.writeFile(file, content);
}
