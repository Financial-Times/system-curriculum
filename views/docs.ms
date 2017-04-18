<!DOCTYPE html>
<html>
	<head>
		{{> _head }}
	</head>
	<body>
		{{> _header }}
		<div id='content' class="o-grid-container">
			<h1>Documentation</h1>
			<h2>Overview</h2>
			<p>The System Curriculum is a tool for keeping track of how much people feel they know about our systems.  It was written by the Content Programme, inspired by a spreadsheet used by the ft.com team.  It relies on CMDB for getting the list of systems and storing information about them.</p>
			<h2>What data is surfaced on the Overview Table?</h2>
			<p>Systems are listed if:
				<ul>
					<li>They appear in the CMDB with a type `system`</li>
					<li>They are <strong>not</strong> marked with a `lifecycleStage` of "retired"</li>
					<li>They have a `secondaryContact` relationship to the team you are viewing</li>
				</ul>
				Systems are identified internally using their system code.  In the UI, they are displayed using their `name` (falls back to system code if `name` is missing).
			</p>
			<p>People are listed if:
				<ul>
					<li>The appear in the CMDB with a type `contact`</li>
					<li>They are <strong>not</strong> marked with a `status` of "inactive"</li>
					<li>They have filled in the form for at least one system listed.</li>
				</ul>
				Systems are identified internally using their username from s<sub>3</sub>o, minus any periods.  In the UI, they are displayed using their `name` (falls back to the identifier if `name` is missing from CMDB).
			</p>
			<h2>What if my team isn't listed on the homepage?</h2>
			<p>See the <a href="/otherteams">Other Teams Page</a>.</p>

		</div>
		{{> _footer}}
	</body>
</html>
