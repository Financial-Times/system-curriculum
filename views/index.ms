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
				{{#supportedteams}}<li><a href="/team/{{dataItemID}}">{{name}}{{^name}}{{dataItemID}}{{/name}}</a></li>{{/supportedteams}}
			</ul>
			<p><a href="/otherteams">Not listed?  Other teams can add enter their ID here.</a></p>
		</div>
		{{> _footer}}
	</body>
</html>
