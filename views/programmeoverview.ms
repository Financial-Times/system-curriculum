<!DOCTYPE html>
<html>
	<head>
		{{> _head }}
	</head>
	<body>
		{{> _header }}
		<div id='content'>

			<h1>{{programmename}} Programme Summary</h1>
			<table class="o-table o-table--responsive-overflow progtable" data-o-component="o-table">
				<thead>
					<th class="system" title="Name of System as appears in CMDB">System</th>
					<th title="Name of the engineering team who own the system">Team</th>
					<th title="Service Tier of the system">Service Tier</th>
					<th title="Average knowledge score for the system (Only counting team members who have given a score)">Team Comfort&nbsp;Level</th>
					<th title="Absolute number of members with in depth knowledge of the system.">Key&nbsp;People Dependencies</th>
				</thead>
				<tbody>
				{{#systems}}
					<tr{{#stripe}} class="stripe"{{/stripe}}>
						<td class="system">{{name}} <a href="https://dewey.ft.com/{{id}}.html" class="runbooklink" target="_blank">Runbook</a></td>
						<td class="">{{teamname}}</td>
						<td class="serviceTier">{{serviceTier}}</td>
						<td class="average {{avgclass}} o-table__cell--numeric">{{avglevel}}</td>
						<td class="indepth {{indepthclass}} o-table__cell--numeric">{{indepths}}</td>
					</tr>
				{{/systems}}
				</tbody>
			</table>
			<div>
				<h2>Team Reports</h2>
			<ul>
				{{#teams}}
				<li><a href="/team/{{id}}">{{name}}</a></li>
				{{/teams}}
			</ul>
			</div>
		</div>
		{{> _footer}}
	</body>
</html>
