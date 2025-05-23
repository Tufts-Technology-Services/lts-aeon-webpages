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

//// Populates the options for the billing context SELECT elements of the photoduplication request forms.
function UpdateBillingDropdowns() {
    if (typeof _formatOptions != 'undefined') {
        UpdateBillingDropdown($("#Format"), _formatOptions);
    } else {
		var format = $("#Format");
		if (format.length) {
			checkSelectPosition(format);
			format.prop("disabled", !($(RequestLinkPhoto).length && $(RequestLinkPhoto).val() != '' && format.get(0).offsetParent != null));
		}
	}

    if (typeof _shippingoptionOptions != 'undefined') {
        UpdateBillingDropdown($("#ShippingOption"), _shippingoptionOptions);
    } else {
		var shippingOption = $("#ShippingOption");
		if (shippingOption.length) {
			checkSelectPosition(shippingOption);
			shippingOption.prop("disabled", !($(RequestLinkPhoto).length && $(RequestLinkPhoto).val() != '' && shippingOption.get(0).offsetParent != null));
		}
	}

    if (typeof _servicelevelOptions != 'undefined') {
        UpdateBillingDropdown($("#ServiceLevel"), _servicelevelOptions);
    } else {
		var serviceLevel = $("#ServiceLevel");
		if (serviceLevel.length) {
			checkSelectPosition(serviceLevel);
			serviceLevel.prop("disabled", !($(RequestLinkPhoto).length && $(RequestLinkPhoto).val() != '' && serviceLevel.get(0).offsetParent != null));
		}
	}
}

//// Sets the options for a given SELECT element representing the choices for a specific billing context from the given options provided in contextOptionsArray.
//// contextOptionsArray is built as part of the #OPTION tag and is an associative array of billing categories and their billing types.
function UpdateBillingDropdown(selectElement, contextOptionsArray) {
	//Get the billing category of the selected RequestLink option. The _requestLinkBillingCategories array is created as part of the RequestLink #OPTION and
	//links the researchers, users, and activities with their corresponding billing category.
	var billingCategory = _requestLinkBillingCategories[$(RequestLinkPhoto).val()];
	
	var selectedOptionValue;
	//Check to see if the options array has an initial selected value, such as when we're editing a request and want to select the current value
	if (contextOptionsArray["_initialSelectedValue"]) {
		selectedOptionValue = contextOptionsArray["_initialSelectedValue"];
		contextOptionsArray["_initialSelectedValue"] = null;	//Set it to null so that we don't change anything the user chooses after this initial setting
	}
	else {
		//Save the current selection to try and reselect it later.
		selectedOptionValue = selectElement.val();
	}

	//Remove any existing options from the SELECT element
	selectElement.children("option").remove();

	checkSelectPosition(selectElement);
	
	selectElement.prop("disabled", !(billingCategory != null && selectElement.get(0).offsetParent != null));
	
	if (billingCategory == null) {
		return;
	}
	else {
		//Otherwise, iterate through the billing types for the given billing context and add them to the SELECT element
		for (var i = 0; i < contextOptionsArray[billingCategory].length; i++) {
			selectElement.append(
				$("<option>", {
					"value": contextOptionsArray[billingCategory][i]
				}).text(contextOptionsArray[billingCategory][i])
				.prop("selected", selectedOptionValue === contextOptionsArray[billingCategory][i]) 
			);
		}
	}
}

//// Determines if the position property of the SELECT element might cause the visibility check to fail. 
//// Failure might occur if position is set to "fixed", such as by CSS styling. We log a warning in the browser console if this is the case.
function checkSelectPosition(selectElement) {
	if(getComputedStyle(selectElement.get(0)).position === "fixed"){
		console.log("The " + selectElement.get(0).id + " SELECT element has a fixed position and its visibility may not be accurately determined by billingContextOptionHandler.js");
	}
}

// Attach UpdateBillingDropdowns to the change event of the RequestLink SELECT element.
$(RequestLinkPhoto).change(UpdateBillingDropdowns);

// Initialize the dropdowns when the document loads.
$(document).ready(UpdateBillingDropdowns());
