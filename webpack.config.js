var webpack = require("webpack")


var config = {
    entry: "./src/main.js",
    mode: 'development',
    output: {
        path: __dirname + "/build",
        filename: "bundle.js",
        publicPath: "/build/"
    }
}


module.exports = config