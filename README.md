# rl-scanner-cloud extension for Azure DevOps Pipelines

ReversingLabs provides the official extension in
[Azure Marketplace](https://marketplace.visualstudio.com/) for
[Azure DevOps Pipelines](https://learn.microsoft.com/en-us/azure/devops/pipelines/get-started/what-is-azure-pipelines?view=azure-devops)
to enable faster and easier integration of the
[ReversingLabs Spectra Assure Portal](https://docs.secure.software/portal/integrations/)
solution in CI/CD workflows.

The extension provided in this repository is called `rl-scanner-cloud-task`.
It uses the official
[ReversingLabs rl-scanner-cloud Docker image](https://hub.docker.com/r/reversinglabs/rl-scanner-cloud)
to scan a single build artifact with the Spectra Assure Portal,
generate the analysis report, and display the analysis status.

The `rl-scanner-cloud-task` extension is most suitable for experienced users who want to integrate the Spectra Assure Portal with their existing Azure DevOps pipelines.

**To successfully work with the extension, you should:**

- Understand the basic [Azure DevOps Pipelines concepts](https://learn.microsoft.com/en-us/azure/devops/pipelines/get-started/key-pipelines-concepts?view=azure-devops)

- Define the `RLPORTAL_ACCESS_TOKEN` secret environment variable to store your [Portal access token](https://docs.secure.software/api/generate-api-token).

- Add the extension in Azure DevOps on the Organization level, for example: `https://dev.azure.com/your-Azure-organization-name/_settings/extensions`


## What is ReversingLabs Spectra Assure Portal?

The Spectra Assure Portal is a SaaS solution that's part of the Spectra Assure platform - a new ReversingLabs solution for software supply chain security.
More specifically, the Portal is a web-based application for improving and managing the security of your software releases and verifying third-party software used in your organization.

With the Portal, you can:


- Scan your software packages to detect potential risks before release.
- Improve your SDLC by applying actionable advice from security scan reports to all phases of software development.
- Organize your software projects and automatically compare package versions to detect potentially dangerous behavior changes in the code.
- Manage software quality policies on the fly to ensure compliance and achieve maturity in your software releases.


ReversingLabs Spectra Assure Portal is capable of scanning
[nearly any type](https://docs.secure.software/concepts/language-coverage)
of software artifact or package that results from a build.


## How this extension works

This extension relies on user-specified [extension parameters](#parameters) to:

- create a directory for analysis reports
- use the `rl-scanner-cloud-task` Azure extension to scan a single build artifact with the Spectra Assure Portal
- place the analysis reports into the previously created directory and optionally publish them as pipeline artifacts
- output the scan result as a build status message.

The extension is intended to be used in the `test` stage of a standard build-test-deploy pipeline.
It expects that the build artifact is produced in a previous stage
and requires specifying the location of the artifact with the `BUILD_PATH` parameter.
The path must be relative to `$(System.DefaultWorkingDirectory)`.

Analysis reports generated by the Spectra Assure Portal
after scanning the artifact are saved to the location specified with the `REPORT_PATH` parameter.
The reports are always created regardless of the scan result (pass or fail).


### Requirements

1. **An [Azure DevOps Services account](https://learn.microsoft.com/en-us/azure/devops/pipelines/get-started/pipelines-sign-up?view=azure-devops)**
to create an Azure DevOps organization and use Azure Pipelines.
If you're already in an Azure DevOps organization,
make sure you can access the Azure DevOps project where you want to use this extension.

2. **[Install the extension](https://learn.microsoft.com/en-us/azure/devops/marketplace/install-extension?view=azure-devops&tabs=browser)** from the Azure Marketplace.

3. **An [Azure Pipelines agent with the Docker capability enabled](https://learn.microsoft.com/en-us/azure/devops/pipelines/agents/agents?view=azure-devops&tabs=yaml%2Cbrowser)**.
The example pipeline in this repository runs on a Microsoft-hosted agent using the `ubuntu-latest` VM image.

4. **A valid Spectra Assure Portal Access Token**.
The extension requires that you define the `RLPORTAL_ACCESS_TOKEN` secret environment variable to store your
[Portal access token](https://docs.secure.software/api/generate-api-token).


## How to use this extension

The most common use-case for this extension
is to include it in the "test" stage of an existing pipeline,
after the build artifact you want to scan has been created.

See the [Examples](###examples) section below.

1. Make sure your Portal access token `RLPORTAL_ACCESS_TOKEN`
is configured as a secret in your Azure DevOps organization.
Add it as a
[variable group](https://learn.microsoft.com/en-us/azure/devops/pipelines/process/set-secret-variables?view=azure-devops&tabs=yaml%2Cbash)
to your pipeline like in the following example:

        variables:
        - group: rl-scanner-cloud


### Parameters

The following extension parameters can be modified in the pipeline.

**Environment**

The following secrets **must** be passed via `env:`

&nbsp;

| Parameter name          | Required | Type    | Description |
| ---------               | ------   | ------  | ------      |
| `RLPORTAL_ACCESS_TOKEN` | **Yes** | string | A Personal Access Token for authenticating requests to the Spectra Assure Portal. Before you can use this extension, you must [create the token](https://docs.secure.software/api/generate-api-token) in your Portal settings. Tokens can expire and be revoked, in which case you'll have to update this value. Define it as a secret in a group `rl-scanner-cloud` |


**Inputs**

The following paramaters **must** be passed via `inputs:`

&nbsp;

| Parameter name          | Required | Type    | Description |
| ---------               | ------   | ------  | ------      |
| `RLPORTAL_SERVER`       | **Yes** | string | Name of the Spectra Assure Portal instance to use for the scan. The Portal instance name usually matches the subdirectory of `my.secure.software` in your Portal URL. For example, if your portal URL is `my.secure.software/demo`, the instance name to use with this parameter is `demo`. |
| `RLPORTAL_ORG`          | **Yes** | string | Name of the Spectra Assure Portal organization to use for the scan. The organization must exist on the Portal instance specified with `RLPORTAL_SERVER`. The user account authenticated with the token must be a member of the specified organization and have the appropriate permissions to upload and scan a file. Organization names are case-sensitive. |
| `RLPORTAL_GROUP`        | **Yes** | string | Name of the Spectra Assure Portal group to use for the scan. The group must exist in the Portal organization specified with `RLPORTAL_ORG`. Group names are case-sensitive. |
| `RL_PACKAGE_URL`        | **Yes** | string | The package URL (purl) used to associate the file with a project and package on the Portal. Package URLs are unique identifiers in the format `[pkg:type/]<project></package><@version>`. When scanning a file, you must assign a package URL to it, so that it can be placed into the specified project and package as a version. If the project and package you specified don't exist in the Portal, they will be automatically created.  |
| `BUILD_PATH`            | **Yes** | string | The directory where the build artifact specified with the `MY_ARTIFACT_TO_SCAN` parameter is located. The path must be relative to `$(System.DefaultWorkingDirectory)`. **The default value is `.`** |
| `MY_ARTIFACT_TO_SCAN`   | **Yes** | string | The name of the file you want to scan. Must be relative to `BUILD_PATH`. The file must exist in the specified location before the scan starts. |
| `REPORT_PATH`           | No      | string | The directory where analysis reports will be stored after the scan is finished. The path must be relative to `$(System.DefaultWorkingDirectory)`. The directory must be empty before the scan starts. **The default value is `RlReport`** |
| `RL_DIFF_WITH`          | No      | string | Use this parameter to specify a previously scanned version of the artifact to compare (diff) against. The previous version must exist in the same project and package as the scanned artifact. Only the `version` part of the package URL needs to specified. |
| `RLSECURE_PROXY_SERVER` | No      | string | Server name for optional proxy configuration (IP address or DNS name). |
| `RLSECURE_PROXY_PORT`   | No      | string | Network port on the proxy server for optional proxy configuration. Required if RLSECURE_PROXY_SERVER is used. |
| `RLSECURE_PROXY_USER`   | No      | string | User name for proxy authentication. |
| `RLSECURE_PROXY_PASSWORD` | No      | string | Password for proxy authentication. Required if RLSECURE_PROXY_USER is used. |
| `RL_VERBOSE`            | No      | string | Includes detailed progress feedback into the pipeline output. **The default value is `0`**; the option is disabled by default. Any value other than `0` enables this option. |


**Note:** All optional string parameters have a default empty string value and do not have to be specified if not used.

## Examples

### Basic scan

The `azure-pipelines.yml` file in this repository is an example of a basic Azure DevOps pipeline that uses this extension to scan a build artifact.

      trigger:
        - main

      pool:
        vmImage: 'ubuntu-latest'

      variables:
      - group: rl-scanner-cloud
      - name: RLPORTAL_SERVER
        value: test
      - name: RLPORTAL_ORG
        value: Test
      - name: RLPORTAL_GROUP
        value: Default
      - name: RL_PACKAGE_URL
        value: testProject/testPackage@t1.0.0
      - name: BUILD_PATH
        value: '.'
      - name: MY_ARTIFACT_TO_SCAN
        value: 'README.md'
        # value: 'eicarcom2.zip'
      - name: REPORT_PATH
        value: 'report'

      steps:

      - task: rl-scanner-cloud-task@1
        displayName: rl-scanner-cloud-task
        inputs:
          RLPORTAL_SERVER: $(RLPORTAL_SERVER)
          RLPORTAL_ORG: $(RLPORTAL_ORG)
          RLPORTAL_GROUP: $(RLPORTAL_GROUP)
          RL_PACKAGE_URL: $(RL_PACKAGE_URL)
          BUILD_PATH: $(BUILD_PATH)
          MY_ARTIFACT_TO_SCAN: $(MY_ARTIFACT_TO_SCAN)
          REPORT_PATH: $(REPORT_PATH)
        env:
          RLPORTAL_ACCESS_TOKEN: $(RLPORTAL_ACCESS_TOKEN)


### Scan and upload analysis reports

The `azure-pipelines-with-upload.yml` file in this repository is an example of an Azure DevOps pipeline that uses this extension to scan a build artifact and upload the analysis reports to the pipeline.

      trigger:
        - main

      pool:
        vmImage: 'ubuntu-latest'

      variables:
      - group: rl-scanner-cloud
      - name: RLPORTAL_SERVER
        value: test
      - name: RLPORTAL_ORG
        value: Test
      - name: RLPORTAL_GROUP
        value: Default
      - name: RL_PACKAGE_URL
        value: testProject/testPackage@t1.0.0
      - name: BUILD_PATH
        value: '.'
      - name: MY_ARTIFACT_TO_SCAN
        value: 'README.md'
        # value: 'eicarcom2.zip'
      - name: REPORT_PATH
        value: 'report'
      - name: RL_VERBOSE
        value: '1'

      steps:

      - task: rl-scanner-cloud-task@1
        displayName: rl-scanner-cloud-task
        inputs:
          RLPORTAL_SERVER: $(RLPORTAL_SERVER)
          RLPORTAL_ORG: $(RLPORTAL_ORG)
          RLPORTAL_GROUP: $(RLPORTAL_GROUP)
          RL_PACKAGE_URL: $(RL_PACKAGE_URL)
          BUILD_PATH: $(BUILD_PATH)
          MY_ARTIFACT_TO_SCAN: $(MY_ARTIFACT_TO_SCAN)
          REPORT_PATH: $(REPORT_PATH)
        env:
          RLPORTAL_ACCESS_TOKEN: $(RLPORTAL_ACCESS_TOKEN)


      - publish: $(System.DefaultWorkingDirectory)/$(REPORT_PATH)/report.cyclonedx.json
        displayName: 'Publish CycloneDX'
        artifact: 'CycloneDX-SBOM'
        condition: succeededOrFailed()

      - publish: $(System.DefaultWorkingDirectory)/$(REPORT_PATH)/report.spdx.json
        displayName: 'Publish SPDX'
        artifact: 'SPDX-SBOM'
        condition: succeededOrFailed()

      - publish: $(System.DefaultWorkingDirectory)/$(REPORT_PATH)/report.rl.json
        displayName: 'Publish RL-json'
        artifact: ReversingLabs-JSONreport
        condition: succeededOrFailed()


## Notes

The `rl-html` report format is currently not supported for this integration.

## Useful resources

- The official Microsoft documentation on [using Azure DevOps extensions](https://learn.microsoft.com/en-us/azure/devops/extend/overview?view=azure-devops)
- The official `reversinglabs/rl-scanner-cloud` Docker image [on Docker Hub](https://hub.docker.com/r/reversinglabs/rl-scanner-cloud)
- [Supported file formats](https://docs.secure.software/concepts/filetypes) and [language coverage](https://docs.secure.software/concepts/language-coverage) for the Spectra Assure platform
- Introduction to [secure software release processes](https://www.reversinglabs.com/solutions/secure-software-release-processes) with ReversingLabs


