var http = require('http'),
    sys = require('util'),
    path = require('path'),
    cacheroot = 'cache',
    requestId = '',
    doc = {},
    
    //Helpers
    debug = require('./libs/helpers/debug'),
    get = require('./libs/helpers/get'),
    
    //Conf
    conf = require('./conf/conf'),
    dbName = conf.read().db;
    
    //DB
    couchdb = require('./libs/node-couchdb/lib/couchdb'),
    client = couchdb.createClient(5984, 'localhost'),
    db = client.db(dbName);
    
    fs = require('fs');

http.createServer(function (req, res) {
    req.setEncoding("utf8");
    req.content = '';
    // Generate Doc ID
    requestId = get.getRequestId(req);
    // Initialize
    init(req, res);
}).listen(8124, "127.0.0.1");

function init(req, res) {
    // Check if we already got that ID in couch
    db.getDoc(requestId, function(error, doc) {
        if(error) {
            // If the ID is missing we want to send a request to the backend and fill it into couch
            if ('not_found' === error.error && 'missing' === error.reason) {
                doRequest(req, res);
            } else {
                sys.puts(JSON.stringify(error));
            }
        } else {
            // Send the cached output
            sendOutput(res, doc.data.data);
        }
    });
}

function doRequest(req, res) {
    var url = urlparse(req.url);
    var httpClient = http.createClient((url.port || 80), url.hostname),
        request = httpClient.request(req.method, 
                                     url.pathname + (url.search || ''), 
                                     {'host': url.hostname});

    request.write(req.content);
    request.end();
    
    request.on('response', function(response) {
        response.setEncoding('utf8');
        get.getContent(response, function(content){
            var data = {
                request: {
                    url: req.url,
                    method: req.method,
                    content: req.content
                },
                response: {
                    headers: response.headers,
                    statusCode: response.statusCode
                }
            };
            
            doc = get.getDataObject(data, content);
            
            saveRequestToCouch(res, doc);
        });
        
    });
}

function saveRequestToCouch(res, doc) {
    db.saveDoc(requestId, {'data' : doc}, function(er, ok) {
        if (er) {
            sys.puts('Error saving the Request ' + JSON.stringify(er));
        } else {
            sys.puts('Saved Request');
            sendOutput(res, doc.data);
        }
    });
}

function sendOutput(res, doc) {
    sys.puts('serving doc from couchdb');
    res.setHeader("Content-Type", "text/xml");
    //res.setHeader("Connection", "close");
    res.write(doc);
    res.end();
}

function serveFile(filename, response) {
    var headersWritten = false;
    var body = null;
    
    fs.readFile(filename + '.metadata', 'utf8', function(err, filecontent) {
        if (err) throw err;
        
        var jsonData = JSON.parse(filecontent);
        
        response.writeHead(jsonData.response.statusCode, jsonData.response.headers);
        
        sys.pump(fs.createReadStream(filename), response);
    });
}

function writeMetadata(metadata, content, filename, response){
    var nbFilesWritten = 0;
    
    function callback(err) {
        if (err) throw err;    
        if(++nbFilesWritten === 2)
            serveFile(filename, response);
    }
    
    fs.writeFile(filename + '.metadata', metadata, 'utf8', callback);
    //Binary write for the content to enable nice diff files
    fs.writeFile(filename, content, callback);
}

console.log('Server running at http://127.0.0.1:8124/');