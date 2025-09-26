'use strict';

import path = require('path');
import tl = require('azure-pipelines-task-lib/task');
import trm = require('azure-pipelines-task-lib/toolrunner');

function mkTempFile(): string {
  return '.tmp-command-rl-scanner-cloud.sh';
}

function getInput(what: string, use?: string): string | undefined {
  const value: string | undefined = tl.getInput(what); // the second parameter enforces required
  if (value === undefined || value.length === 0) {
    if (use !== undefined) {
      return use;
    }
    tl.setResult(tl.TaskResult.Failed, `You must specify a value for: ${what}`);
    return undefined;
  }
  // force error on suspicious characters
  for (const ch of '<>|`$;&') {
    if (value.indexOf(ch) !== -1) {
      tl.setResult(
        tl.TaskResult.Failed,
        `the value of ${what} contains a forbidden character: ${ch}`
      );
      return undefined;
    }
  }
  return value;
}

function getVariable(what: string): string {
  const value: string | undefined = tl.getVariable(what);
  if (value === undefined || value.length === 0) {
    throw new Error(`You must define the ${what} environmental variable.`);
  }
  return value;
}
async function run() {
  try {
    tl.setResourcePath(path.join(__dirname, 'task.json'));
    //This only works on linux or MacOs Agents
    if (tl.getPlatform() === tl.Platform.Windows) {
      throw new Error('This task does not work on windows as it needs docker.');
    }

    let RL_VERBOSE: string | undefined = getInput('RL_VERBOSE', '0');
    if (RL_VERBOSE !== '0') {
      RL_VERBOSE = '1';
    }
    let RL_FORCE: string | undefined = getInput('RL_FORCE', '0');
    if (RL_FORCE !== '0') {
      RL_FORCE = '1';
    }
    const RL_DIFF_WITH: string | undefined = getInput('RL_DIFF_WITH', '');
    const RLSECURE_PROXY_SERVER: string | undefined = getInput(
      'RLSECURE_PROXY_SERVER',
      ''
    );
    const RLSECURE_PROXY_PORT: string | undefined = getInput(
      'RLSECURE_PROXY_PORT',
      ''
    );
    const RLSECURE_PROXY_USER: string | undefined = getInput(
      'RLSECURE_PROXY_USER',
      ''
    );
    // passwords may actually containg problematic chars
    const RLSECURE_PROXY_PASSWORD: string | undefined = tl.getInput(
      'RLSECURE_PROXY_PASSWORD',
      false
    );

    // get input parameters RLPORTAL_SERVER, RLPORTAL_ORG, RLPORTAL_GROUP, RL_PACKAGE_URL
    const RLPORTAL_SERVER: string | undefined = getInput('RLPORTAL_SERVER');
    if (RLPORTAL_SERVER === undefined) {
      return;
    }

    const RLPORTAL_ORG: string | undefined = getInput('RLPORTAL_ORG');
    if (RLPORTAL_ORG === undefined) {
      return;
    }

    const RLPORTAL_GROUP: string | undefined = getInput('RLPORTAL_GROUP');
    if (RLPORTAL_GROUP === undefined) {
      return;
    }

    const RL_PACKAGE_URL: string | undefined = getInput('RL_PACKAGE_URL');
    if (RL_PACKAGE_URL === undefined) {
      return;
    }

    // get input parameters MY_ARTIFACT_TO_SCAN, REPORT_PATH, BUILD_PATH
    const MY_ARTIFACT_TO_SCAN: string | undefined = getInput(
      'MY_ARTIFACT_TO_SCAN'
    );
    if (MY_ARTIFACT_TO_SCAN === undefined) {
      return;
    }

    const REPORT_PATH: string | undefined = getInput('REPORT_PATH');
    if (REPORT_PATH === undefined) {
      return;
    }

    const BUILD_PATH: string | undefined = getInput('BUILD_PATH');
    if (BUILD_PATH === undefined) {
      return;
    }

    getVariable('RLPORTAL_ACCESS_TOKEN'); // jsut verify, pass via the env

    const fileName = mkTempFile();
    // ${name} in a back quoted string is used by ts to replace vars, so this is not bash here.
    const command = `#! /usr/bin/env bash
#
prep_report_dir()
{
  if [ -d "./${REPORT_PATH}" ]
  then
    rmdir "./${REPORT_PATH}"
  fi
  mkdir -p "./${REPORT_PATH}"  # make sure it is not created by docker
}
do_verbose()
{
  if [ "${RL_VERBOSE}" == "1" ]
  then
    echo "
RLPORTAL_SERVER:         ${RLPORTAL_SERVER}
RLPORTAL_ORG:            ${RLPORTAL_ORG}
RLPORTAL_GROUP:          ${RLPORTAL_GROUP}
RL_PACKAGE_URL:          ${RL_PACKAGE_URL}
BUILD_PATH:              ${BUILD_PATH}
MY_ARTIFACT_TO_SCAN:     ${MY_ARTIFACT_TO_SCAN}
RL_DIFF_WITH:            ${RL_DIFF_WITH}
RL_FORCE:                ${RL_FORCE}
REPORT_PATH:             ${REPORT_PATH}
RLSECURE_PROXY_SERVER:   ${RLSECURE_PROXY_SERVER}
RLSECURE_PROXY_PORT:     ${RLSECURE_PROXY_PORT}
RLSECURE_PROXY_USER:     ${RLSECURE_PROXY_USER}
"
    ls -l "$( realpath ./${BUILD_PATH} )/${MY_ARTIFACT_TO_SCAN}"
  fi
}
prep_force()
{
  if [ "${RL_FORCE}" != "" ]
  then
    RL_FORCE="--force"
  fi
}
prep_diff_with()
{
  if [ "${RL_DIFF_WITH}" != "" ]
  then
    RL_DIFF_WITH="--diff-with ${RL_DIFF_WITH}"
  fi
}
prep_proxy()
{
    WITH_PROXY=""
    if [ ! -z "${RLSECURE_PROXY_SERVER}" ]
    then
        export RLSECURE_PROXY_SERVER
        WITH_PROXY="-e RLSECURE_PROXY_SERVER "
    fi
    if [ ! -z "${RLSECURE_PROXY_PORT}" ]
    then
        export RLSECURE_PROXY_PORT
        WITH_PROXY="-e RLSECURE_PROXY_PORT "
    fi
    if [ ! -z "${RLSECURE_PROXY_USER}" ]
    then
        export RLSECURE_PROXY_USER
        WITH_PROXY="-e RLSECURE_PROXY_USER "
    fi
    if [ ! -z "${RLSECURE_PROXY_PASSWORD}" ]
    then
        export RLSECURE_PROXY_PASSWORD
        WITH_PROXY="-e RLSECURE_PROXY_PASSWORD "
    fi
}
do_scan()
{
  set -x
  docker run \
    --rm -u $(id -u):$(id -g) \
    -v "$( realpath ./${BUILD_PATH} ):/packages:ro" \
    -v "$( realpath ./${REPORT_PATH} ):/report" \
    -e RLPORTAL_ACCESS_TOKEN \
    $WITH_PROXY \
    reversinglabs/rl-scanner-cloud:latest \
      rl-scan \
        --replace \
        --rl-portal-server="${RLPORTAL_SERVER}" \
        --rl-portal-org="${RLPORTAL_ORG}" \
        --rl-portal-group="${RLPORTAL_GROUP}" \
        --purl="${RL_PACKAGE_URL}" \
        --file-path="/packages/${MY_ARTIFACT_TO_SCAN}" \
        --report-path="/report" \
        --report-format="all" --pack-safe $RL_DIFF_WITH $RL_FORCE
  RR=$?
  set +x
}
main()
{
  prep_report_dir
  do_verbose
  prep_force
  prep_diff_with
  do_scan
  exit $RR
}
main
`;

    console.log('# todo: bash: ', command);
    tl.writeFile(`${fileName}`, command);
    await testBash(`${fileName}`);
  } catch (err) {
    if (err instanceof Error) {
      tl.setResult(tl.TaskResult.Failed, err.message);
    } else {
      console.log('Unexpected error', err);
    }
    return;
  }
}

async function testBash(command: string): Promise<void> {
  try {
    const bash: trm.ToolRunner = tl.tool(tl.which('bash', true));
    bash.arg(command);
    await bash.exec();
    return tl.setResult(tl.TaskResult.Succeeded, 'Bash');
  } catch (err) {
    if (err instanceof Error) {
      tl.setResult(tl.TaskResult.Failed, err.message);
    } else {
      console.log('Unexpected error', err);
    }
  }
}

run();
