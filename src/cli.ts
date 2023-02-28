import minimist from "minimist";
import { genrateComponents } from "./component";
import { generateOpenApiDoc } from "./openapi";


const args = minimist(process.argv.slice(2));

const action = args._[0];
const strapiDir = args._[1];
const outputDir = args._[2];

switch (action) {
  case "components":
    genrateComponents(strapiDir, outputDir);
    break;
  case "api-documentation":
    generateOpenApiDoc(strapiDir, outputDir);
    break;
  case "api":
    break;
  default:
    break;
}
