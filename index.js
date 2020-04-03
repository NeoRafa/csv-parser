// ********************** CSV PARSER ****************************
// ******************** MADE BY RAFAEL CABRAL PILI **************

const fs = require("fs");
var parse = require("csv-parse");
var _ = require("lodash");

var csvPath = "input.csv";

fs.readFile(csvPath, function (err, fileData) {
  parse(fileData, { columns: false, trim: true }, function (err, rows) {
    let eids = [];

    const emailRowsIndex = getRowIndex(rows[0], "email");
    const phoneRowsIndex = getRowIndex(rows[0], "phone");
    const eidIdx = getRowIndex(rows[0], "eid");
    const fullnameIdx = getRowIndex(rows[0], "fullname");
    const invisibleIdx = getRowIndex(rows[0], "invisible");
    const seeAllIdx = getRowIndex(rows[0], "see_all");
    const classesIndex = getRowIndex(rows[0], "class");

    let outputIntermediate = rows
      .map((row) => {
        let obj = {};

        if (row[fullnameIdx[0][1]] === "fullname") {
          return null;
        }
        getRowObjectFromFields(
          eids,
          eidIdx,
          row,
          obj,
          fullnameIdx,
          seeAllIdx,
          invisibleIdx,
          phoneRowsIndex,
          emailRowsIndex,
          classesIndex
        );

        return obj;
      })
      .filter((val) => val);

    eids = _.uniq(eids);

    let groupedOutput = groupRowsById(outputIntermediate);

    let addressesPhones = parseGroupedPhones(
      groupedOutput,
      eids,
      phoneRowsIndex
    );

    let addressesEmails = parseGroupedEmails(
      groupedOutput,
      eids,
      emailRowsIndex
    ); // still have to implement checks

    let classes = parseGroupedClasses(groupedOutput, eids, classesIndex);
    let finalOutput = [];

    buildFinalJsonOutput(
      eids,
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
    .filter((val) => val);
}

function buildFinalJsonOutput(
  eids,
  outputIntermediate,
  classes,
  addressesPhones,
  addressesEmails,
  groupedOutput,
  finalOutput
) {
  eids.forEach((key) => {
    let jsonObjectBuilder = {
      fullname: outputIntermediate.find((elem) => elem.eid === key).fullname,
      eid: key,
      classes: findClassByEid(classes, key),
      tags: [
        ...findPhoneByEid(addressesPhones, key),
        ...findEmailByEid(addressesEmails, key),
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
 **************************************************/

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
 *@param eids - Array containing IDs of each row entry
 *@param phoneRowsIndex - Indexes of each phone related row
 **************************************************/

function parseGroupedPhones(groupedRows, eids, phoneRowsIndex) {
  return eids.map((key) => {
    return {
      eid: key,
      phones: phoneRowsIndex
        .map((phoneRow) => {
          obj = {};
          groupedRows[key].forEach((row) => {
            tags = phoneRow[0]
              .split(/,| /)
              .slice(1)
              .filter((val) => val);
            obj["type"] = "phone";
            obj["tags"] = tags;
            obj["address"] = row[phoneRow[0]];
          });
          if (obj.address) {
            return obj;
          } else null;
        })
        .filter((val) => val),
    };
  });
}

/* ***********************************************
 *@param groupedRows -rows grouped by ID
 *@param eids - Array containing IDs of each row entry
 *@param emailRowsIndex - indexes of each email related row
 **************************************************/

function parseGroupedEmails(groupedRows, eids, emailRowsIndex) {
  return eids.map((key) => {
    return {
      eid: key,
      emails: emailRowsIndex
        .map((emailRow) => {
          obj = {};
          groupedRows[key].forEach((row) => {
            tags = emailRow[0]
              .split(/,| /)
              .slice(1)
              .filter((val) => val);
            obj["type"] = "email";
            obj["tags"] = tags;
            obj["address"] = row[emailRow[0]];
          });
          if (obj.address) {
            return obj;
          } else null;
        })
        .filter((val) => val),
    };
  });
}

/* ***********************************************
 *@param groupedRows -rows grouped by ID
 *@param eids - Array containing IDs of each row entry
 **************************************************/

function parseGroupedClasses(groupedRows, eids) {
  return eids.map((key) => {
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
 *@param eids - IDS for each row entry in CSV
 *@param currentRow - Current row for which object is being created
 *@param builderObject - result object to return from row
 *@params *Index - Index at splitted CSV of *
 **************************************************/

function getRowObjectFromFields(
  eids,
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
  eids.push(currentRow[idIndex[0][1]]);
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
        .filter((val) => val)
    );
  });
}

/* ***********************************************
 *@param eid - ID for each row entry
 *@param classes - classes ready object for output
 **************************************************/

function findClassByEid(classes, eid) {
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

function findPhoneByEid(phones, eid) {
  let phonOut = phones.filter((phonItem) => phonItem["eid"] === eid);
  if (phonOut !== []) {
    return phones.filter((phonItem) => phonItem["eid"] === eid)[0].phones;
  } else {
    return null;
  }
}

/* ***********************************************
 *@param eid - ID for each row entry
 *@param emails - emails ready object for output
 **************************************************/
function findEmailByEid(emails, eid) {
  let emailsOut = emails.filter((emailsItem) => emailsItem["eid"] === eid);
  if (emailsOut !== []) {
    return emails.filter((emailsItem) => emailsItem["eid"] === eid)[0].emails;
  } else {
    return null;
  }
}
