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
		var healthchecks = [];
		healthchecks.push(cmdb.getItem(null, 'system', 'system-registry').then(result => {
			return false;
		}).catch(error => {
			return error.message;
		}).then(output => {
			 return {
				id: 'cmdb-connection',
				name: "Connectivity to CMDB",
				ok: !output,
				severity: 1,
				businessImpact: "Can't manage view or update curriculum data",
				technicalSummary: "App can't connect make a GET request to CMDB",
				panicGuide: "Check for alerts related to cmdb.ft.com.	Check connectivity to cmdb.ft.com",
				checkOutput: output,
				lastUpdated: new Date().toISOString(),
			};
		}));
		levels.forEach(level => {
			var output = {
				id: `reverse-${level.relationship}`,
				name: `Reverse for relationship type '${level.relationship}'`,
				severity: 1,
				businessImpact: `Can't view curriculum dashboards`,
				technicalSummary: `No reverseID found for relationship ${level.relationship} CMDB v2`,
				panicGuide: `If 'Connectivity to CMDB' check is failing, fix that first.  Otherwise escalate to engineering team, who should check the API repsonse of CMDB v2 for '/relationshiptypes/${level.relationship}'.  Ensure the 'reverseID' field of the relationship is populated` ,
				checkOutput: output,
				lastUpdated: new Date().toISOString(),
			};
			healthchecks.push(getLevelReverse(level).then(reverseID => {
				output.ok = true;
				output.checkOutput = reverseID;
				return output;
			}).catch(error => {
				output.ok = false;
				output.checkOutput = error.message || error;
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
				panicGuide: `If 'Connectivity to CMDB' check is failing, fix that first.  Otherwise escalate to engineering team, who should check the API repsonse of CMDB v2 for '/items/contact/${teamid}'.  Ensure the 'name' field of the item is populated` ,
				checkOutput: output,
				lastUpdated: new Date().toISOString(),
			};
			healthchecks.push(getTeam({}, teamid, true).then(teamdata => {
				if (!teamdata.name) throw `Name not found for '${teamid}'`;
				output.ok = true;
				output.checkOutput = teamdata.name;
				return output;
			}).catch(error => {
				output.ok = false;
				output.checkOutput = error.message || error;
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
		var teammembers = {};
		var systemList = [];
		teamsystems.systems.forEach(system => {

			// Ignore decommed systems
			if (system.lifecycleStage && system.lifecycleStage.toLowerCase() == "retired") return;
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
				});
			});
			systemList.push({
				id: system.dataItemID,
				name: system.name || system.dataItemID,
			});
		});
		var memberList = [];
		for (var id in teammembers) {
			let lastUpdated;
			if (id in teamsystems.updateTimes) {
				lastUpdate = teamsystems.updateTimes[id].toLocaleString();
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
		res.status(502);
		res.render("error", {message: "Unable to read team from CMDB ("+error+")"});
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
	var fetches = [];
	fetches.push(getTeamSystems(res.locals, req.params.teamid));
	var contactid = res.locals.s3o_username.replace('.', '').toLowerCase();
	levels.forEach(level => {
		fetches.push(
			cmdb._fetch(res.locals, `relationships/contact/${contactid}/${level.relationship}`, null, 'GET').catch((error) => {
				
				// Sometimes CMDB returns a 404 when it means empty list.
				if (error.message == "Received 404 response from CMDB") return [];
				throw error;
			})
		);
	});
	Promise.all(fetches).then(results => {
		var teamsystems = results.shift();
		var levelprefs = {};
		results.forEach(resultset => {
			resultset.forEach(levelpref => {
				if (levelpref.objectType != "system") return;
				levelprefs[levelpref.objectID] = levelpref.relationshipType;
			});
		});
		var systems = [];
		teamsystems.systems.forEach(system => {
			if (system.lifecycleStage && system.lifecycleStage.toLowerCase() == "retired") return;
			system.levels = [];
			levels.forEach(level => {
				system.levels.push({
					label: level.label,
					relationship: level.relationship,
					selected: (levelprefs[system.dataItemID] == level.relationship),
				});
			});
			systems.push(system);
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
	getTeam(res.locals, req.params.teamid).then(teamdata => {
		var fetches = []
		teamdata.isSecondaryContactfor.system.forEach(system => {
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
	var fetchTeam = cmdb.getItem(reslocals, 'contact', teamid).then(teamdata => {
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
 * Requests to CMDB happen in parallel.
 */
function getTeamSystems(reslocals, teamid) {
	return getTeam(reslocals, teamid).then(teamdata => {
		var systems = [];
		var updateTimes = {};
		teamdata.isSecondaryContactfor.system.forEach(system => {
			var fetches = [];
			fetches.push(cmdb.getItem(reslocals, 'system', system.dataItemID));
			levels.forEach(level => {
				fetches.push(cmdb._fetch(reslocals, 'relationships', `relationshipType=${level.relationship}&objectType=system&objectID=${system.dataItemID}&subjectType=contact`).catch(() => []));
			});
			systems.push(Promise.all(fetches).then(results => {
				var system = results.shift();
				system.rels = {};
				results.forEach(result => {
					result.forEach(relationship => {
						var lastUpdate = new Date(relationship.lastUpdate);
						if (relationship.subjectID in updateTimes) {
							if (lastUpdate > updateTimes[relationship.subjectID]) {
								updateTimes[relationship.subjectID] = lastUpdate;
							}
						} else {
							updateTimes[relationship.subjectID] = lastUpdate;
						}
					});
				});
				return system;
			}));
		});
		return Promise.all(systems).then(systems => {
			return {
				teamid: teamid,
				teamname: teamdata.name,
				systems: systems,
				updateTimes: updateTimes,
			}
		});
	})
}
