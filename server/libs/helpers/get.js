crypto = require('crypto'),
urlparse = require('url').parse,
query = require('querystring'),
debug = require('./debug'),

exports.getContent = function(stream, callback) {
    var content = "";

    stream.on("data", function(chunk) {
        content += chunk;
    });

    stream.on("end", function() {
        callback(content);
    });
}

exports.getDataObject = function(req, res, content) {
    /*
    TODO : okapi curl doesnt send what/where
    */
    var data = {
        request: {
            method: req.method,
            path: req.url,
            testCase: req.headers['x-test'],
            testName: "something",
            data: content,
            postParams: "",
            getParams: ""
        },
        response: {
            statusCode: res.statusCode,
            headers: res.headers,
            statusCode: res.statusCode
        }
    }
    return data;
}

exports.getRequestId = function(req) {
    var host,
        permanentUrl = req.url.replace(/&lsid=[^&]+/, '').replace(/&from=[^&]+/, '').replace(/&to=[^&]+/, ''),
        key = {
            url: permanentUrl,
            method: req.method,
            body: req.content
        },
        hash = crypto.createHash('sha1');

    hash.update(JSON.stringify(key));

    // TODO Change in Frontend 1 impl. to x-test instead of x-testcase
    //var testcase = req.headers['x-test'] || 'default',
    //    directory = path.join(cacheroot, testcase);
    //console.log("testcase: " + testcase);

    host = urlparse(req.url).hostname;
    return host + "_" + hash.digest('hex');
}