const fs = require("fs");
var parse = require("csv-parse");
var _ = require('lodash');

var csvPath = "input.csv";

fs.readFile(csvPath, function(err, fileData) {
  parse(fileData, { columns: false, trim: true }, function(err, rows) {
    let mappedRows = rows.map((row) => {
        return {
            "fullname": row[0],
            "eid": row[1],
            "class": row[2].toString().replace('/', ' ') + ' ' + row[3].toString().replace('/', ' '),
            "email_resp": row[4],
            "phone_pai": row[5],
            "phone_resp": row[6],
            "email_resp": row[7],
            "email_student": row[8],
            "phone_student": row[9],
            "invisible": row[10],
            "see_all": row[11]
        }
    });

    console.log(classData(mappedRows))
    // Your CSV data is in an array of arrys passed to this callback as rows.
  });
});
/* ***********************************************
 *@param rows - csv parsed data rows
 **************************************************/
classData = function(rows) {
  let groupedClasses = _.groupBy(rows, (row) => {
    return row.eid
  });
  return groupedClasses;
};
