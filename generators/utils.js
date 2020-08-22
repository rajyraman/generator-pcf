const yosay = require("yosay");
const chalk = require("chalk");
const xml2js = require("xml2js");
const jsonpath = require("jsonpath");

module.exports = {
  checkPrerequisites,
  greeting,
  createResxFile
};

function checkPrerequisites(generator, skipMsBuild) {
  var paths = process.env.path.split(";");

  var msbuildFound = skipMsBuild;
  var pacFound = false;

  paths.forEach(path => {
    if (path.indexOf("PowerAppsCLI") !== -1) {
      pacFound = true;
    } else if (path.indexOf("MSBuild") !== -1) {
      msbuildFound = true;
    }
  });

  if (pacFound && msbuildFound) {
    generator.log(`Checking prerequisites ${chalk.green("OK")}\n`);
    return;
  }

  generator.log(`Checking prerequisites ${chalk.red("NOK")}`);

  if (!msbuildFound) {
    generator.log(chalk.yellow("\nWARNING"));
    generator.log(
      "MSBuild not found in your path variable. Please add it to proceed.\nIt's usually located at C:\\Users\\<YOUR_USER>\\AppData\\Local\\Microsoft\\PowerAppsCLI\\"
    );
  }

  if (!pacFound) {
    generator.log(chalk.yellow("\nWARNING"));
    generator.log(
      `Power Apps CLI not found in your path variable. Please add it to proceed.\nYou can download it from: https://aka.ms/PowerAppsCLI`
    );
  }

  process.exit(-1);
}

function greeting(generator) {
  generator.log(
    yosay(
      `Yo! Time to code this amazing ${chalk
        .hex("#752875")
        .bold("PCF")} control\nthat came to your mind!\n${chalk
        .hex("#0066FF")
        .bold(" #ProCodeNoCodeUnite")}`
    )
  );
}

function createResxFile(generator, controlName, lcid) {
  var templatePath = generator.templatePath().endsWith("resx\\templates")
    ? generator.templatePath("_sample.resx")
    : generator.templatePath("../../resx/templates/_sample.resx");

  generator.fs.copy(
    templatePath,
    generator.destinationPath(
      `${controlName}/strings/${controlName}.${lcid}.resx`
    )
  );

  var xmlParser = new xml2js.Parser();
  var parsedData;
  var isManifestCorrect = true;
  xmlParser.parseString(
    generator.fs.read(`${controlName}/ControlManifest.Input.xml`),
    function(err, result) {
      if (err) console.log(err);

      var resxSearchResult = jsonpath.query(
        result,
        `$..resx.*[?(@.path=='strings/${controlName}.${lcid}.resx')]`
      );

      if (resxSearchResult.toString() === "") {
        var resxNode = result.manifest.control[0].resources[0].resx;
        var resxObject = {
          $: {
            path: `strings/${controlName}.${lcid}.resx`,
            version: "1.0.0"
          }
        };

        if (resxNode == undefined) {
          result.manifest.control[0].resources[0].resx = resxObject;
        } else {
          result.manifest.control[0].resources[0].resx.push(resxObject);
        }

        const builder = new xml2js.Builder();
        parsedData = builder.buildObject(result);
        isManifestCorrect = false;
      } else {
        isManifestCorrect = true;
      }
    }
  );

  if (!isManifestCorrect) {
    generator.fs.write(`${controlName}/ControlManifest.Input.xml`, parsedData);
  }
}
