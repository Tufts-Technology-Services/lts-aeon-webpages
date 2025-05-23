$(document).ready(function() {
    // Get the duplication-permission-toggle radio buttons
    var radioButtons = $('input[type="radio"][data-toggle-value]');

    // Get the radio button that is selected on document ready
    var selectedButton = radioButtons.filter(':checked');
    // Set the page's visibility based on the defaulted button's visibility
    setVisibility(selectedButton.attr('data-toggle-value'));

    // Configure the radio.change event on each radio button to change visibility
    radioButtons.each(function(i, radio) {
        radio = $(radio);
        radio.change(function() {
            setVisibility(radio.attr('data-toggle-value'));
        });
    });
});

function setVisibility(groups) {
	if (!groups) return;
	
    radioValues = groups.split(' ');
    $("*[data-toggle-group]").each(function(i, el) {
        var el = $(el);
        groupValues = el.attr('data-toggle-group').split(' ');
		var enabled = groupValues.every(v => radioValues.includes(v));
        if (enabled) {
            el.show();
        } else {
            el.hide();
        }



        var RequestLinkPhoto = "#RequestLink";
        var rlPhoto = document.getElementById("RequestLinkPhoto");
        if (typeof(rlPhoto) != 'undefined' && rlPhoto != null) {
            RequestLinkPhoto = "#RequestLinkPhoto";
        } else if (document.querySelector(RequestLinkPhoto) == null) {
            if (document.querySelector("[data-ead-name='RequestLink']") != null) {
                RequestLinkPhoto = "[data-ead-name='RequestLink']";
            } else {
                RequestLinkPhoto = "[name='RequestLink']";
            }
        }

        var requestLink = document.querySelector(RequestLinkPhoto);
		var requestLinkHasValue = requestLink != null && requestLink.value != '';

        el.find('*').addBack().filter('input,textarea,button,select').each(function(i, e) {
            if (!requestLinkHasValue && (e.id === 'Format' || e.id === 'ShippingOption' || e.id === 'ServiceLevel')){
                $(e).prop('disabled', true);
            } else if (enabled && $(e).attr('data-disable-check') != undefined) {
                $(e).removeAttr('data-disable-check');
                $(e).prop('disabled', false);
            } else if (!enabled && $(e).prop('disabled') == false) {
                $(e).attr('data-disable-check', 'true');
                $(e).prop('disabled', true);
            }
        });
    })
}

