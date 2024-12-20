#!/usr/bin/env node

'use strict';

const { tmpdir } = require('os');
const { join } = require('path');
const { getBuildInfo, handleError } = require('./utils');
const addBuildInfoJSON = require('./build-release-locally-commands/add-build-info-json');
const buildArtifacts = require('./build-release-locally-commands/build-artifacts');
const confirmAutomatedTesting = require('./build-release-locally-commands/confirm-automated-testing');
const copyRepoToTempDirectory = require('./build-release-locally-commands/copy-repo-to-temp-directory');
const npmPackAndUnpack = require('./build-release-locally-commands/npm-pack-and-unpack');
const printPrereleaseSummary = require('./shared-commands/print-prerelease-summary');
const updateVersionNumbers = require('./build-release-locally-commands/update-version-numbers');
const fs = require('fs');

const run = async () => {
  try {
    const cwd = join(__dirname, '..', '..');
    const { branch, checksum, commit, reactVersion, version } = await getBuildInfo();
    const tempDirectory = join(tmpdir(), `react-${commit}`);
    
    // Log the build information for debugging
    console.log('Build Information:', { branch, checksum, commit, reactVersion, version });
    
    const params = { branch, checksum, commit, cwd, reactVersion, tempDirectory, version };

    // Check and create temp directory if necessary
    if (!fs.existsSync(tempDirectory)) {
      console.log(`Creating temp directory: ${tempDirectory}`);
      fs.mkdirSync(tempDirectory, { recursive: true });
    }

    // Run the build process steps
    await confirmAutomatedTesting(params);
    await copyRepoToTempDirectory(params);
    await updateVersionNumbers(params);
    await addBuildInfoJSON(params);
    await buildArtifacts(params);
    await npmPackAndUnpack(params);
    await printPrereleaseSummary(params, false);
  } catch (error) {
    handleError(error);
  }
};

run();
