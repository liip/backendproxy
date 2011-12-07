var http = require('http'),
    sys = require('util'),
    crypto = require('crypto'),
    path = require('path'),
    urlparse = require('url').parse,
    cacheroot = 'cache',
    requestId = '',
    doc = {},
    //Helpers
    debug = require('./libs/helpers/debug'),
    //Conf
    conf = require('./conf/conf'),
    //DB
    couchdb = require('./libs/node-couchdb/lib/couchdb'),
    client = couchdb.createClient(5984, 'localhost'),
    db = client.db(conf.read().db);
    
    fs = require('fs');

http.createServer(function (req, res) {
    req.setEncoding("utf8");
    req.content = '';
    
    requestId = requestFilname(req);
    nodeExists(req, res);
    
    
}).listen(8124, "127.0.0.1");

function saveRequestToCouch(doc) {
    db.saveDoc(requestId, {'data' : doc}, function(er, ok) {
        if (er) {
            sys.puts('Error saving the Request ' + JSON.stringify(er));
        } else {
            sys.puts('Saved Request');
        }
    });
}

function nodeExists(req, res) {
    db.getDoc(requestId, function(error, doc) {
        if(error) {
            sys.puts(debug.dump(error));
            if ('not_found' === error.error && 'missing' === error.reason) {
                doc = doRequest(req);
            } else {
                sys.puts(JSON.stringify(error));
            }
        } else {
            outputCached(res, doc);
        }
    });
}

function outputCached(res, doc) {
    sys.puts('serving doc from couchdb');
    res.setHeader("Content-Type", "text/xml");
    res.write(doc.data.data);
    
    res.end();
}

function outputReal(doc) {
    sys.puts(debug.dump(doc));
    // sys.puts('serving doc from couchdb');
    // res.setHeader("Content-Type", "text/xml");
    // res.write(doc.data.data);
    // 
    // res.end();
}



function requestFilname(req) {
    var permanentUrl = req.url.replace(/&lsid=[^&]+/, '').replace(/&from=[^&]+/, '').replace(/&to=[^&]+/, ''),
        key = {
            url: permanentUrl,
            method: req.method,
            body: req.content
        },
        hash = crypto.createHash('sha1');

    hash.update(JSON.stringify(key));

    // TODO Change in Frontend 1 impl. to x-test instead of x-testcase
    var testcase = req.headers['x-test'] || 'default',
        directory = path.join(cacheroot, testcase);
    console.log("testcase: " + testcase);

    var host = urlparse(req.url).hostname;
    var filename = host + "_" + hash.digest('hex');

    return filename;
}


function doRequest(req) {
    var url = urlparse(req.url);
    var httpClient = http.createClient((url.port || 80), url.hostname),
        request = httpClient.request(req.method, 
                                     url.pathname + (url.search || ''), 
                                     {'host': url.hostname});
                                     

    request.write(req.content);
    request.end();
    
    request.on('response', function(response) {
        response.setEncoding('utf8');
        getContent(response, function(content){
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
            
            doc = getDataObject(data, content);
            
            saveRequestToCouch(doc);
        });
        
    });
}

function getDataObject(data, content) {
    doc = {
            server : data.response.headers.server,
            path : data.request.url,
            getParams : '{1,2,3}',
            postParams : '{1,2,3}',
            date : data.response.headers.date,
            data : content,
            testCase : 'the test case',
            testName : 'the test name'
        };
    return doc;
}

function getContent(stream, callback) {
    var content = "";
    
    stream.on("data", function(chunk) {
        content += chunk;
    });
    
    stream.on("end", function() {
        callback(content);
    });
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