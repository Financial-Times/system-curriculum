<!DOCTYPE html>
<html>
	<head>
		{{> _head }}
	</head>
	<body>
		{{> _header }}
		<div id='content' class="o-grid-container">
			<form action="/team/{{teamid}}/form" method="post">
				{{#systems}}
				<div class="o-forms">
					<label class="o-forms__label">{{name}} <a href="https://dewey.ft.com/{{dataItemID}}.html" class="runbooklink" target="_blank">Runbook</a></label>
					{{#levels}}
					<input type="radio" name="{{dataItemID}}" value="{{relationship}}" class="o-forms__radio" id="{{dataItemID}}_{{relationship}}" {{#selected}}checked="checked"{{/selected}}></input>
					<label for="{{dataItemID}}_{{relationship}}" class="o-forms__label">{{label}}</label>
					{{/levels}}
				</div>
				{{/systems}}
				<input type="submit" class="o-buttons o-buttons--standout o-buttons--big" value="Save" />
			</form>
		</div>
		{{> _footer}}
	</body>
</html>
