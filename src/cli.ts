import minimist from "minimist";
import { genrateComponents } from "./component";
import { generateApiClient, generateOpenApiDoc } from "./openapi";

const args = minimist(process.argv.slice(2));

if (args._.length === 3) {
  const action = args._[0];
  const strapiDir = args._[1];
  const outputDir = args._[2];

  console.log(
    `Generating ${action}\n`,
    `\tStrapi directory : ${strapiDir}`,
    `\tOutput directory : ${outputDir}`
  );

  switch (action) {
    case "components":
      genrateComponents(strapiDir, outputDir);
      break;
    case "api-documentation":
      generateOpenApiDoc(strapiDir, outputDir);
      break;
    case "api":
      generateApiClient(strapiDir, outputDir);
      break;
    default:
      genrateComponents(strapiDir, `${outputDir}/src/components`);
      generateOpenApiDoc(strapiDir, `${outputDir}/openapi`).then(() => {
        generateApiClient(strapiDir, `${outputDir}/src`);
      });
      break;
  }
} else if (args.help === undefined) {
  console.error("your missing arguments");
  args.help = true;
}

if (args.help !== undefined) {
  console.log(
    `Usage: src/cli.js [action] [strapi-dir] [output-dir]
      Actions:
        components
        api-documentation
        api
        all (anything else will be considered all)
      Options:
        --help  Show help`
  );
}
