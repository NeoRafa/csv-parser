// ********************** CSV PARSER ****************************
// ******************** MADE BY RAFAEL CABRAL PILI **************

const fs = require("fs");
var parse = require("csv-parse");
var _ = require("lodash");

var csvPath = "input.csv";

fs.readFile(csvPath, function(err, fileData) {
  parse(fileData, { columns: false, trim: true }, function(err, rows) {
    let eids = [];
    let emailRowsIndex = getRowIndex(rows[0], "email");
    let phoneRowsIndex = getRowIndex(rows[0], "phone");
    let eidIdx = getRowIndex(rows[0], "eid");
    let fullnameIdx = getRowIndex(rows[0], "fullname");
    let invisibleIdx = getRowIndex(rows[0], "invisible");
    let seeAllIdx = getRowIndex(rows[0], "see_all");
    let classesIndex = getRowIndex(rows[0], "class");

    let outputIntermediate = rows
      .map(row => {
        let obj = {};
        if (row[fullnameIdx[0][1]] === "fullname") {
          return null;
        }

        getRowObjectFromFields(
          eids,
          rows,
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
      .filter(val => val);
    eids = _.uniq(eids);

    let groupedOutput = groupById(outputIntermediate);

    let addressesPhones = computeAddressesPhone(
      groupedOutput,
      eids,
      phoneRowsIndex
    );

    let addressesEmails = computeAddressesEmail(
      groupedOutput,
      eids,
      emailRowsIndex
    ); // still have to implement checks

    let classes = computeClasses(groupedOutput, eids, classesIndex);

    console.log(classes);

    let finalOutput = [];

    eids.forEach(key => {
      let obj = {
        fullname: outputIntermediate.find(elem => elem.eid === key).fullname,
        eid: key,
        classes: findClassByEid(classes, key),
        tags: [
          ...findPhoneByEid(addressesPhones, key),
          ...findEmailByEid(addressesEmails, key)
        ],
        invisible: getRowInvisibility(groupedOutput, key),
        see_all: getRowSeeAll(groupedOutput, key)
      };
      finalOutput.push(obj);
    });
    console.log(finalOutput);
  });
});

getRowIndex = function(row, field) {
  return row
    .map((row, index) => {
      return row.includes(field) ? [row, index] : null;
    })
    .filter(val => val);
};

function getRowInvisibility(rows, key) {
  return rows[key].filter(elem => elem.invisible === "1").length > 0;
}

function getRowSeeAll(rows, key) {
  return rows[key].filter(elem => elem.see_all === "yes").length > 0;
}

/* ***********************************************
 *@param rows - csv parsed data rows
 **************************************************/
groupById = function(rows) {
  let groupedClasses = _.groupBy(rows, row => {
    return row["eid"];
  });
  return groupedClasses;
};

/* ***********************************************
 *@param rows - csv parsed data rows
 **************************************************/
computeAddressesPhone = function(groupedRows, eids, phoneRowsIndex) {
  return eids.map(key => {
    return {
      eid: key,
      phones: phoneRowsIndex
        .map(phoneRow => {
          obj = {};
          groupedRows[key].forEach(row => {
            tags = phoneRow[0]
              .split(/,| /)
              .slice(1)
              .filter(val => val);
            obj["type"] = "phone";
            obj["tags"] = tags;
            obj["address"] = row[phoneRow[0]];
          });
          if (obj.address) {
            return obj;
          } else null;
        })
        .filter(val => val)
    };
  });
};

/* ***********************************************
 *@param rows - csv parsed data rows
 **************************************************/

computeAddressesEmail = function(groupedRows, eids, emailRowsIndex) {
  return eids.map(key => {
    return {
      eid: key,
      emails: emailRowsIndex
        .map(emailRow => {
          obj = {};
          groupedRows[key].forEach(row => {
            tags = emailRow[0]
              .split(/,| /)
              .slice(1)
              .filter(val => val);
            obj["type"] = "email";
            obj["tags"] = tags;
            obj["address"] = row[emailRow[0]];
          });
          if (obj.address) {
            return obj;
          } else null;
        })
        .filter(val => val)
    };
  });
};

/* ***********************************************
 *@param rows - csv parsed data rows
 **************************************************/

function computeClasses(groupedRows, eids) {
  return eids.map(key => {
    return {
      eid: key,
      ..._.reduce(
        groupedRows[key],
        (acc, curr) => {
          acc["classes"].push(...curr["classes"]);
          return acc;
        },
        {
          classes: []
        }
      )
    };
  });
}

/* ***********************************************
 *@param rows - csv parsed data rows
 **************************************************/

function getRowObjectFromFields(
  eids,
  rows,
  eidIdx,
  row,
  obj,
  fullnameIdx,
  seeAllIdx,
  invisibleIdx,
  phoneRowsIndex,
  emailRowsIndex,
  classesIndex
) {
  eids.push(row[eidIdx[0][1]]);
  obj[fullnameIdx[0][0]] = row[fullnameIdx[0][1]];
  obj[eidIdx[0][0]] = row[eidIdx[0][1]];
  obj[seeAllIdx[0][0]] = row[seeAllIdx[0][1]];
  obj[invisibleIdx[0][0]] = row[invisibleIdx[0][1]];
  phoneRowsIndex.forEach(phoneRow => {
    obj[phoneRow[0]] = row[phoneRow[1]];
  });
  emailRowsIndex.forEach(emailRow => {
    obj[emailRow[0]] = row[emailRow[1]];
  });
  obj["classes"] = [];

  classesIndex.forEach(classesRow => {
    obj["classes"].push(
      ...row[classesRow[1]]
        .split(/,|\//)
        .map(elem => elem.trim())
        .filter(val => val)
    );
  });
}

function findClassByEid(classes, eid) {
  let classOut = classes.filter(classItem => classItem["eid"] === eid);
  if (classOut !== []) {
    return classes.filter(classItem => classItem["eid"] === eid)[0].classes;
  } else {
    return null;
  }
}

function findPhoneByEid(phones, eid) {
  let phonOut = phones.filter(phonItem => phonItem["eid"] === eid);
  if (phonOut !== []) {
    return phones.filter(phonItem => phonItem["eid"] === eid)[0].phones;
  } else {
    return null;
  }
}

function findEmailByEid(emails, eid) {
  let emailsOut = emails.filter(emailsItem => emailsItem["eid"] === eid);
  if (emailsOut !== []) {
    return emails.filter(emailsItem => emailsItem["eid"] === eid)[0].emails;
  } else {
    return null;
  }
}
