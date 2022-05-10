let fs = require('fs')
let Camera = require('./../controllers/Camera')

module.exports = function(sensorController) {
    this.sensorController = sensorController
    this.cameraController = new Camera()

    this.setup = function(config, callback) {
        let homedir = require('os').homedir()
        let confFilePath = '/var/lib/homebridge/config.json'

        var alarmEnabled = false
        var cameraEnabled = false
        
        if (config != null) {
            if (config.alarmEnabled != null) {
                alarmEnabled = config.alarmEnabled
            }
            if (config.cameraEnabled != null) {
                cameraEnabled = config.cameraEnabled
            }
        }

        if(!fs.existsSync(confFilePath)) {
            this.createEmptyConfigFile(confFilePath)
        }
        fs.readFile(confFilePath, (err, data) => {
            let config = JSON.parse(data)
            this.getAccessories((accessories) => {
                config.accessories = accessories
                if (alarmEnabled) {
                    config.accessories.push(this.getAlarm())
                }
                this.getPlatforms((cameras) => {
                    if (cameraEnabled) {
                        if (cameras != null) {
                            config.platforms = cameras
                        }
                    }
                    fs.writeFile(confFilePath, JSON.stringify(config), (err) => {
                        callback(true)
                    })
                })
            })
        })
    }

    this.getAccessories = function(callback) {
        this.sensorController.getNodeList((list) => {
            let accessories = []
            for (node of list) {
                if (node.type == 'pir' || node.type == 'dws') {
                    let type = node.type == 'pir' ? 'motion-sensor' : 'ContactSensor'
                    let data = {
                        accessory: type,
                        name: node.label,
                        pollInterval: 1000,
                        statusUrl: 'http://localhost:8888/api/node/'+node.id
                    }
                    accessories.push(data)
                }
            }
            callback(accessories)
        })
    }

    this.getPlatforms = function (callback) {
        this.cameraController.init(this.sensorController.freeboxRequest, (done, list) => {
            let platforms = []
            var ffmpegCams = {
                platform: "Camera-ffmpeg",
                cameras: []
            }
            for (cam of list) {
                if (cam.ip != '0.0.0.0') {
                    let camera = {
                        "name": cam.node_data.label,
                        "manufacturer": "Freebox",
                        "model": "RocketCam",
                        "serialNumber": '1337'+cam.id,
                        "motion": true,
                        "videoConfig": {
                            "source": '-re -i rtsp://'+cam.ip+'/live',
                            "audio": true,
                            "additionalCommandline": "-pix_fmt yuv420p -x264-params intra-refresh=1:bframes=0"
                        }
                    }
                    ffmpegCams.cameras.push(camera)
                }
            }
            platforms.push(ffmpegCams)
            callback(platforms)
        })
    }

    this.getAlarm = function () {
        let alarm = {
            accessory: "Http-SecuritySystem",
            name: "Alarme",
            username: "",
            password: "",
            immediately: false,
            polling: true,
            pollInterval: 3000,
            http_method: 'GET',
            urls: {
                "stay": {
                    "url": "http://localhost:8888/api/alarm/home",
                    "body": null
                },
                "away": {
                    "url": "http://localhost:8888/api/alarm/main",
                    "body": null
                },
                "night": {
                    "url": "http://localhost:8888/api/alarm/secondary",
                    "body": null
                },
                "disarm": {
                    "url": "http://localhost:8888/api/alarm/off",
                    "body": null
                },
                "readCurrentState": {
                    "url": "http://localhost:8888/api/alarm/state",
                    "body": null
                },
                "readTargetState": {
                    "url": "http://localhost:8888/api/alarm/target",
                    "body": null,
                    "headers": {
                        "Content-Type": "text/html"
                    }
                }
            }
        }
        return alarm
    }

    this.randomHex = function(len) {
        var maxlen = 8,
            min = Math.pow(16,Math.min(len,maxlen)-1) 
            max = Math.pow(16,Math.min(len,maxlen)) - 1,
            n = Math.floor(Math.random() * (max-min+1)) + min,
            r = n.toString(16);
        while (r.length < len) {
           r = r + randHex(len - maxlen)
        }
        return r
    }

    this.createEmptyConfigFile = function(dir) {
        var mac = this.randomHex(2)
        for (var j = 1;j<6;j++) {
            mac = mac + ':' + this.randomHex(2);
        }
        mac = mac.toUpperCase()
        let data = {
                "bridge": {
                    "name": "Freebox Homebridge",
                    "username": mac,
                    "port": 51826,
                    "pin": "123-45-678"
                },
                "description": "Homebridge configuration file.",
                "ports": {
                    "start": 52100,
                    "end": 52150,
                    "comment": "This section is used to control the range of ports that separate accessory (like camera or television) should be bind to."
                },
                "accessories": [],
                "platforms": []
            }
        fs.writeFileSync(dir, JSON.stringify(data));
        console.log('[i] Homebridge config file created')
    }
}
