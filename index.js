const express = require('express'),
	bodyParser = require('body-parser'),
	mustacheExpress = require('mustache-express'),
	path = require('path'),
	CMDB = require( "cmdb.js" ),
	ftwebservice = require('express-ftwebservice');
require('es6-promise').polyfill();

/** Set up express app **/
const app = express();
app.use(bodyParser.json({limit: '8mb'}));
app.use(bodyParser.urlencoded({limit: '8mb', extended: true }));
app.engine('ms', mustacheExpress());
app.set('view engine', 'ms');
app.set('views', __dirname + '/views');
app.use(express.static('public'));


/** Environment variables **/
const port = process.env.PORT || 8080;
const cmdb = new CMDB({
	api: process.env.CMDB_API,
	apikey: process.env.CMDB_APIKEY,
});

/** Setup standard FT endpoints **/
ftwebservice(app, {
	manifestPath: path.join(__dirname, 'package.json'),
	about: {
		"systemCode": "system-curriculum",
		"name": "System Curriculum",
		"audience": "FT Technology",
		"serviceTier": "bronze",
	},

	// Also pass good to go.  If application is healthy enough to return it, then it can serve traffic.
	goodToGoTest: function() {
		return new Promise(resolve => {
			resolve(true);
		});
	},

	// Check that track can talk to CMDB
	healthCheck: function() {
		return cmdb.getItem(null, 'system', 'system-registry').then(result => {
			return false;
		}).catch(error => {
			return error.message;
		}).then(output => {
			 return [{
				id: 'cmdb-connection',
				name: "Connectivity to CMDB",
				ok: !output,
				severity: 1,
				businessImpact: "Can't manage system information through the UI",
				technicalSummary: "App can't connect make a GET request to CMDB",
				panicGuide: "Check for alerts related to cmdb.ft.com.	Check connectivity to cmdb.ft.com",
				checkOutput: output,
				lastUpdated: new Date().toISOString(),
			}];
		});
	}
});

// Add authentication to everything which isn't one of the standard ftwebservice paths
const authS3O = require('s3o-middleware');
app.use(authS3O);
app.use(function(req, res, next) {
  res.setHeader('Cache-Control', 'no-cache');
  next();
});

/**
 * Gets a list of systems from the CMDB and renders them
 */
app.get('/', (req, res) => {
	res.render('index', {});
});

/**
 * Gets a list of systems from the CMDB and renders them
 */
app.get('/team/:teamid', (req, res) => {
	getTeamSystems(res.locals, req.params.teamid).then(teamsystems => {
		res.render('teamoverview', {
			title: teamsystems.teamname + " Systems",
			teamid: teamsystems.teamid,
		});
	}).catch(error => {
		res.status(502);
		res.render("error", {message: "Unable to read team from CMDB ("+error+")"});
	});
});

app.get('/team/:teamid/form', (req, res) => {
	getTeamSystems(res.locals, req.params.teamid).then(teamsystems => {
		res.render('form', {
			title: teamsystems.teamname + " Systems | Update Form"
		});
	}).catch(error => {
		res.status(502);
		res.render("error", {message: "Unable to read team from CMDB ("+error+")"});
	});

});

app.use((req, res) => {
	res.status(404).render('error', {message:"Page not found."});
});

app.use((err, req, res) => {
	console.error(err.stack);
	res.status(500);
	if (res.get('Content-Type') && res.get('Content-Type').indexOf("json") != -1) {
		res.send({error: "Sorry, an unknown error occurred."});
	} else {
		res.render('error', {message:"Sorry, an unknown error occurred."});
	}
});

app.listen(port, () => {
	console.log('App listening on port '+port);
});

function getTeamSystems(reslocals, teamid) {
	return cmdb.getItem(reslocals, 'contact', teamid).then(teamdata => {
		var systemFetches = [];
		teamdata.isSecondaryContactfor.system.forEach(system =>{
			systemFetches.push(cmdb.getItem(reslocals, 'system', system.dataItemID));
		});
		return Promise.all(systemFetches).then(systems => {
			return {
				teamid: teamid,
				teamname: teamdata.name,
				systems: systems,
			}
		});
	})
}
