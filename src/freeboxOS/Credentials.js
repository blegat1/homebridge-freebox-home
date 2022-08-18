const fs = require('fs') 

let credFilePath = './src/.store'

module.exports.update = function(token, track, callback) {
	if(fs.existsSync(credFilePath)) {
		let data = {
            		token: token,
            		track: track
        	}
		fs.writeFile(credFilePath, JSON.stringify(data), (err) => {
			console.log("[-] Updated Store file")
			callback(true)
		})
	}
}

module.exports.checkCredentialsFile = function() {
	fs.stat(credFilePath, (err, stats) => {
		if (err || !stats.isFile() || stats.size == 0) {
			let data = {
			    token: null,
			    track: null
			}
			fs.writeFile(credFilePath, JSON.stringify(data), (err) => {
				console.log("[-] Created Store file")
			})
			return true
		} else {
			console.log('[-] Store file already present')
			return false
		}   
	})
}

module.exports.getStoredCredentials = function(callback) {
	if(fs.existsSync(credFilePath)) {
		fs.readFile(credFilePath, (err, data) => {
		    let credentials = JSON.parse(data)
		    callback({
			token: credentials.token,
			track: credentials.track
		    })
		})
    	}
}
