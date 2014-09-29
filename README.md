# WCAG checker

This command line script generates WCAG 2.0 accessibility reports for a set of webpages.

To use:

1. [Install phantomjs](http://phantomjs.org/download.html)
2. Run command `node wcag-checker.js [configurationFile]`, where configurationFile is a file name in [json5](https://github.com/aseemk/json5) format that holds the configuration for accessibility reports.

Structure of the configuration file:

* baseUrl: The url to check
* reportsDir: The directory where to place resulting wcag reports
* paths: list of url paths to check
* accessibilityLevel: compliance level to use. Valid options are  WCAG2A, WCAG2AA (default), WCAG2AAA
* ignores: list of ignored compliance rules. To add more ignored rules, run the report once and copy/paste and unrelated rules

See `configuration/sample.json` for a sample configuration file.

reportsDirectory will be deleted at the start of each run and
replaced with the new reports.

# Kudos

* bridge.js : from the [grunt-accessibility](https://github.com/yargalot/grunt-accessibility) project
* HTMLCS.min.js : from the [HTML CodeSniffer](http://squizlabs.github.io/HTML_CodeSniffer/) project
* json5.js : from the [JSON5](https://github.com/aseemk/json5) project