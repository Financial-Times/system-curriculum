<!DOCTYPE html>
<html>
	<head>
		{{> _head }}
	</head>
	<body>
		{{> _header }}
		<div id='content' class="o-grid-container">
			<h2>{{title}}</h2>
			These roll-up individual team results across an entire programme.
			<ul>
				{{#programmes}}<li><a href="/programme/{{dataItemID}}">{{name}}{{^name}}{{dataItemID}}{{/name}}</a></li>{{/programmes}}
			</ul>
		</div>
		{{> _footer}}
	</body>
</html>
