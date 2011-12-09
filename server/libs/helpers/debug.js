var sys = require('util');

// http://www.openjs.com/scripts/others/dump_function_php_print_r.php
exports.dump = function(data) {
    sys.puts(sys.inspect(data));
}