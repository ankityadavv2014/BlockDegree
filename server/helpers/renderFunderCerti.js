const ejs = require("ejs");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const User = require("../models/user");
const BulkPayment = require("../models/bulkCourseFunding");
const CorporateUser = require("../models/corporateUser");

const rootPath = path.join(__dirname, "../../dist/img/funder-certi/");

if (!fs.existsSync(rootPath)) {
  fs.mkdirSync(rootPath);
}

/**
 * will render the thank you certificate
 * @param {String} donerName doner name
 * @param {String} fundId funder name
 */
let renderFunderCerti = (donerName, fundId) => {
  console.log("dinerName:", donerName, fundId);

  return new Promise((resolve, reject) => {
    ejs.renderFile(
      path.join(__dirname, "../fmd-templates/funder-certi/ThankYou.ejs"),
      { donerName },
      async (err, data) => {
        try {
          if (err) {
            console.log(`exception at ${__filename}.renerFunderCerti: `, err);
            reject(err);
          }
          let imgHTML = data.toString("utf-8");
          browser = await puppeteer.launch({
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
          });
          const localPath = rootPath + fundId + ".png";
          const page = await browser.newPage();
          await page.setViewport({
            width: 800,
            height: 600,
            deviceScaleFactor: 1,
          });
          await page.setContent(imgHTML);
          await page.screenshot({ path: localPath });
          resolve({ status: true });
        } catch (e) {
          console.log(`exception at ${__filename}.renderFunderCerti: `, e);
          reject(e);
        }
      }
    );
  });
};

/**
 * will render bulk thank-you message
 * @param {String} bulkId if of the bulk payment
 */
let renderBulkCerti = (bulkId) => {
  return new Promise((resolve, reject) => {
    BulkPayment.findOne({ bulkId: bulkId })
      .then((bulkPayment) => {
        if (bulkPayment.type === "bulk") {
          // bulk
          const email = bulkPayment.donerEmail;
          User.findOne({ email: email }).then((user) => {
            const donerName = user.name;
            const degreeCount = bulkPayment.fundIds.length;
            ejs.renderFile(
              path.join(
                __dirname,
                "../fmd-templates/funder-certi/ThankYouBulk.ejs"
              ),
              { donerName, degreeCount },
              async (err, data) => {
                try {
                  if (err) {
                    console.log(
                      `exception at ${__filename}.renderBulkCerti: `,
                      err
                    );
                    reject(err);
                  }
                  let imgHTML = data.toString("utf-8");
                  browser = await puppeteer.launch({
                    args: ["--no-sandbox", "--disable-setuid-sandbox"],
                  });
                  const localPath = rootPath + bulkId + ".png";
                  const page = await browser.newPage();
                  await page.setViewport({
                    width: 800,
                    height: 600,
                    deviceScaleFactor: 1,
                  });
                  await page.setContent(imgHTML);
                  await page.screenshot({ path: localPath });
                  resolve({ status: true });
                  for (let i = 0; i < bulkPayment.fundIds.length; i++) {
                    let fundId = bulkPayment.fundIds[i];
                    await renderFunderCerti(donerName, fundId.fundId);
                  }
                } catch (e) {
                  console.log(
                    `exception at ${__filename}.renderBulkCerti: `,
                    e
                  );
                  reject(e);
                }
              }
            );
          });
        } else {
          // corporate
          const email = bulkPayment.companyEmail;
          CorporateUser.findOne({ companyEmail: email }).then(
            (corporateUser) => {
              const donerName = corporateUser.companyName;
              const degreeCount = bulkPayment.fundIds.length;
              console.log(donerName, degreeCount);

              ejs.renderFile(
                path.join(
                  __dirname,
                  "../fmd-templates/funder-certi/ThankYouBulkCorporate.ejs"
                ),
                { donerName: donerName, degreeCount: degreeCount },
                async (err, data) => {
                  try {
                    if (err) {
                      console.log(
                        `exception at ${__filename}.renderBulkCerti: `,
                        err
                      );
                      reject(err);
                    }
                    let imgHTML = data.toString("utf-8");
                    browser = await puppeteer.launch({
                      args: ["--no-sandbox", "--disable-setuid-sandbox"],
                    });
                    const localPath = rootPath + bulkId + ".png";
                    console.log("PATH: ", localPath);

                    const page = await browser.newPage();
                    await page.setViewport({
                      width: 800,
                      height: 600,
                      deviceScaleFactor: 1,
                    });
                    await page.setContent(imgHTML);
                    await page.screenshot({ path: localPath });
                    resolve({ status: true });
                    for (let i = 0; i < bulkPayment.fundIds.length; i++) {
                      let fundId = bulkPayment.fundIds[i];
                      await renderFunderCerti(donerName, fundId.fundId);
                    }
                  } catch (e) {
                    console.log(
                      `exception at ${__filename}.renderBulkCerti: `,
                      e
                    );
                    reject(e);
                  }
                }
              );
            }
          );
        }
      })
      .catch((e) => {
        console.log(`exception at ${__filename}.renderBulkCerti: `, e);
        reject(e);
      });
  });
};

exports.renderFunderCerti = renderFunderCerti;
exports.renderBulkCerti = renderBulkCerti;

// renderBulkCerti("7511412c-6783-44cb-b4dc-7e2b57aef959")
//   .then(console.log)
//   .catch(console.log);
