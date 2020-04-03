// ********************** CSV PARSER ****************************
// ******************** MADE BY RAFAEL CABRAL PILI **************

const fs = require("fs")
var parse = require("csv-parse")
var _ = require("lodash")

var csvPath = "input.csv"

fs.readFile(csvPath, function(err, fileData) {
  parse(fileData, { columns: false, trim: true }, function(err, rows) {
    let eids = []
    let emailRowsIndex = getRowIndex(rows[0], "email")
    let phoneRowsIndex = getRowIndex(rows[0], "phone")
    let eidIdx = getRowIndex(rows[0], "eid")
    let fullnameIdx = getRowIndex(rows[0], "fullname")
    let invisibleIdx = getRowIndex(rows[0], "invisible")
    let seeAllIdx = getRowIndex(rows[0], "see_all")
    let classesIndex = getRowIndex(rows[0], "class")

    let outputIntermediate = rows
      .map(row => {
        let obj = {}
        if (row[fullnameIdx[0][1]] === "fullname") {
          return null
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
        )

        return obj
      })
      .filter(val => val)
    eids = _.uniq(eids)

    let groupedOutput = groupById(outputIntermediate)

    let addressesPhones = computeAddressesPhone(
      groupedOutput,
      eids,
      phoneRowsIndex
    )

    let addressesEmails = computeAddressesEmail(
      groupedOutput,
      eids,
      emailRowsIndex
    ) // still have to implement checks

    let classes = computeClasses(groupedOutput, eids, classesIndex)

    console.log(classes)
  })
})

getRowIndex = function(row, field) {
  return row
    .map((row, index) => {
      return row.includes(field) ? [row, index] : null
    })
    .filter(val => val)
}

/* ***********************************************
 *@param rows - csv parsed data rows
 **************************************************/
groupById = function(rows) {
  let groupedClasses = _.groupBy(rows, row => {
    return row["eid"]
  })
  return groupedClasses
}

/* ***********************************************
 *@param rows - csv parsed data rows
 **************************************************/
computeAddressesPhone = function(groupedRows, eids, phoneRowsIndex) {
  return eids.map(key => {
    return phoneRowsIndex
      .map(phoneRow => {
        obj = {}
        groupedRows[key].forEach(row => {
          tags = phoneRow[0]
            .split(/,| /)
            .slice(1)
            .filter(val => val)
          obj["eid"] = key
          obj["type"] = "phone"
          obj["tags"] = tags
          obj["address"] = row[phoneRow[0]]
        })
        if (obj.address) {
          return obj
        } else null
      })
      .filter(val => val)
  })
}

/* ***********************************************
 *@param rows - csv parsed data rows
 **************************************************/

computeAddressesEmail = function(groupedRows, eids, emailRowsIndex) {
  return eids.map(key => {
    return emailRowsIndex
      .map(emailRow => {
        obj = {}
        groupedRows[key].forEach(row => {
          tags = emailRow[0]
            .split(/,| /)
            .slice(1)
            .filter(val => val)
          obj["eid"] = key
          obj["type"] = "email"
          obj["tags"] = tags
          obj["address"] = row[emailRow[0]]
        })
        if (obj.address) {
          return obj
        } else null
      })
      .filter(val => val)
  })
}

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
          acc['classes'] += ' ' + curr['classes']
          acc['classes'] = acc['classes'].trim()
          return acc
        },
        {
          classes: ''
        }
      )
    }
  })
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
  eids.push(row[eidIdx[0][1]])
  obj[fullnameIdx[0][0]] = row[fullnameIdx[0][1]]
  obj[eidIdx[0][0]] = row[eidIdx[0][1]]
  obj[seeAllIdx[0][0]] = row[seeAllIdx[0][1]]
  obj[invisibleIdx[0][0]] = row[invisibleIdx[0][1]]
  phoneRowsIndex.forEach(phoneRow => {
    obj[phoneRow[0]] = row[phoneRow[1]]
  })
  emailRowsIndex.forEach(emailRow => {
    obj[emailRow[0]] = row[emailRow[1]]
  })
  obj['classes'] = ''

  classesIndex.forEach(classesRow => {
    obj['classes'] += row[classesRow[1]] + ' '
  })

  obj['classes'] = obj['classes'].split(/,|\//).map(elem => elem.trim()).join(' ')
}
