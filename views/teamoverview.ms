<!DOCTYPE html>
<html>
	<head>
		{{> _head }}
	</head>
	<body>
		{{> _header }}
		<div id='content' class="o-grid-container">

			<h1>{{teamname}}</h1>
			<a href="/team/{{teamid}}/form" class='addresponse'><button class="o-buttons o-buttons--standout o-buttons--big">Add Response</button></a>
			<table class="o-table o-table--responsive-overflow o-table--row-stripes" data-o-component="o-table">
				<thead>
					<th class="system" title="Name of System as appears in CMDB">System</th>
					{{#members}}<th>{{name}}</th>{{/members}}
					<th class="average" title="Average knowledge score for the system (Only counting team members who have given a score)">Average Score</th>
					<th class="indepth" title="Absolute number of members with in depth knowledge of the system.  (Percentages are out of all members listed here, regardless of if they've scored every system)"># In Depth</th>
				</thead>
				<tbody>
				{{#systems}}
					<tr>
						<td class="system">{{name}}</td>
						{{#members}}<td class="{{level}}" title="{{levellabel}}">{{level}}</td>{{/members}}
						<td class="average {{avgclass}} o-table__cell--numeric">{{avglevel}}</td>
						<td class="indepth {{indepthclass}} o-table__cell--numeric">{{indepths}} {{#indepths}}({{indepthspercent}}%){{/indepths}}</td>
					</tr>
				{{/systems}}
				</tbody>
			</table>
		</div>
		{{> _footer}}
	</body>
</html>
