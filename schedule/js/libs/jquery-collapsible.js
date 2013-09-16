;(function ( $, window, document, undefined ) {

		var pluginName = "collapsible";

		// Plugin constructor
		function Plugin ( element ) {
				this.element = element;
				this.target = $(element).attr('data-target');								
				this._name = pluginName;
				this.init();
		}

		Plugin.prototype = {
				init: function () {
						var el = this;
						
						$(el.element).on('click', function(e) {
							e.preventDefault();
							el.toggle();	
						});
				},	
				show: function () { 
					$(this.element).removeClass('collapsed').find('.visuallyhidden').text(' Section is expanded. Click to collapse.');;
					$(this.target)
						.show()
						.attr({
							'aria-hidden': 'false',
					        'aria-expanded': 'true'
						  });
				},
				hide: function () {
					$(this.element).addClass('collapsed').find('.visuallyhidden').text(' Section is collapsed. Click to expand.');;
					$(this.target)
						.hide()
						.attr({
							'aria-hidden': 'true',
					        'aria-expanded': 'false'
						  });;	
				},			
				toggle: function() { 
					this[$(this.element).hasClass('collapsed') ? 'show' : 'hide']()
				}
		};

		// Plugin wrapper to prevent against multiple instantiations
		$.fn[ pluginName ] = function ( options ) {
				return this.each(function() {
						if ( !$.data( this, "plugin_" + pluginName ) ) {
								$.data( this, "plugin_" + pluginName, new Plugin( this, options ) );
						}
				});
		};

})( jQuery, window, document );
