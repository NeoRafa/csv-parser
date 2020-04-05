// ********************** CSV PARSER ****************************
// ******************** MADE BY RAFAEL CABRAL PILI **************

const fs = require("fs");
var parse = require("csv-parse");
var _ = require("lodash");

const PNF = require("google-libphonenumber").PhoneNumberFormat;
const phoneUtil = require("google-libphonenumber").PhoneNumberUtil.getInstance();

var csvPath = "input.csv";

fs.readFile(csvPath, function (err, fileData) {
  if (err) throw err;
  parse(fileData, { columns: false, trim: true }, function (err, rows) {
    let ids = [];

    const emailHeadersIndex = getRowIndex(rows[0], "email");
    const phoneHeadersIndex = getRowIndex(rows[0], "phone");
    const idsHeaderIndex = getRowIndex(rows[0], "eid");
    const fullnameHeaderIndex = getRowIndex(rows[0], "fullname");
    const invisibleHeaderIndex = getRowIndex(rows[0], "invisible");
    const seeAllHeaderIndex = getRowIndex(rows[0], "see_all");
    const classesHeadersIndex = getRowIndex(rows[0], "class");

    let outputIntermediate = rows
      .map((row) => {
        let builderObject = {};

        if (row[fullnameHeaderIndex[0][1]] === "fullname") {
          return null;
        }
        createPersonDataObject(
          ids,
          idsHeaderIndex,
          row,
          builderObject,
          fullnameHeaderIndex,
          seeAllHeaderIndex,
          invisibleHeaderIndex,
          phoneHeadersIndex,
          emailHeadersIndex,
          classesHeadersIndex
        );

        return builderObject;
      })
      .filter((nonNullEntry) => nonNullEntry);

    ids = _.uniq(ids);

    let groupedOutput = groupRowsById(outputIntermediate);

    let addressesPhones = parseGroupedPhones(
      groupedOutput,
      ids,
      phoneHeadersIndex
    );

    let addressesEmails = parseGroupedEmails(
      groupedOutput,
      ids,
      emailHeadersIndex
    ); // still have to implement checks

    let classes = parseGroupedClasses(groupedOutput, ids, classesHeadersIndex);
    let finalOutput = [];

    buildFinalJsonOutput(
      ids,
      outputIntermediate,
      classes,
      addressesPhones,
      addressesEmails,
      groupedOutput,
      finalOutput
    );

    const data = JSON.stringify(finalOutput);

    fs.writeFile("output.json", data, (err) => {
      if (err) throw err;
    });
  });
});

/**************************************************
 *@param row - header row
 *@param field - field being searched
 **************************************************/

function getRowIndex(row, field) {
  return row
    .map((row, index) => {
      return row.includes(field) ? [row, index] : null;
    })
    .filter((nonNullEntry) => nonNullEntry);
}

function buildFinalJsonOutput(
  ids,
  outputIntermediate,
  classes,
  addressesPhones,
  addressesEmails,
  groupedOutput,
  finalOutput
) {
  ids.forEach((key) => {
    let jsonObjectBuilder = {
      fullname: outputIntermediate.find((elem) => elem.eid === key).fullname,
      eid: key,
      classes: findClassById(classes, key),
      tags: [
        ...findPhoneById(addressesPhones, key),
        ...findEmailById(addressesEmails, key),
      ],
      invisible: getRowInvisibility(groupedOutput, key),
      see_all: getRowSeeAll(groupedOutput, key),
    };
    finalOutput.push(jsonObjectBuilder);
  });
}

/* ***********************************************
 *@param rows - csv parsed data rows
 *@param key - current analysing row ID
 *************************************************/

function getRowInvisibility(rows, key) {
  return rows[key].filter((elem) => elem.invisible === "1").length > 0;
}

/* ***********************************************
 *@param rows - csv parsed data rows
 *@param key - current analysing row ID
 **************************************************/

function getRowSeeAll(rows, key) {
  return rows[key].filter((elem) => elem.see_all === "yes").length > 0;
}

/* ***********************************************
 *@param rows - csv parsed data rows
 **************************************************/
function groupRowsById(rows) {
  let groupedClasses = _.groupBy(rows, (row) => {
    return row["eid"];
  });
  return groupedClasses;
}

/* ***********************************************
 *@param groupedRows -rows grouped by ID
 *@param ids - Array containing IDs of each row entry
 *@param phoneRowsIndex - Indexes of each phone related row
 **************************************************/

function parseGroupedPhones(groupedRows, ids, phoneRowsIndex) {
  let parsedPhones = ids.map((key) => {
    return {
      currId: key,
      phones: phoneRowsIndex
        .map((phoneRow) => {
          obj = [];
          groupedRows[key].forEach((person) => {
            let numbers = person[phoneRow[0]]
              .split(/,|\//)
              .map((phone) => {
                let formatedNumber = phone.replace(/ |\(|\)/g, "");
                let number =
                  formatedNumber && !isNaN(formatedNumber)
                    ? phoneUtil.parseAndKeepRawInput(formatedNumber, "BR")
                    : null;
                if (!number || !phoneUtil.isValidNumber(number)) {
                  return null;
                } else
                  return phoneUtil.format(number, PNF.E164).replace("+", "");
              })
              .filter((nonNullEntry) => nonNullEntry);

            tags = phoneRow[0]
              .split(/,| /)
              .slice(1)
              .filter((nonNullEntry) => nonNullEntry);

            obj.push(...numbers);
          });

          if (obj.length > 0) {
            obj = obj.map((number) => {
              let buildObj = {};
              buildObj["tags"] = tags;
              buildObj["address"] = number;
              return buildObj;
            });
            return obj;
          } else null;
        })
        .filter((nonNullEntry) => nonNullEntry),
    };
  });

  const phonesResult = groupPhonesAndParse(ids, parsedPhones);
  return phonesResult;
}

/* ***********************************************
 *@param ids - Array containing IDs of each row entry
 *@param parsedPhones - represent the alredy pre-parsed phone object ready to be grouped
 **************************************************/

function groupPhonesAndParse(ids, parsedPhones) {
  return ids.map((key) => {
    let phones = _.flattenDeep(findPhoneById(parsedPhones, key));
    let phoneNumbers = _.uniq(phones.map((phone) => phone.address));
    let groupedPhones = _.groupBy(phones, (phone) => phone.address);
    return {
      currId: key,
      phones: phoneNumbers.map((phoneNumber) => {
        return _.reduce(
          groupedPhones[phoneNumber],
          (acc, curr) => {
            acc.tags.push(...curr.tags);
            acc.tags = _.uniq(acc.tags);
            return acc;
          },
          {
            type: "phone",
            tags: [],
            address: phoneNumber,
          }
        );
      }),
    };
  });
}

/* ***********************************************
 *@param ids - Array containing IDs of each row entry
 *@param parsedEmails - represent the alredy pre-parsed emails object ready to be grouped
 **************************************************/

function groupEmailsAndParse(ids, parsedEmails) {
  return ids.map((key) => {
    let emails = _.flattenDeep(findEmailById(parsedEmails, key));
    let emailAddresses = emails.map((email) => {
      return email.address;
    });

    emailsAddresses = _.uniq(emailAddresses);
    let groupedEmails = _.groupBy(emails, (email) => email.address);
    return {
      currId: key,
      emails: emailsAddresses.map((emailAddress) => {
        return _.reduce(
          groupedEmails[emailAddress],
          (acc, curr) => {
            acc.tags.push(...curr.tags);
            acc.tags = _.uniq(acc.tags);
            return acc;
          },
          {
            type: "email",
            tags: [],
            address: emailAddress,
          }
        );
      }),
    };
  });
}

/* ***********************************************
 *@param groupedRows -rows grouped by ID
 *@param ids - Array containing IDs of each row entry
 *@param emailRowsIndex - indexes of each email related row
 **************************************************/

function parseGroupedEmails(groupedRows, ids, emailRowsIndex) {
  const parsedEmails = ids.map((key) => {
    return {
      currId: key,
      emails: emailRowsIndex
        .map((emailRow) => {
          obj = [];
          groupedRows[key].forEach((person) => {
            let personEmails = [];
            tags = emailRow[0]
              .split(/,| /)
              .slice(1)
              .filter((nonNullEntry) => nonNullEntry);
            personEmails = [...person[emailRow[0]].split(/,| |\//)];
            personEmails = personEmails
              .filter((email) => email.match(/^[^@\s]+@[^@\s\.]+\.[^@\.\s]+$/))
              .filter((nonNullEntry) => nonNullEntry);

            obj.push(...personEmails);
          });
          if (obj.length > 0) {
            obj = obj.map((email) => {
              let buildObj = {};
              buildObj["tags"] = tags;
              buildObj["address"] = email;
              return buildObj;
            });
            return obj;
          } else null;
        })
        .filter((nonNullEntry) => nonNullEntry),
    };
  });

  const emailResult = groupEmailsAndParse(ids, parsedEmails);
  return emailResult;
}

/* ***********************************************
 *@param groupedRows -rows grouped by ID
 *@param ids - Array containing IDs of each row entry
 **************************************************/

function parseGroupedClasses(groupedRows, ids) {
  return ids.map((key) => {
    return {
      eid: key,
      ..._.reduce(
        groupedRows[key],
        (acc, curr) => {
          acc["classes"].push(...curr["classes"]);
          return acc;
        },
        {
          classes: [],
        }
      ),
    };
  });
}

/* ***********************************************
 *@param ids - IDS for each row entry in CSV
 *@param currentRow - Current row for which object is being created
 *@param builderObject - result object to return from row
 *@params *Index - Index at splitted CSV of *
 **************************************************/

function createPersonDataObject(
  ids,
  idIndex,
  currentRow,
  builderObject,
  fullnameIndex,
  seeAllIndex,
  invisibleIndex,
  phoneRowsIndex,
  emailRowsIndex,
  classesIndex
) {
  ids.push(currentRow[idIndex[0][1]]);
  builderObject[fullnameIndex[0][0]] = currentRow[fullnameIndex[0][1]];
  builderObject[idIndex[0][0]] = currentRow[idIndex[0][1]];
  builderObject[seeAllIndex[0][0]] = currentRow[seeAllIndex[0][1]];
  builderObject[invisibleIndex[0][0]] = currentRow[invisibleIndex[0][1]];
  phoneRowsIndex.forEach((phoneRow) => {
    builderObject[phoneRow[0]] = currentRow[phoneRow[1]];
  });
  emailRowsIndex.forEach((emailRow) => {
    builderObject[emailRow[0]] = currentRow[emailRow[1]];
  });
  builderObject["classes"] = [];

  classesIndex.forEach((classesRow) => {
    builderObject["classes"].push(
      ...currentRow[classesRow[1]]
        .split(/,|\//)
        .map((elem) => elem.trim())
        .filter((nonNullEntry) => nonNullEntry)
    );
  });
}

/* ***********************************************
 *@param eid - ID for each row entry
 *@param classes - classes ready object for output
 **************************************************/

function findClassById(classes, eid) {
  let classOut = classes.filter((classItem) => classItem["eid"] === eid);
  if (classOut !== []) {
    return classes.filter((classItem) => classItem["eid"] === eid)[0].classes;
  } else {
    return null;
  }
}

/* ***********************************************
 *@param eid - ID for each row entry
 *@param phones - phones ready object for output
 **************************************************/

function findPhoneById(phones, eid) {
  let phonOut = phones.filter((phonItem) => phonItem["currId"] === eid);
  if (phonOut !== []) {
    return phones.filter((phonItem) => phonItem["currId"] === eid)[0].phones;
  } else {
    return null;
  }
}

/* ***********************************************
 *@param eid - ID for each row entry
 *@param emails - emails ready object for output
 **************************************************/
function findEmailById(emails, eid) {
  let emailsOut = emails.filter((emailsItem) => emailsItem["currId"] === eid);
  if (emailsOut !== []) {
    return emails.filter((emailsItem) => emailsItem["currId"] === eid)[0]
      .emails;
  } else {
    return null;
  }
}
