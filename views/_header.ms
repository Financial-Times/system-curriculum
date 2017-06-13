<header class='o-header-services' data-o-component='o-header-services'>
	<div class='o-header-services__top o-header-services__container'>
		<a href="/" class='o-header-services__ftlogo'></a>
		<div class='o-header-services__title'>
			<h1 class='o-header-services__product-name'>System Curriculum</h1>
			<span class='o-header-subrand__product-tagline'>What do we know?</span>
		</div>
		<div class="o-header-services__related-content">
			<a class="o-header-services__related-content-link" href="/docs">Documentation</a>
		</div>
	</div>
	<div class="o-header-services__primary-nav">
		<div class="o-header-services__container">
			<ul class="o-header-services__nav-list">
				{{#supportedteams}}<li class="o-header-services__nav-item">
					<a class="o-header-services__nav-link{{#selected}} o-header-services__nav-link--selected{{/selected}}" href="/team/{{dataItemID}}">
						{{name}}{{^name}}{{dataItemID}}{{/name}}
					</a>
				</li>{{/supportedteams}}
				<li class="o-header-services__nav-item">
					<a class="o-header-services__nav-link{{#otherteamsselected}} o-header-services__nav-link--selected{{/otherteamsselected}}" href="/otherteams">
						Other Teams
					</a>
				</li>
				<li class="o-header-services__nav-item">
					<a class="o-header-services__nav-link{{#programmeselected}} o-header-services__nav-link--selected{{/programmeselected}}" href="/programme">
						Programme Summary
					</a>
				</li>
			</ul>
		</div>
	</div>
</header>
