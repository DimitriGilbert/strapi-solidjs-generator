import fs from "fs";
import Eta from "eta";
import { camelCase, pascalCase, paramCase } from "change-case";
import {
  allbject,
  strapiSchema,
  strapiSchemaAttribute,
  loadSchemas,
  strapiTypeToTSType,
  renderUtils,
  saveAs,
} from "./utils";
import { format } from "prettier";

export function generateAttributeComponent(
  schema: strapiSchema,
  name: string,
  attribute: strapiSchemaAttribute,
  renderData: allbject = {}
) {
  return new Promise<string>((resolve, reject) => {
    fs.promises.realpath("templates/component.eta").then((path) => {
      try {
        let singularName = schema.info.singularName;
        // resolve(
        Eta.renderFile(path, {
          name: `${pascalCase(singularName + "-" + name)}`,
          props: [`${camelCase(singularName)}?:${pascalCase(singularName)}T`],
          propsUnion: ["ParentProps"],
          solidImports: ["ParentProps"],
          imports: [`{${pascalCase(singularName)}T}:../`],
          type: "Parent",
          content: "<div>{props.children}</div>",
          utils: renderUtils,
          ...renderData,
        }).then((etares) => {
          resolve(format(etares, { parser: "typescript" }));
        });
        // );
      } catch (e) {
        reject(e);
      }
    });
  });
}

export function attributeLabel(
  schema: strapiSchema,
  name: string,
  attribute: strapiSchemaAttribute
) {
  let input = "";
  switch (attribute.type) {
    case "uid":
    case "json":
    case "media":
    case "relation":
    case "boolean":
      break;
    case "date":
    case "time":
    case "datetime":
    case "timestamp":
    case "richtext":
    case "text":
    case "enumeration":
    case "email":
    case "password":
    case "string":
    default:
      input = `<Form.Label>${name}</Form.Label>`;
      break;
  }
  return input;
}

export function attributeInput(
  schema: strapiSchema,
  name: string,
  attribute: strapiSchemaAttribute
) {
  const inputName = `${pascalCase(schema.info.singularName + "-" + name)}`;
  let input = "";
  switch (attribute.type) {
    case "json":
    case "media":
    case "relation":
      break;
    case "date":
    case "time":
    case "datetime":
    case "timestamp":
      input = `<Form.Control type=\"date\" name=\"${inputName}\" value={${inputName}Value()} />`;
      break;
    case "boolean":
      input = `<Form.Checkbox name=\"${inputName}\" label=""${name} value={${inputName}Value()} />`;
      break;
    case "richtext":
    case "text":
      input = `<Form.Control as="textarea" name=\"${inputName}\" label=""${name} value={${inputName}Value()} />`;
      break;
    case "enumeration":
      input = `<span>TODO</span>`;
    case "email":
      input = `<Form.Control type=\"email\" name=\"${inputName}\" value={${inputName}Value()} />`;
      break;
    case "password":
      input = `<Form.Control type=\"password\" name=\"${inputName}\" value={${inputName}Value()} />`;
      break;
    case "string":
    case "uid":
    default:
      input = `<Form.Control type=\"text\" name=\"${inputName}\" value={${inputName}Value()} />`;
      break;
  }
  return input;
}

export function generateAttributeInputComponent(
  schema: strapiSchema,
  name: string,
  attribute: strapiSchemaAttribute,
  renderData: allbject = {}
) {
  return new Promise<string>((resolve, reject) => {
    fs.promises.realpath("templates/component.eta").then((path) => {
      const singN = schema.info.singularName;
      const componentName = pascalCase(singN + "-" + name);
      try {
        // resolve(
        Eta.renderFile(path, {
          name: `${componentName}Input`,
          props: [
            `${camelCase(singN)}?:${pascalCase(singN)}T`,
            "title?:string",
            "onChange?:Function",
          ],
          propsUnion: ["ParentProps"],
          solidImports: ["ParentProps", "createSignal"],
          imports: ["{ Form }:solid-bootstrap", `{${pascalCase(singN)}T}:../`],
          signals: [
            `${componentName}Value:props?.${camelCase(singN)}?.${name}`,
          ],
          type: "Parent",
          content: `
<Form.Group>
  <h3>{props.title}</h3>
  ${attributeLabel(schema, name, attribute)}
  ${attributeInput(schema, name, attribute)}
  {props.children}
</Form.Group>`,
          utils: renderUtils,
          ...renderData,
        }).then((etares) => {
          resolve(format(etares, { parser: "typescript" }));
        });
        // );
      } catch (e) {
        reject(e);
      }
    });
  });
}

export function generateSchemaFormComponent(
  schema: strapiSchema,
  renderData: allbject = {}
) {
  return new Promise<string>((resolve, reject) => {
    fs.promises.realpath("templates/component.eta").then((path) => {
      try {
        const singularName = schema.info.singularName;
        // resolve(
        Eta.renderFile(path, {
          name: `${pascalCase(singularName)}Form`,
          props: [
            "label?:string",
            "onChange?:Function",
            "value?:string",
            "hide?:string[]",
          ],
          propsUnion: ["ParentProps"],
          solidImports: ["ParentProps", "Show"],
          imports: ["{ Form }:solid-bootstrap"].concat(
            Object.keys(schema.attributes)
              .filter((name) => {
                return schema.attributes[name].type !== "relation";
              })
              .map((name) => {
                return `{ ${pascalCase(singularName + "-" + name)}Input }:./`;
              })
          ),
          type: "Parent",
          content: `
<form>
  ${Object.keys(schema.attributes)
    .filter((name) => {
      return schema.attributes[name].type !== "relation";
    })
    .map((name) => {
      return `<Show when={! props.hide?.includes("${name}")}>
      <${pascalCase(singularName + "-" + name)}Input />
    </Show>`;
    })
    .join("\n\t")}
  { props.children }
</form>`,
          utils: renderUtils,
          ...renderData,
        }).then((etares) => {
          resolve(format(etares, { parser: "typescript" }));
        });
        // );
      } catch (e) {
        reject(e);
      }
    });
  });
}

export function generateSchemaType(
  schema: strapiSchema,
  schemas: { [key: string]: strapiSchema }
) {
  let stype = `type ${pascalCase(schema.info.singularName)}Type = {\n`;
  Object.keys(schema.attributes).forEach((name) => {
    stype += `\t${name}: ${strapiTypeToTSType(
      schema.attributes[name].type,
      schemas,
      schema.attributes[name]
    )};\n`;
  });
  stype += "};";
  return stype;
}

export function generateSchemaImports(
  schema: strapiSchema,
  schemas: { [key: string]: strapiSchema }
) {
  let imp = "";
  Object.keys(schema.attributes).forEach((name) => {
    if (schema.attributes[name].type === "relation") {
      let iName = pascalCase(
        schema.attributes[name]?.target?.split(".")[1] || name
      );
      imp += `import { ${iName}, ${iName}List } from "../${iName}";\n
import { ${iName}T } from "../../client";\n`;
    } else {
      imp += `import { ${pascalCase(
        schema.info.singularName + "-" + name
      )} } from "./";\n`;
    }
  });
  return format(imp, { parser: "typescript" });
}

export function generateSchemaMainComponent(
  schema: strapiSchema,
  renderData: allbject = {}
) {
  return new Promise<string>((resolve, reject) => {
    fs.promises.realpath("templates/component.eta").then((path) => {
      try {
        const singularName = schema.info.singularName;
        const cName = camelCase(singularName);
        // resolve(
        Eta.renderFile(path, {
          name: `${pascalCase(singularName)}`,
          props: [`${cName}?:${pascalCase(singularName)}T`, "hide?:string[]"],
          propsUnion: ["ParentProps"],
          solidImports: ["ParentProps", "Show"],
          imports: [`{${pascalCase(singularName)}T}:../../client`],
          type: "Parent",
          content: `
<div class="${paramCase(singularName)}-container">
  ${Object.keys(schema.attributes)
    .filter((name) => {
      return schema.attributes[name].type !== "relation";
    })
    .map((name) => {
      return `<Show when={! props.hide?.includes("${name}") && props?.${cName}}>
      <${pascalCase(singularName + "-" + name)} ${cName}={props?.${cName}}>
        <>{ props.${cName}?.${name} }</>
      </${pascalCase(singularName + "-" + name)}>
    </Show>`;
    })
    .join("\n\t")}
{/* relations  */}
  ${Object.keys(schema.attributes)
    .filter((name) => {
      return schema.attributes[name].type === "relation";
    })
    .map((name) => {
      let relName = schema.attributes[name].target?.split(".")[1] || name;
      if (schema.attributes[name].relation === "oneToMany") {
        relName += "List";
      }
      return `<Show when={! props.hide?.includes("${name}")}>
      <${pascalCase(relName)} ${camelCase(
        relName
      )}={props?.${cName}?.${name}} />
    </Show>`;
    })
    .join("\n\t")}
  { props.children }
</div>`,
          utils: renderUtils,
          ...renderData,
        }).then((etares) => {
          resolve(format(etares, { parser: "typescript" }));
        });
        // );
      } catch (e) {
        reject(e);
      }
    });
  });
}

export function generateSchemaListComponent(
  schema: strapiSchema,
  renderData: allbject = {}
) {
  return new Promise<string>((resolve, reject) => {
    fs.promises.realpath("templates/component.eta").then((path) => {
      try {
        const singularName = schema.info.singularName;
        const pName = pascalCase(singularName);
        const cName = camelCase(singularName);
        const pluralName = schema.info.pluralName;
        const cpName = camelCase(pluralName);
        const ppname = pascalCase(pluralName);
        // resolve(
        Eta.renderFile(path, {
          name: `${pName}List`,
          props: [`${cpName}?:${pName}T[]`, "hide?:string[]"],
          propsUnion: ["ParentProps"],
          solidImports: ["ParentProps", "For", "createSignal"],
          imports: [`{${pName},${pName}T}:../../client`],
          signals: [`${cpName}:props?.${cpName}:${pName}T[]|undefined`],
          type: "Parent",
          content: `
<div class="${paramCase(singularName)}-list-container">
  <ul>
    <For each={${cpName}()}>{(${cName}Item) => 
      <li>
        <${pName} 
          ${cName}={${cName}Item}
          hide={props?.hide}
        />
      </li>}
    </For>
  </ul>
  { props.children }
</div>`,
          utils: renderUtils,
          ...renderData,
        }).then((etares) => {
          // Eta.renderFile(path, {
          //   name: `For${ppname}`,
          //   props: [`${cpName}?:${pName}T[]`],
          //   type: "Parent",
          //   noImports: true,
          // });
          resolve(format(etares, { parser: "typescript" }));
        });
        // );
      } catch (e) {
        reject(e);
      }
    });
  });
}

export function generateSchemaIndex(schema: strapiSchema) {
  let index: string[] = [];
  for (const attrName in schema.attributes) {
    if (Object.prototype.hasOwnProperty.call(schema.attributes, attrName)) {
      const attribute = schema.attributes[attrName];
      if (attribute.type !== "relation") {
        let pAttN = pascalCase(schema.info.singularName + "-" + attrName);
        index.push(`export { ${pAttN} } from "./Attributes/${pAttN}";`);
        index.push(
          `export { ${pAttN}Input } from "./Attributes/${pAttN}Input";`
        );
      }
    }
  }
  const pName = pascalCase(schema.info.singularName);
  index.push(`export { ${pName}Form } from "./${pName}Form";`);
  index.push(`export { ${pName}List } from "./${pName}List";`);
  index.push(`export { ${pName} } from "./${pName}";`);
  return format(index.join("\n"), { parser: "typescript" });
}

export function generateComponents(strapiDir: string, outputDir: string) {
  loadSchemas(`${strapiDir}/src/api`).then((schemas) => {
    for (const name in schemas) {
      if (Object.prototype.hasOwnProperty.call(schemas, name)) {
        const schema = schemas[name];
        const pName = pascalCase(schema.info.singularName);
        // index
        saveAs(generateSchemaIndex(schema), `${outputDir}/${pName}/index.tsx`);
        // main
        generateSchemaMainComponent(schema, {
          preCode: `${generateSchemaImports(schema, schemas)}
  export ${generateSchemaType(schema, schemas)}
  `,
        }).then((component) => {
          saveAs(component, `${outputDir}/${pName}/${pName}.tsx`);
        });
        // list
        generateSchemaListComponent(schema).then((component) => {
          saveAs(component, `${outputDir}/${pName}/${pName}List.tsx`);
        });
        // form
        generateSchemaFormComponent(schema).then((component) => {
          saveAs(component, `${outputDir}/${pName}/${pName}Form.tsx`);
        });
        // attributes
        for (const attr in schema.attributes) {
          if (Object.prototype.hasOwnProperty.call(schema.attributes, attr)) {
            if (schema.attributes[attr].type !== "relation") {
              let pAttName = pascalCase(schema.info.singularName + "-" + attr);
              // attribute component
              generateAttributeComponent(
                schema,
                attr,
                schema.attributes[attr]
              ).then((component) => {
                saveAs(
                  component,
                  `${outputDir}/${pName}/Attributes/${pAttName}.tsx`
                );
              });
              // attribute input component
              generateAttributeInputComponent(
                schema,
                attr,
                schema.attributes[attr]
              ).then((component) => {
                saveAs(
                  component,
                  `${outputDir}/${pName}/Attributes/${pAttName}Input.tsx`
                );
              });
            }
          }
        }
      }
    }
  });
}
