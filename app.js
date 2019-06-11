/*
* Simple voting app
*/

const http = require('http');
var fs = require('fs');

// Change to what is preferred. Im just running locally!
const hostname = '127.0.0.1';
const port = 8080;

// votes file
var votes_file = "votes/votes.csv";
var week_stats_file = "votes/votes_week.csv";

function not_found(res) {
	res.statusCode = 404;
    res.end();
}

function ok(res) {
	res.statusCode = 200;
	res.end();
}

/**
 * Source: https://stackoverflow.com/questions/9045868/javascript-date-getweek
 *
 * Returns the week number for this date.  dowOffset is the day of week the week
 * "starts" on for your locale - it can be from 0 to 6. If dowOffset is 1 (Monday),
 * the week returned is the ISO 8601 week number.
 * @param int dowOffset
 * @return int
 */
Date.prototype.getWeek = function (dowOffset) {
/*getWeek() was developed by Nick Baicoianu at MeanFreePath: http://www.meanfreepath.com */

    dowOffset = typeof(dowOffset) == 'int' ? dowOffset : 0; //default dowOffset to zero
    var newYear = new Date(this.getFullYear(),0,1);
    var day = newYear.getDay() - dowOffset; //the day of week the year begins on
    day = (day >= 0 ? day : day + 7);
    var daynum = Math.floor((this.getTime() - newYear.getTime() - 
    (this.getTimezoneOffset()-newYear.getTimezoneOffset())*60000)/86400000) + 1;
    var weeknum;
    //if the year starts before the middle of a week
    if(day < 4) {
        weeknum = Math.floor((daynum+day-1)/7) + 1;
        if(weeknum > 52) {
            nYear = new Date(this.getFullYear() + 1,0,1);
            nday = nYear.getDay() - dowOffset;
            nday = nday >= 0 ? nday : nday + 7;
            /*if the next year starts before the middle of
              the week, it is week #1 of that year*/
            weeknum = nday < 4 ? 1 : 53;
        }
    }
    else {
        weeknum = Math.floor((daynum+day-1)/7);
    }
    return weeknum;
};

function fixaveckostatistik () {
	try {

		var stats = fs.lstatSync(votes_file);

		var week_vote_avg = {};
		var week_vote_votes = {};

		if ( stats.isFile() ) {

			var data = fs.readFileSync(votes_file, "utf8");

			var regexp = /[0-9]+/g;

			var lines = data.split("\n");

			for ( var i = 0; i < lines.length; i++ ) {
				var line = lines[i];
				var match = line.match(regexp);


				if ( match != null && match.length == 4 ) {
					var year = parseInt(match[0]);
					var month = parseInt(match[1]);
					var day = parseInt(match[2]);
					var value = parseInt(match[3]);

					var d = new Date(year, month, day);

					var week = "" + d.getWeek();

					if ( week_vote_avg[week] == undefined ) {
						week_vote_avg[week] = value * 1.0;
					} else {
						week_vote_avg[week] += value * 1.0;
					}
					
					if ( week_vote_votes[week] == undefined ) {
						week_vote_votes[week] = 1;
					} else {
						week_vote_votes[week] += 1;
					}

				}

			}

			var data = "";

			for ( var week in week_vote_avg ) {
				week_vote_avg[week] /= week_vote_votes[week];

				data += week + "," + week_vote_votes[week] + "," + week_vote_avg[week].toFixed(2) + "\n";

			}

			fs.writeFile(week_stats_file, data, 'utf8');

		}

	} catch(e) { 

		var d = new Date();
		console.log("" + d + "error fixaveckostatistik: ");
		console.log(e);
	
	}

}

const server = http.createServer((req, res) => {

	if ( req.url == "/" ) {

		var html = fs.readFileSync('index.html');
		res.writeHead(200, {'Content-Type': 'text/html'});
		res.end(html);

	} else {
		
		var i = 1;
		while ( req.url[i] == "/" )
			i++;

		var url = req.url.replace(/\/+/g,'/').substr(1);

		var filereq = false;

		try {

			var stats = fs.lstatSync(url);

			if ( stats.isFile() ) {

				var html = fs.readFileSync(url);

				// mime type handling
				var datatype = "text/plain";

				if ( url.endsWith(".csv") ) {
					datatype = "text/csv";
				} else if ( url.endsWith(".jpg") ) {
					datatype = "image/jpeg";
				}

				res.writeHead(200, {'Content-Type': datatype});
				res.end(html);

				filereq = true;

			}

		} catch (e) {}

		if ( ! filereq ) {

			if ( url.startsWith("vote.cgi?value=") ) {
				// This server has one job, and one job only.

				var d = new Date();
				var value = parseInt(url.split("=")[1]);

				// If someone is messing with the site..
				if ( value > 5 ) {
					value = 4;
				} else if ( value < 0 ) {
					value = 0;
				}

				if ( !isNaN(value) ) {

					var year = d.getFullYear();
					var month = d.getMonth();
					var day = d.getDate();

					var data = year + "-" + month + "-" + day + "," + value + "\n";

					fs.appendFile(votes_file, data, 'utf8',
					    // callback function
					    function(err) { 
					        if (err) {
					        	not_found(res);
					        } else {
								// Resultat registrerat
								ok(res);

								fixaveckostatistik();
					        }
						}
					);

				}


			} else {
				not_found(res);
			}

		}

	}

});

server.listen(port, hostname, () => {
	fixaveckostatistik();
	console.log(`Server running at http://${hostname}:${port}/`);
});
