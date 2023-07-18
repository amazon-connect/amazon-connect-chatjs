
# Npm Package Publish

Documentation for publishing to npmjs.org: https://docs.npmjs.com/creating-and-publishing-scoped-public-packages

## [MANUAL] Publish with npm cli commands

1. Create a GitHub release: https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository

  - Head to https://github.com/amazon-connect/amazon-connect-chatjs/releases
  - Draft new release
  - Choose tag, enter new semver
  - Click, "create tag on publish"
  - Publish the release

2. Publish the package to npm

```sh
git clone https://github.com/amazon-connect/amazon-connect-chatjs.git
cd amazon-connect-chatjs
npm i
npm run release
git status

npm login
npm publish --dry-run
npm publish --access=public
```

3. View release: https://www.npmjs.com/package/amazon-connect/amazon-connect-chatjs

## [AUTOMATION] GitHub Action Npm Publish Workflow

Steps to configure/update the `npm publish` [workflow](https://github.com/amazon-connect/amazon-connect-chatjs/blob/master/.github/workflows/publish.yml) for automated `npm publish`.

## Setup ⚙️

> Note: must have NPM_TOKEN set in GitHub Secrets, with `automation` permissions

By creating a GitHub deployment environment, you can set environment variables and specify users to approve.

<kbd>
<img width="500" alt="Edit the secrets" src="https://user-images.githubusercontent.com/60903378/234742844-464ddd72-aa40-497b-9243-9b1c77d87723.png">
</kbd>

- [npmjs.org] Become admin of the npm package
- [npmjs.org] Create a granular NPM_TOKEN to publish `amazon-connect-chatjs` [[docs](https://docs.npmjs.com/creating-and-viewing-access-tokens)]
- [github.com] Become admin of the GitHub repository
- [github.com] Create/update `release` environment, with required reviewers in repository settings [[docs](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)]
- [github.com] Add `NPM_TOKEN` under the secrets for the `release` environment.
- [github.com] Add/remove admin users to the environment (eg. /settings/environments/873739246/edit)

#### Usage

Creating a release and triggering the `npm publish` [workflow](https://github.com/amazon-connect/amazon-connect-chatjs/blob/master/.github/workflows/publish.yml).

1. Create a GitHub release: https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository

    - Head to https://github.com/amazon-connect/amazon-connect-chatjs/releases
    - Draft new release
    - Choose tag, enter new semver
    - Click, "create tag on publish"
    - Edit the title/description
    - Publish the release

      <kbd>
        <img width="500" alt="AdminDraftsARelease" src="https://github.com/amazon-connect/amazon-connect-chatjs/assets/60903378/88cfec25-8d02-4f9b-9606-bce5d523058f">
      </kbd>

2. Workflow is triggered on release (or you can trigger with manual `workflow_dispatch`):

    - Head to https://github.com/amazon-connect/amazon-connect-chatjs/actions
    - Expand the pending Npm Publish workflow

      <kbd>
        <img width="500" alt="View_Actions" src="https://user-images.githubusercontent.com/60903378/234742818-d0de2b4d-02ac-459f-a130-296bff1f69e4.png">
      </kbd>

    - Review the workflow

      <kdb>
        <img width="500" alt="AdminEnabledDryRunAccessingEnvironment" src="https://github.com/amazon-connect/amazon-connect-chatjs/assets/60903378/9ef91a92-9e01-4fbf-b8dd-2d719687a5d0">
      </kbd>

3. Run the dry-run workflow:

    - Approve the workflow

      <kbd>
        <img width="500" alt="AdminApprovesDryRun" src="https://github.com/amazon-connect/amazon-connect-chatjs/assets/60903378/1f15d77c-2085-468a-bead-e97ad7a1233b">
      </kdb>

    - View Dry-run workflow results

      <kdb>
        <img width="500" alt="DryRunComplete" src="https://github.com/amazon-connect/amazon-connect-chatjs/assets/60903378/1eda1ce5-d34d-4c7d-9ec2-c3d52a42c879">
      </kbd>

4. Run the publish workflow:

    - Approve the publish workflow

      <kdb>
        <img width="500" alt="PublishLiveIsPending" src="https://github.com/amazon-connect/amazon-connect-chatjs/assets/60903378/657740f6-08ff-42e2-9443-b110840be090">
      </kbd>

      <kdb>
        <img width="500" alt="AdminApprovesPublishLive" src="https://github.com/amazon-connect/amazon-connect-chatjs/assets/60903378/d1ef2618-4bc7-45da-8304-24e6cb888594">
      </kbd>

    - View publish workflow results

      <kdb>
        <img width="500" alt="NpmPublishSuceeds" src="https://github.com/amazon-connect/amazon-connect-chatjs/assets/60903378/9115940d-9488-432d-ab57-86390bda68c5">
      </kbd>

  5. View the live updated npm package

      <kbd>
      <img width="500" alt="Published" src="https://user-images.githubusercontent.com/60903378/234742891-14f2091a-7bff-495a-b7d7-4e365a967d09.png">
      </kbd>

      <kbd>
      <img width="500" alt="Release is live" src="https://user-images.githubusercontent.com/60903378/234742899-a0e6c51d-078d-4350-94b8-199a6143543a.png">
      </kbd>