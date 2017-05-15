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

function checkIfBuildIsCreated(res) {
  return new Promise(function (resolve, reject) {
    (function waitForNewBuildToBeCreated(){
        request('GET', `repo/${dependentRepo}/builds`, travisAccessToken)
        .then((res) => {
          if (res.builds[0].state === 'created') return resolve();
          setTimeout(waitForNewBuildToBeCreated, 5000);
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

  request('GET', `repo/${dependentRepo}`, travisAccessToken)
  .then((res) => {
    if (!res.id) {
      console.log('Dependent repository not found! Exiting');
      process.exit(1);
    }
  })
  .then( () => request('POST', `repo/${dependentRepo}/requests`, travisAccessToken, { branch: dependentRepoBranch}) )
  .then( (res) => waitForBuild(res))
  .then((res) => {
    console.log(res.builds[0]);
  });
}

main();