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
					<th class="system">System</th>
					{{#members}}<th>{{name}}</th>{{/members}}
					<th class="average">Average Score</th>
				</thead>
				<tbody>
				{{#systems}}
					<tr>
						<td class="system">{{name}}</td>
						{{#members}}<td class="{{level}}">{{level}}</td>{{/members}}
						<td class="average {{avgclass}}">{{avglevel}}</td>
					</tr>
				{{/systems}}
				</tbody>
			</table>
		</div>
		{{> _footer}}
	</body>
</html>
