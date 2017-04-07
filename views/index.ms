<!DOCTYPE html>
<html>
	<head>
		{{> _head }}
	</head>
	<body>
		{{> _header }}
		<div id='content' class="o-grid-container">
			A tool for keeping track of how much people feel they know about our systems.
			<h2>Supported Teams</h2>
			<small>This tool has been written by the content programme to keep track of systems run by our teams.</small>
			<ul>
				{{#teams}}<li><a href="/team/{{dataItemID}}">{{name}}{{^name}}{{dataItemID}}{{/name}}</a></li>{{/teams}}
			</ul>
			<h2>Unsupported Teams</h2>
			<small>The tool should also work for other teams whose systems are in CMDB.  However, we don't test or monitor it for those teams.  If you are interested using the tool for your team and don't want it to sporadically break, please find a central team to support it.  We'll happily hand it over to them.</small>
			<br/><br/>
			<form action="/unknownteam" method="get">
				<div class="o-forms">
					<label for="unknownteam" class="o-forms__label">CMDB Contact ID for team</label>
					<input type="text" name="teamid" class="o-forms__text" id="unknownteam" placeholder="eg contentplatformsupport" />
				</div>
				<input type="submit" class="o-buttons o-buttons--standout o-buttons--big" value="Go" />
			</form>


		</div>
		{{> _footer}}
	</body>
</html>
