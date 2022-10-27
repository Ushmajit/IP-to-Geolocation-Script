/** 
 * Script to convert IP Address to geolocation.
 * Please note: this is not a generic script that will convert any IP 
 * to Geolocation. The code is written to parse specific file format.
 * 
**/

const zlib = require('node:zlib');
const decompress = require('decompress');
const fs = require('fs');
const input_dir = 'logs';
const output_dir = 'modified_logs'
const https = require('https');

const API_URL_BASE = 'https://api.findip.net/';
const API_TOKEN = '/?token=6f6006ea42fd417e9a0bb012909016be';

function run() {
    // read the input directory to get all the file names
    fs.readdirSync(input_dir).forEach(file => {
        console.log("Reading file :" + file);
        var input_path = input_dir + '/' + file;
        decompress(input_path, output_dir).then(files => {
            console.log('done!');
            modifyFiles();
        });
    });
}

function modifyFiles() {
    fs.readdirSync(output_dir).forEach(async file => {
        var completePath = output_dir + '/' + file;
        console.log("Processing File Name :" + file);
        let rawdata = fs.readFileSync(completePath);
        let jsonData = JSON.parse(rawdata);
        console.log("Total number of entries: " + jsonData.clientAnalytics.length);
        for (var i = 0; i < jsonData.clientAnalytics.length - 1; i++) {
            console.log("Processing entry number: " + i);
            var clientIP = jsonData.clientAnalytics[i].clientIP;
            var req = API_URL_BASE + clientIP + API_TOKEN;
            var geodata = await getGeoLocation(req);
            var parsed_geodata = appendGeoData(geodata);
            console.log("Got Geolocation data for entry: " + i);
            delete jsonData.clientAnalytics[i].clientIP;
            jsonData.clientAnalytics[i].geoLocation = parsed_geodata;

            if ((i % 15) === 0) {
                console.log("Pausing for 3 secs");
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
        console.log("Finished Processing File:" + file);
        fs.writeFileSync(completePath, JSON.stringify(jsonData));
    });
}

async function getGeoLocation(req) {
    return new Promise((resolve, reject) => {
		https.get(req, (response) => {
			let chunks_of_data = [];

			response.on('data', (fragments) => {
				chunks_of_data.push(fragments);
			});

			response.on('end', () => {
				let response_body = Buffer.concat(chunks_of_data);
				resolve(JSON.parse(response_body.toString()));
			});

			response.on('error', (error) => {
				reject(error);
			});
		});
	});
}

function appendGeoData(res) {
    var geoData = {'continent' : '', 'country': '', 'city': ''};
    if (res && res.continent.names.en 
        && res.country.names.en && res.city.names.en) {
            geoData.continent = res.continent.names.en;
            geoData.country = res.country.names.en;
            geoData.city = res.city.names.en;
        }
    return geoData;
}

run();
