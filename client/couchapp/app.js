var couchapp = require('couchapp')
  , path = require('path')
  ;

ddoc = 
  { _id:'_design/backendproxy'
  , rewrites : 
    [ {from:"/", to:'index.html'}
    , {from:"/api", to:'../../'}
    , {from:"/api/*", to:'../../*'}
    , {from:"/*", to:'*'}
    ]
  }
  ;

ddoc.views = {
    map: function(doc) {
        var test, key;
        if (doc.data && doc.testCase && doc.testName) {
            key = [doc.testCase, doc.testName]; 
            emit(key, doc.getParams);
        }
    },
    /** total rows: SELECT COUNT(field) FROM table */
    reduce: function(keys, values) {
        var sum = 0, idx;
        for (idx in values) {
            sum = sum + values[idx];
        }
        return sum;
    }
};

ddoc.validate_doc_update = function (newDoc, oldDoc, userCtx) {   
  if (newDoc._deleted === true && userCtx.roles.indexOf('_admin') === -1) {
    throw "Only admin can delete documents on this database.";
  } 
};

couchapp.loadAttachments(ddoc, path.join(__dirname, 'attachments'));

module.exports = ddoc;