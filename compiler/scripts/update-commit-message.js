/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * INSTALLATION:
 *   - `$ npm install octokit
 *   - Get a token from https://github.com/settings/tokens for use in the command below,
 *     set the token value as the GITHUB_AUTH_TOKEN environment variable
 *
 *  USAGE:
 *   - $ GITHUB_AUTH_TOKEN="..." git filter-branch -f --msg-filter "node update-commit-message.js" 2364096862b72cf4d801ef2008c54252335a2df9..HEAD
 */

const { Octokit } = require('octokit');
const fs = require('fs');

const OWNER = 'facebook';
const REPO = 'react-forget';
const octokit = new Octokit({ auth: process.env.GITHUB_AUTH_TOKEN });

if (!process.env.GITHUB_AUTH_TOKEN) {
  console.error("Error: GITHUB_AUTH_TOKEN environment variable is not set.");
  process.exit(1);
}

async function fetchPullRequest(pullNumber) {
  try {
    const response = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
      owner: OWNER,
      repo: REPO,
      pull_number: pullNumber,
      headers: { 'X-GitHub-Api-Version': '2022-11-28' },
    });
    return { body: response.data.body, title: response.data.title };
  } catch (e) {
    console.error("Error fetching pull request:", e);
    return null;
  }
}

function formatCommitMessage(str) {
  const trimmedStr = str.replace(/(\r\n|\n|\r)/gm, ' ').trim();
  if (!trimmedStr) return '';

  const words = trimmedStr.split(' ');
  let line = '';
  return words.reduce((formattedStr, word) => {
    if ((line + word).length <= 80) {
      line += word + ' ';
    } else {
      formattedStr += line + '\n';
      line = word + ' ';
    }
    return formattedStr;
  }, '') + line;
}

function cleanMessage(msg) {
  const patternsToRemove = [
    /^Stack from /,
    /^\* #\d+/,
    /^\* __->__ #\d+/,
  ];

  for (const pattern of patternsToRemove) {
    if (pattern.test(msg)) return null;
  }

  return formatCommitMessage(msg);
}

function filterMsg(response) {
  const { body, title } = response;
  const msgs = body.split('\n\n').flatMap(x => x.split('\r\n'));

  const newMessage = [title];

  msgs.forEach(msg => {
    const cleanedMsg = cleanMessage(msg);
    if (cleanedMsg) {
      newMessage.push(cleanedMsg);
    }
  });

  return newMessage.join('\n\n');
}

function parsePullRequestNumber(text) {
  if (!text) return null;

  const prNumberRegex = /(?:https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/(\d+)|\(#(\d+)\))/;
  const match = text.match(prNumberRegex);
  return match ? match[1] || match[2] : null;
}

async function fetchAndUpdateCommitMessage(pr) {
  return fetchPullRequest(pr)
    .then(response => {
      if (!response.body) return null;
      return filterMsg(response);
    })
    .catch(e => {
      console.error("Error fetching pull request:", e);
      return null;
    });
}

async function main() {
  const data = fs.readFileSync(0, 'utf-8');
  const pr = parsePullRequestNumber(data);

  if (pr) {
    const newMessage = await fetchAndUpdateCommitMessage(pr);
    if (newMessage) {
      console.log(newMessage);
    } else {
      console.log(data);
    }
  } else {
    console.log("No pull request number found.");
    console.log(data);
  }
}

main();
