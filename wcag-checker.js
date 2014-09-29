'use strict';
var spawn = require('child_process').spawn;
var fs = require('fs');
var JSON5 = require('./lib/json5');

var configuration = createConfiguration();

var totalErrors = 0,
	totalWarnings = 0,
	processCnt = 0;

// remove old results
rmdir(configuration.reportsDir);
fs.mkdirSync(configuration.reportsDir);

configuration.paths.forEach(function (path) {
	var url = configuration.baseUrl + path;
	var jsonResultsFileName = createFileName(path, 'raw', 'json');

	var phantom = launchPhantom(jsonResultsFileName, url);
	processCnt++;

	phantom.on('exit', function () {
		var jsonResultsText = fs.readFileSync(jsonResultsFileName, {
			encoding: 'utf8'
		});

		var resultsLines = jsonResultsText.split('\n');
		var warningResultsText = '';
		var errorResultsText = '';
		var errorCnt = 0,
			warningCnt = 0;
		resultsLines.forEach(function (entry) {
			if (!entry) {
				return;
			}
			var obj = JSON.parse(entry);
			if (obj[0] !== 'console') {
				return;
			}

			var msgSplit = obj[1].split('|');
			var line = '';

			if (isIgnored(msgSplit)) {
				return;
			}

			if (msgSplit[0] === 'WARNING') {
				line += ++warningCnt;
				totalWarnings++;
			} else if (msgSplit[0] === 'ERROR') {
				line += ++errorCnt;
				totalErrors++;
			} else {
				return;
			}

			line += '. ' + msgSplit[0] + ':\n';
			for (var i = 1; i < msgSplit.length; i++) {
				line += '\t' + msgSplit[i] + '\n';
			}
			if (msgSplit[0] === 'WARNING') {
				warningResultsText += line;
			} else if (msgSplit[0] === 'ERROR') {
				errorResultsText += line;
			}
		});

		if (warningCnt > 0) {
			var warningResultsFileName = createFileName(path, 'warnings', 'txt');
			fs.writeFileSync(warningResultsFileName, warningResultsText, {
				encoding: 'utf8'
			});
		}
		if (errorCnt > 0) {
			var errorResultsFileName = createFileName(path, 'errors', 'txt');
			fs.writeFileSync(errorResultsFileName, errorResultsText, {
				encoding: 'utf8'
			});
		}

		processCnt--;
		if (processCnt === 0) {
			console.log('Found %d warnings and %d errors', totalWarnings, totalErrors);
			process.exit(totalErrors);
		}
	});
});

function isIgnored(msgSplit) {
	var ignored;
	configuration.ignores.forEach(function (ignore) {
		if (ignore === msgSplit[1]) {
			ignored = true;
		}
	});
	return ignored;
}

function createFileName(path, dirName, extension) {
	var fullPath = configuration.reportsDir + dirName;

	if (!fs.existsSync(fullPath)) {
		fs.mkdirSync(fullPath);
	}

	var fileName = path.replace(/\//g, '_');
	return fullPath + '/' + fileName + '-wcag-results.' + extension;
}

function rmdir(path) {
	if (fs.existsSync(path)) {
		var files = fs.readdirSync(path);
		files.forEach(function (file) {
			var curPath = path + '/' + file;
			if (fs.lstatSync(curPath).isDirectory()) { // recurse
				rmdir(curPath);
			} else { // delete file
				fs.unlinkSync(curPath);
			}
		});
		fs.rmdirSync(path);
	}
}

function launchPhantom(jsonResultsFileName, url) {
	var childProcess = spawn('phantomjs', ['lib/bridge.js', jsonResultsFileName, url, JSON.stringify({
		accessibilityLevel: configuration.accessibilityLevel
	})]);
	childProcess.on('error', function(err) {
		if (err.code === 'ENOENT') {
			console.error('Error: Could not find "phantomjs" command. Make sure that phantomjs is on the PATH.');
		} else {
			throw err;
		}
	});
	return childProcess;
}

function createConfiguration() {
	var configurationFile = process.argv[2];

	if (!configurationFile) {
		console.error('Error: Must supply a configuration file. See README.md.');
		process.exit(-1);
	}

	var configurationText;
	try {
		configurationText = fs.readFileSync(configurationFile, {
			encoding: 'utf8'
		});
	} catch (e) {
		console.error('Error: Could not read configuration file %s.', configurationFile);
		process.exit(-1);
	}

	var configuration;
	try {
		configuration = JSON5.parse(configurationText);
	} catch(e) {
		console.error('Error: Invalid configuration file in %s', configurationFile);
		throw e;
	}

	if (!configuration.baseUrl) {
		console.error('Error: Must supply a baseUrl. See README.md.', configurationFile);
		process.exit(-1);
	}

	if (!configuration.reportsDir) {
		console.error('Error: Must supply a reportsDir. See README.md.', configurationFile);
		process.exit(-1);
	}

	if (!configuration.paths) {
		console.error('Error: Must supply paths. See README.md.', configurationFile);
		process.exit(-1);
	}

	if (configuration.paths.length === 0) {
		console.error('Error: Must supply at least one path. See README.md.', configurationFile);
		process.exit(-1);
	}

	if (!configuration.accessibilityLevel) {
		configuration.accessibilityLevel = 'WCAG2AA';
	}

	if (!configuration.ignores) {
		configuration.ignores = [];
	}

	return configuration;
}