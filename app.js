const fs = require('fs');
const fetch = require('node-fetch');
const FormData = require('form-data');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const schedule = require('node-schedule');
const express = require('express');
const mobileConfig = require('lighthouse/lighthouse-core/config/lr-mobile-config.js');
const desktopConfig = require('lighthouse/lighthouse-core/config/lr-desktop-config.js');

console.log('WHAT IS THIS TIME', new Date().toLocaleTimeString());

const app = express();
app.listen(process.env.PORT || 3000, () => {
  console.log('App listening on port 3000');

  schedule.scheduleJob({hour: 14, minute: 30, dayOfWeek: 0}, async () => {
    console.log('Generating Lighthouse report...');
    await generateReport('mobile', mobileConfig);
    await generateReport('desktop', desktopConfig);
  });
});


async function generateReport(suffix, config) {

  const chrome = await chromeLauncher.launch({chromeFlags: ['--headless']});
  const options = {logLevel: 'info', output: 'html', onlyCategories: ['performance'], port: chrome.port };
  const runnerResult = await lighthouse('https://lovevery.com/products/the-play-kits', options, config);
  const reportHtml = runnerResult.report;
  const fileName = `${new Date().toLocaleDateString().replace(/\//g, '-')}-${suffix}.html`;
  fs.writeFileSync(fileName, reportHtml);

  console.log('Report is done for', runnerResult.lhr.finalUrl);
  console.log('Performance score was', runnerResult.lhr.categories.performance.score * 100);

  await chrome.kill();

  fs.readFile(fileName, (err, imageBuffer) => {
    const form = new FormData();

    form.append('file', imageBuffer, {
      contentType: 'text/html',
      filename: fileName,
    });


    fetch('https://lovevery.atlassian.net/wiki/rest/api/content/1235714087/child/attachment', {
      method: 'POST',
      headers: {
       'Authorization': 'Basic ' + Buffer.from(`${process.env.USERNAME}-${process.env.PASSWORD}`).toString('base64'),
       'X-Atlassian-Token': 'nocheck',
      },
      body: form
    })
    .then(response => response.json())
    .then(result => {
      console.log('Success - report uploaded to Confluence:', result);
    })
    .catch(error => {
      console.error('Error:', error);
    });
  });
}



