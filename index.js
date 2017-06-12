const express = require('express'),
	bodyParser = require('body-parser'),
	mustacheExpress = require('mustache-express'),
	path = require('path'),
	CMDB = require( "cmdb.js" ),
	querystring = require('querystring');
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
		// Race every individual check against a promise which errors after 5 seconds
		var timeout = new Promise(function (resolve, reject) {
			setTimeout(reject, 9000, "Timed Out after 9 seconds");
		});
		var healthchecks = [];
		healthchecks.push(Promise.race([cmdb.getItem(null, 'system', 'system-registry'), timeout]).then(result => {
			return false;
		}).catch(error => {
			return error.message;
		}).then(output => {
			 return {
				id: 'cmdb-connection',
				name: "Connectivity to CMDB",
				severity: 1,
				businessImpact: "Can't manage view or update curriculum data",
				technicalSummary: "App can't connect make a GET request to CMDB",
				panicGuide: `Check for alerts related to cmdb.ft.com.	Check connectivity to cmdb.ft.com
If the Check Output is showing timeouts, this likely due to slowness with CMDB - escalate to the team responsible for CMDB. `,
				lastUpdated: new Date().toISOString(),
				checkOutput: output,
				ok: !output,
			};
		}));
		levels.forEach(level => {
			var output = {
				id: `reverse-${level.relationship}`,
				name: `Reverse for relationship type '${level.relationship}'`,
				severity: 1,
				businessImpact: `Can't view curriculum dashboards`,
				technicalSummary: `No reverseID found for relationship ${level.relationship} CMDB v2`,
				panicGuide: `If 'Connectivity to CMDB' check is failing, fix that first.  
If the Check Output is showing timeouts, this likely due to slowness with CMDB - escalate to the team responsible for CMDB. 
Otherwise escalate to engineering team, who should check the API repsonse of CMDB v2 for '/relationshiptypes/${level.relationship}'.  Ensure the 'reverseID' field of the relationship is populated` ,
				lastUpdated: new Date().toISOString(),
			};
			healthchecks.push(Promise.race([getLevelReverse(level), timeout]).then(reverseID => {
				output.checkOutput = reverseID;
				output.ok = true;
				return output;
			}).catch(error => {
				output.checkOutput = error.message || error;
				output.ok = false;
				return output;
			}));
		});
		supportedTeamIDs.forEach(teamid => {
			var output = {
				id: `team-${teamid}`,
				name: `Check for team '${teamid}'`,
				severity: 1,
				businessImpact: `Can't view or update curriculum for team '${teamid}'`,
				technicalSummary: `No contact with id '${teamid}' found in CMDB v2`,
				panicGuide: `If 'Connectivity to CMDB' check is failing, fix that first.  
If the Check Output is showing timeouts, this likely due to slowness with CMDB - escalate to the team responsible for CMDB. 
Otherwise escalate to the team responsible for this application, who should check the API repsonse of CMDB v2 for '/items/contact/${teamid}'.  Ensure the 'name' field of the item is populated` ,
				lastUpdated: new Date().toISOString(),
			};
			healthchecks.push(Promise.race([getTeam({}, teamid, true), timeout]).then(teamdata => {
				if (!teamdata.name) throw `Name not found for '${teamid}'`;
				output.checkOutput = `${teamdata.name}`;
				output.ok = true;
				return output;
			}).catch(error => {
				output.checkOutput = error.message || error;
				output.ok = false;
				return output;
			}));
		})
		return Promise.all(healthchecks);
	}
});

// Add authentication to everything which isn't one of the standard ftwebservice paths
const authS3O = require('s3o-middleware');
app.use(authS3O);
app.use(function(req, res, next) {
  res.setHeader('Cache-Control', 'no-cache');
  next();
});

var prefetches = [];
const levels = [
	{
		"label": "In Depth Understanding",
		"relationship": "knowsAbout",
		"value": 3,
	},
	{
		"label": "Aware of how it works",
		"relationship": "awareOf",
		"value": 2,
	},
	{
		"label": "Not looked at it",
		"relationship": "notLookedAt",
		"value": 1,
	}
];
const unknownLevel = {
	"label": "Unknown",
	"relationship": "unknown",
	"value": 0,
}
levels.forEach(level => {
	prefetches.push(getLevelReverse(level));
});

/**
 * Should work for all teams in CMDB, but we'll monitor these ones an put them on the index page
 */
const supportedTeamIDs = [
	"contentplatformsupport",
	"livepublishing",
]

function getLevelReverse (level) {
	return cmdb._fetch({}, `relationshiptypes/${level.relationship}`, null, 'GET').then(levelRel => {
		if (!levelRel.reverseID) throw `Can't find reverse relationship for '${level.relationship}'`;
		level.reverse = levelRel.reverseID;
		return level.reverse;
	});
}


/**
 * Gets a list of systems from the CMDB for the nav
 */
app.use((req, res, next) => {
	var getTeams = [];
	supportedTeamIDs.forEach(teamid => {
		getTeams.push(getTeam(res.locals, teamid).catch(error => {
			console.error(teamid, error);
			return null;
		}));
	});
	Promise.all(getTeams).then(teams => {

		// Filter out teams not in CMDB
		res.locals.supportedteams = teams.filter(team => {
			return !!team;
		});
		next();
	}).catch(error => {
		next(error);
	});
});

/**
 * Gets a list of systems from the CMDB and renders them
 */
app.get('/', (req, res, next) => {
	var getTeams = [];
	supportedTeamIDs.forEach(teamid => {
		getTeams.push(getTeam(res.locals, teamid).catch(error => {
			console.error(teamid, error);
			return null;
		}));
	});
	Promise.all(getTeams).then(teams => {

		// Filter out teams not in CMDB
		teams = teams.filter(team => {
			return !!team;
		});
		res.render('index', {
			supportedteams: res.locals.supportedteams,
		});
	}).catch(error => {
		next(error);
	});
});

app.get('/otherteams', (req, res) => {
	if (req.query.teamid) res.redirect(303, `/team/${req.query.teamid}`);
	else res.render('otherteams', {
		supportedteams: res.locals.supportedteams,
		otherteamsselected: true,
	});
});
app.get('/docs', (req, res) => {
	res.render('docs', {
		supportedteams: res.locals.supportedteams,
	});
});

/**
 * Gets a list of systems from the CMDB and renders them
 */
app.get('/team/:teamid', (req, res) => {
	var teaminnav = false;
	res.locals.supportedteams.forEach(team => {
		if (team.dataItemID == req.params.teamid) {
			team.selected = true;
			teaminnav = true;
		}
	});
	getTeamSystems(res.locals, req.params.teamid).then(teamsystems => {
		var teammembers = teamsystems.teammembers;
		var systemList = teamsystems.systemList;
		var updateTimes = teamsystems.systemList;
		var memberList = [];
		for (var id in teammembers) {
			let lastUpdated;
			if (id in updateTimes) {
				lastUpdate = updateTimes[id].toLocaleString();
			} else {
				lastUpdate = "Uknown";
			}
			memberList.push({
				name: teammembers[id].name || id,
				id: id,
				lastUpdate: lastUpdate,
			});
		}
		systemList.forEach(system => {
			system.members = [];
			let totalvalue = 0;
			let valuecount = 0;
			let indepths = 0;
			for (var id in teammembers) {
				let level = teammembers[id].systemlevels[system.id] || unknownLevel;
				
				// Only count in the average if a level has been set
				if (level.value) {
					totalvalue += level.value;
					valuecount++;
				}
				if (level.relationship == "knowsAbout") indepths++;
				system.members.push({
					id: id,
					level: level.relationship,
					levellabel: level.label,
				});
			}

			/** Data for aveage score column **/
			if (valuecount) {
				system.avglevel = (totalvalue / valuecount).toFixed(2);
				if (system.avglevel >= 2) {
					system.avgclass = "good";
				} else if (system.avglevel >= 1.5) {
					system.avgclass = "medium";
				} else {
					system.avgclass = "poor";
				}
			} else {
				system.avglevel = "unknown";
				system.avgclass = "unknown";
			}

			/** Data regarding column for number of members with In Depth relationship **/
			system.indepths = indepths;
			let indepthspercent = (indepths / memberList.length) * 100;
			if (indepthspercent >= 60) {
				system.indepthclass = "good";
			} else if (indepthspercent >= 40) {
				system.indepthclass = "medium";
			} else {
				system.indepthclass = "poor";
			}
			system.indepthspercent = indepthspercent.toFixed();
		});
		res.render('teamoverview', {
			title: teamsystems.teamname + " Systems",
			teamname: teamsystems.teamname,
			teamid: teamsystems.teamid,
			systems: systemList,
			members: memberList,
			supportedteams: res.locals.supportedteams,
			otherteamsselected: !teaminnav,
		});
	}).catch(error => {
		var message = `Unable to read team '${req.params.teamid}' from CMDB (${error})`;
		console.error(message, error);
		res.status(502);
		res.render("error", {message: message});
	});
});

app.get('/team/:teamid/form', (req, res) => {
	var teaminnav = false;
	res.locals.supportedteams.forEach(team => {
		if (team.dataItemID == req.params.teamid) {
			team.selected = true;
			teaminnav = true;
		}
	});
	var contactid = res.locals.s3o_username.replace('.', '').toLowerCase();
	var systemlevels = {};
	getTeamSystems(res.locals, req.params.teamid).then(teamsystems => {
		if (contactid in teamsystems.teammembers) {
			systemlevels = teamsystems.teammembers[contactid].systemlevels;
		} else {
			systemlevels = {};
		}

		// Show list of levels for each systems, and include current selected one
		var systems = teamsystems.systems.map(system => {
			system.levels = levels.map(level => {
				let selected = (systemlevels[system.dataItemID] == level);
				if (selected) system.populated = true;
				return {
					label: level.label,
					relationship: level.relationship,
					selected: selected,
				};
			});
			return system;

		// Sort the systems, so unpopulated ones come first
		}).sort((a, b) => {
			if (a.populated == b.populated) return a.name.localeCompare(b.name);
			if (a.populated) return 1;
			return -1;
		});
		res.render('form', {
			title: teamsystems.teamname + " Systems | Update Form",
			teamname: teamsystems.teamname,
			teamid: teamsystems.teamid,
			systems: systems,
			supportedteams: res.locals.supportedteams,
			otherteamsselected: !teaminnav,
		});
	}).catch(error => {
		res.status(502);
		res.render("error", {message: "Unable to read form details ("+error+")"});
	});

});

app.post('/team/:teamid/form', (req, res) => {
	var contactid = res.locals.s3o_username.replace('.', '').toLowerCase();
	getTeamSystems(res.locals, req.params.teamid).then(teamdata => {
		var fetches = []
		teamdata.systems.forEach(system => {
			levels.forEach(level => {

				// If the user has selected this option, add it to CMDB
				// Otherwise delete it from CMDB
				var method = (req.body[system.dataItemID] == level.relationship) ? "PUT" : "DELETE";
				var path = `relationships/contact/${contactid}/${level.relationship}/system/${system.dataItemID}`;
				fetches.push(cmdb._fetch(res.locals, path, null, method));
			});
		});
		return fetches;
	}).then(() => {
		res.redirect(303, `/team/${req.params.teamid}`);
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

Promise.all(prefetches).catch(error => {
	console.error(error);
}).then(() => {
	app.listen(port, () => {
		console.log('App listening on port '+port);
	});
});

var teamcache = {};

/**
 * Gets info about a given team from CMDB
 * Store it in a local cache to help performance
 */
function getTeam(reslocals, teamid, bypassCache) {
	var fetchTeam = cmdb._fetch(reslocals, 'items/contact/'+encodeURIComponent(teamid), 'outputfields=name').then(teamdata => {
		teamcache[teamid] = teamdata;
		return teamdata;
	});

	// If there's already data about the team in the cache, return that and let the fetch update the cache asynchronously
	if (!bypassCache && teamid in teamcache) {
		return Promise.resolve(teamcache[teamid]);
	}

	// If it's not in the cache, we need to wait for the response from CMDB
	return fetchTeam;
}

/**
 * Gets info about all the systems owned by a given team
 * Not cached to ensure we always get the latest
 */
function getTeamSystems(reslocals, teamid, bypassCache) {
	return getTeam(reslocals, teamid, bypassCache).then(teamdata => {
		var systems = [];
		if (!teamdata.isSecondaryContactfor) {
			teamdata.isSecondaryContactfor = {system: []};
		}
		var reverseLevels = levels.map(level => level.reverse).join(',');
		var fetchparams = {
			'secondaryContact.dataItemID': teamid,
			outputfields: 'name,lifecycleStage,'+reverseLevels,
			relationshipOutputfields: 'name,relLastUpdate,status',
		}
		var url = cmdb.api + 'items/system?' + querystring.stringify(fetchparams)
		return cmdb._fetchAll(reslocals, url).then(systems => {			
			var teammembers = {};
			var systemList = [];
			var updateTimes = {};

			// Ignore decommed systems
			systems = systems.filter(system => (!system.lifecycleStage || system.lifecycleStage.toLowerCase() != "retired"))
			systems.forEach(system => {
				levels.forEach(level => {
					if (!(level.reverse in system) || !('contact' in system[level.reverse])) return;
					system[level.reverse].contact.forEach(contact => {

						// Ignore people who have left
						if (contact.status && contact.status.toLowerCase() == "inactive") return;
						if (!(contact.dataItemID in teammembers)) {
							teammembers[contact.dataItemID] = {
								name: contact.name,
								systemlevels: {},
							};
						}
						teammembers[contact.dataItemID].systemlevels[system.dataItemID] = level;
						if (contact.relLastUpdate) {
							let lastUpdate = new Date(contact.relLastUpdate);
							if (contact.dataItemID in updateTimes) {
								if (lastUpdate > updateTimes[contact.dataItemID]) {
									updateTimes[contact.dataItemID] = lastUpdate;
								}
							} else {
								updateTimes[contact.dataItemID] = lastUpdate;
							}
						}
					});
				});
				systemList.push({
					id: system.dataItemID,
					name: system.name || system.dataItemID,
				});
			});

			return {
				teamid: teamid,
				teamname: teamdata.name,
				systems: systems,
				teammembers: teammembers,
				systemList: systemList,
				updateTimes: updateTimes,
			}
		});
	})
}
