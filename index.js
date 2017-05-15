const fetch = require('node-fetch');

const travisAccessToken = process.env.TRAVIS_TOKEN;
let dependentRepo = '';
let dependentRepoBranch = 'master';

const request = (method, path, auth, data) => {
  return fetch(`https://api.travis-ci.org/${path}`, {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Travis - MyClient/1.0.0',
      'Accept': 'application/vnd.travis-ci.2+json',
      'Travis-API-Version': '3',
      'Authorization': auth,
    },
    body: JSON.stringify(data)
  }).then((res) => {
    return res.json();
  });
}

function checkIfBuildIsCreated() {
  return new Promise(function (resolve, reject) {
    (function waitForNewBuildToBeCreated(){
        request('GET', `repo/${dependentRepo}/builds`, travisAccessToken)
        .then((res) => {
          if (res.builds[0].state === 'created') return resolve(res.builds[0]);
          setTimeout(waitForNewBuildToBeCreated, 5000);
        });
    })();
  });
}

function checkIfBuildIsSuccessfull(build) {
  return new Promise(function (resolve, reject) {
    (function waitForBuildToBeEnd(){
        request('GET', `build/${build.id}`, travisAccessToken)
        .then((res) => {
          if (res.state === 'passed') return resolve(res);
          if (res.state === 'failed') reject('The dependent build failed. Exiting');
          setTimeout(waitForBuildToBeEnd, 5000);
        });
    })();
  });
}

const main = () => {

  if (process.argv[2]) {
    dependentRepo = encodeURIComponent(process.argv[2]);
  } else {
    console.error('You must specify a dependent project');
    process.exit(1);
  }
  if (process.argv[3]) {
    dependentRepoBranch = process.argv[3];
  }

  console.log('Starting to build dependent project: ' + dependentRepo + ' on branch ' + dependentRepoBranch);

  request('GET', `repo/${dependentRepo}`, travisAccessToken)
  .then((res) => {
    console.log(res);
    if (!res.id) {
      console.log('Dependent repository not found! Exiting');
      process.exit(1);
    }
  })
  .then(() => request('POST', `repo/${dependentRepo}/requests`, travisAccessToken, { branch: dependentRepoBranch}))
  .then(() => checkIfBuildIsCreated())
  .then((build) => checkIfBuildIsSuccessfull(build))
  .then(() => {
    console.log('Your dependent project built successfully! Continuing with the build');
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

main();