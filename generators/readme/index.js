"use strict";
const Generator = require("yeoman-generator");
const chalk = require("chalk");
const xml2js = require("xml2js");
const { getUsedLcids, getTranslations } = require("../utils");

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);

    this.argument("controlName", { type: String, required: false });

    this.option("githubUsername", {
      type: String,
      desc: "GitHub username",
      required: false,
      alias: "gu"
    });

    this.option("repositoryName", {
      type: String,
      desc: "GitHub repository",
      required: false,
      alias: "gr"
    });

    this.option("lcid", {
      type: String,
      description: "Language Code ID",
      required: false,
      alias: "lc"
    });
  }

  prompting() {
    this.controlName =
      this.config.get("controlName") || this.options.controlName;

    if (this.controlName === undefined) {
      this.log(chalk.yellow("\nWARNING"));
      this.log(
        `Control name not found! Please specify the 'controlName' argument.`
      );
      process.exit(-1);
    }

    let locales = require("../lcid.json");
    let usedLcids = getUsedLcids(this, this.controlName);

    const filterLocales = (usedLcids, locales) =>
      locales.filter(locale => {
        var lcid = locale.value.toString();
        return usedLcids.includes(lcid);
      });

    let localeChoices = filterLocales(usedLcids, locales);

    const prompts = [
      {
        type: "input",
        name: "githubUsername",
        message: "GitHub username",
        default: "DynamicsNinja",
        when: !this.options.githubUsername,
        store: true
      },
      {
        type: "input",
        name: "repositoryName",
        message: "GitHub repository",
        default: "PCF-Clipboard-Control",
        when: !this.options.repositoryName
      },
      {
        type: "list",
        name: "lcid",
        message: "Which language would you like to use?",
        choices: localeChoices,
        when: !this.options.lcid && localeChoices.length > 0
      }
    ];

    return this.prompt(prompts).then(props => {
      this.githubUsername = this.options.githubUsername || props.githubUsername;
      this.repositoryName = this.options.repositoryName || props.repositoryName;
      this.lcid = this.options.lcid || props.lcid || "0";
    });
  }

  writing() {
    var controlDisplayName = "";
    var controlDescription = "";
    var properties = [];
    var translations = getTranslations(this, this.controlName, this.lcid);

    var xmlParser = new xml2js.Parser();
    xmlParser.parseString(
      this.fs.read(`${this.controlName}/ControlManifest.Input.xml`),
      function(err, result) {
        if (err) console.log(err);

        controlDisplayName =
          translations[result.manifest.control[0].$["display-name-key"]] ||
          result.manifest.control[0].$["display-name-key"];
        controlDescription =
          translations[result.manifest.control[0].$["description-key"]] ||
          result.manifest.control[0].$["description-key"];

        result.manifest.control[0].property.forEach(element => {
          properties.push({
            name:
              translations[element.$["display-name-key"]] ||
              element.$["display-name-key"],
            desc:
              translations[element.$["description-key"]] ||
              element.$["description-key"],
            default: element.$["default-value"],
            required: element.$.required || "false"
          });
        });
      }
    );

    this.fs.copyTpl(
      this.templatePath("_README.md"),
      this.destinationPath("README.md"),
      {
        controlName: controlDisplayName,
        controlDescription: controlDescription,
        props: properties,
        repo: this.repositoryName,
        githubUsername: this.githubUsername
      }
    );
  }
};
