crypto = require('crypto'),
urlparse = require('url').parse,

exports.getContent = function(stream, callback) {
    var content = "";
    
    stream.on("data", function(chunk) {
        content += chunk;
    });
    
    stream.on("end", function() {
        callback(content);
    });
}

exports.getDataObject = function(data, content) {
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