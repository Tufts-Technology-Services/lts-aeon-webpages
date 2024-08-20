$(document).ready(function () {

	// Search for anchor link buttons that are disabled by css. For those links, remove the href and apply relevant role and aria attributes
	// This prevents keyboard access and also provides information to screen readers about the disabled state of the link
	var disabledLinks = document.querySelectorAll("a.btn.disabled");
	disabledLinks.forEach(link => {
		link.removeAttribute("href");
		link.setAttribute("role", "link");
		link.setAttribute("aria-disabled", "true");
	});

	//Hide field-values if there is no value inside (when the field does not also have a class of showEmptyValue)
	$('.field-value:empty').closest('.field:not(.showEmptyValue)').hide();

	//Attach click event handlers to each element that controls collapsing another element and add the appropriate collapse control class
	$(document).find("[data-toggle='collapse']").each(function() {
		var _this = $(this);

		//If any of this element's targets have the collapse class, then we should use the expand-control class. Otherwise, use the collapse-control class
		if ($(_this.data("target")).filter(".collapse").length > 0) {
			_this.addClass("collapse-control-expand");
		} else {
			_this.addClass("collapse-control-collapse");
		}
		
		_this.click(function() {
			$(_this.data("target")).toggle();
			_this.toggleClass("collapse-control-expand collapse-control-collapse");
		})
	});
	
	$('.statusNormal').addClass('alert alert-secondary d-block').attr('role','alert');
	$('.statusError').addClass('alert alert-danger d-block').attr('role','alert');
	$('.statusInformation').addClass('alert alert-info d-block').attr('role','alert');
	
	//Convert server times to the user's local time
	//This can be time intensive for pages with many date/times to convert - comment out to disable conversion functionality
	$('[data-iso8601], [data-formatOnly]').each(function(index) {
		$time = $(this).attr('data-iso8601');

		//Check if there's a server date component
		// ServerTime shows as : "8/13/2019 12:41:03 PM"
		let serverTime = false;
		if ($(this).attr('data-servertime') != undefined) {
			serverTime = moment($(this).attr('data-servertime'), 'MM/DD/YYYY hh:mm:ss a');
		};

		let formatString = 'LLL';
		if ($(this).attr('data-formatString') != undefined) {
			formatString = $(this).attr('data-formatString') || formatString;
		}

		let utcTime = false;
		let localTime = false;
		if ($time != undefined) {
			utcTime = moment.utc($time);
			localTime = moment(utcTime).local();
		}	

		//We default to drop the time component when it's exactly midnight (12:00:00 AM)
		//If a specific element should show the full time regardless, the element should include
		// the data-dateOnly element and set to false: data-dateOnly="false"
		let showDateOnly = true;
		if ($(this).attr('data-dateOnly') != undefined) {
			showDateOnly = $(this).attr('data-dateOnly') === "true";
		}


		//Set the display to date only if the local time or original server time is midnight
		if (showDateOnly && formatString === 'LLL' && localTime && ((localTime.hour() == 0 && localTime.minute() == 0 && localTime.second() == 0) ||
				(serverTime != false && serverTime.hour() == 0 && serverTime.minute() == 0 && serverTime.second() == 0)))
		{
			formatString = 'LL';
		}	
		
		if (($(this).attr('data-formatOnly') != undefined) && $(this).attr('data-formatOnly') === 'true') {
			$(this).html(serverTime.format(formatString));
		} else {
			$(this).html(localTime.format(formatString));
		}
	});

	//Set the selected options based on a persisted value attribute on the select element
	//e.g. <SELECT name="dropdown" data-persisted-value="<#PARAM name='ItemInfo1'>"
	//e.g. <input checked name="SearchType" type="radio" id="SearchTypeActive" value="Active" data-persisted-value="<#PARAM name='SearchType'>"></input>
	$("select[data-persisted-value]").each(function(idx, el) { SelectPersistedValue(el) });
	$("input[type=radio][data-persisted-value],input[type=checkbox][data-persisted-value]").each(function(idx, el) { SelectPersistedValue(el) });
	//Legacy support if using "data-persistedValue"
	$("select[data-persistedValue]").each(function(idx, el) { SelectPersistedValue(el, $(el).attr('data-persistedValue')) });

	$('button.checkAll').click(function (event) {
		event.preventDefault();
		//event.stopPropagation();
		$('#' + $(this).attr('data-form') + ' input:checkbox').prop('checked', true);
	});
	$('button.checkNone').click(function (event) {
		event.preventDefault();
		//event.stopPropagation();
		$('#' + $(this).attr('data-form') + ' input:checkbox').prop('checked', false);
	});

	HandleBoolCheckboxes();
	HandleDisableSubmitOnSubmit();
	HandleOtherCheckboxes();
	HandleOtherDropdowns();
	DisableEmptyActionMenus();
	
	//Used for any elements that should trigger a datePicker to be focused and opened
	$('[data-triggerDatePicker]').click(function (event) {
		event.preventDefault();
		var datePickerElement = $(this).attr('data-triggerDatePicker');
		if ($(datePickerElement) != null) {
			$(datePickerElement).focus(); //Focus the date picker element to show the calendar
		}
	});
});

function SelectPersistedValue(el, persistedValue) {
	var formType = $(el).prop("type").toLowerCase();

	if (persistedValue === null || persistedValue === undefined || persistedValue === "") {
		persistedValue = $(el).attr("data-persisted-value");
	}
	
	//If a persisted value is set and is a SELECT element
	if ((persistedValue) &&
		((formType == "select-one") || (formType == "select-multiple"))) {
		$(el).get(0).querySelectorAll("option[value='" + persistedValue.replace("'","\\'") + "']").forEach(option => {
			option.selected = true;});
		$(el).find("option[value='" + persistedValue.replace("'","\\'") + "']").attr("selected", true);		
	}
	else if ((formType == "radio") || (formType == "checkbox")) {
		var isChecked = el.value == persistedValue;
			
		//Only set checked if true or if not a radio button since radio buttons will already have a default value
		if (isChecked || (formType == "checkbox")) {
			$(el).prop("checked", isChecked);
		}
	}
}

function HandleDisableSubmitOnSubmit() {
    $("form").submit(function(event) {
		var form = $(this);
		var submitButtons = form.find("button[name='SubmitButton'][type='submit']:not([data-button-nodisable])");
		if (submitButtons.length == 0)
			return;
		
		if (event.originalEvent != undefined) {
			var submitButtonValue = event.originalEvent.submitter.value;
			$(this).append(`<input type="hidden" name="SubmitButton" value="${submitButtonValue}">`);
		}
		submitButtons.prop("disabled", true);
    });
}

function ToggleCheckBoxes(formName, check) {
	form = document.forms[formName];
	
	if(!form)
		return;
	
	for (var i=0;i<form.elements.length;i++) {
		var e = form.elements[i];
		if ((e.type=='checkbox') && (!e.disabled)) {
			//e.checked = form.checkboxToggle.checked;
			e.checked = check;
		}
	}
}

function InitializeSiteDefault(siteDefault) {
    if (siteDefault) {
        $(document).ready(function () {
            $("select[name='Site']").find("option[value != '" + siteDefault + "']").remove().val(siteDefault);
        });
    }
}

//Usage Instructions
//Looks for INPUTS of type checkbox with class 'checkbox-as-bool' and data attribute 'data-bool-fieldname'
//Registers js function to create a hidden input and toggle its value to ensure unchecked checkboxes submit a value
function HandleBoolCheckboxes() {
	$('.checkbox-as-bool').each(function(i, e) {
		var checkboxInput = $(e);

		if (!checkboxInput) return;	//continue
		var hiddenInputName = checkboxInput.attr('data-bool-fieldname');
		
		if (!hiddenInputName) return;	//continue
		if (!$("input[name='" + hiddenInputName + "']").length){
			let newInput = document.createElement("input");
			newInput.setAttribute("type", "hidden");
			newInput.setAttribute("name", hiddenInputName);
			newInput.setAttribute("value", `${checkboxInput.prop('checked') ? 1 : 0}`);
			checkboxInput.before(newInput);
		}
		var hiddenInput = $("input[name='" + hiddenInputName + "']");

		if (!hiddenInput) return;	//continue
		checkboxInput.click(function() {
			if (checkboxInput.prop('checked')) {
				hiddenInput.val(1);
			} else {
				hiddenInput.val(0);
			}
		});
	});
}

function HandleOtherCheckboxes() {
    //Check for all elements with the checkbox-with-other class
    $('.checkbox-with-other').each(function(i, e) {
        var hiddenInputId = $(e).attr('data-hidden-field');
        var hiddenInput = document.getElementById(hiddenInputId);
        var delimiter = $(e).attr('data-delimiter');
        var otherFieldId = $(e).attr('data-other-field');
        var otherField = document.getElementById(otherFieldId);
		var values = $(hiddenInput).val().split(delimiter);
		
		//Look for all checkboxes that are descendents
        $(e).find('input[type="checkbox"]').each(function(ie, check) {
			//When the checkbox changes, keep track of the value to handle in the hidden input
            $(check).change(function() {				
				if ($(check).is(':checked')) {
					//Add the value to the values array if checked
                    values = $(hiddenInput).val().split(delimiter);
                    values.push($(check).val());
                }
                else {
					//Remove the value from the values array if not checked
                    values = $(hiddenInput).val().split(delimiter);
                    var removeIndex = values.indexOf($(check).val());
                    if (removeIndex > -1) {
                        values.splice(removeIndex, 1);
                    }
                }
                //Update the hidden input again after checking or unchecking
                $(hiddenInput).val(values.join(delimiter));
            });
            //Set checkboxes to checked if the value is found
            if (values.indexOf($(check).val()) != -1) {
                $(check).prop('checked', true);
            }
        });
        
        //Get all of the checked checkboxes
        var comma_separated_list = $(e).find('input[type="checkbox"]:checked').map(function() {
            return $(this).val();
            }).get().join(delimiter);
        //Get the difference to determine what's in the other textbox
		var difference = values.filter(x => !comma_separated_list.includes(x));
		//Set the other textbox to be any remaining options that were persisted
        $(otherField).val(difference);

		//Add handling so when the textbox changes, it updates the hidden input
        $(otherField).on('input propertychange paste', function() {
			
			//Get all of the checked boxes as a delimited string
			var currentCheckedValuesString = $(e).find('input[type="checkbox"]:checked').map(function() {
                return $(this).val();
                }).get().join(delimiter);
			
			//Combine all of the values into an array
            var currentCheckedValues = [];
            if (currentCheckedValuesString != '') {
                currentCheckedValues = currentCheckedValues.concat(currentCheckedValuesString.split(delimiter));
			}
			//Add the contents of the other field to the array
			currentCheckedValues.push($(otherField).val());
			//Set the hidden input
            $(hiddenInput).val(currentCheckedValues.join(delimiter));
        });
		
    });
}

// Usage Instructions
// Apply class "dropdown-with-other" to select element.
// Apply matching "data-field-name" attributes to select and text field.
// Apply "data-other-value" attribute to select with the same value as the "other" option in the checkbox.
// NOTE: Only the hidden text field should have the name & id corresponding to the database field.
// 		 The select should NOT have that value in the name or id attributes.
function HandleOtherDropdowns() {
	$("select.dropdown-with-other").each(function() {
		// Assign a change handler to the select element.
		$(this).change(function() {
			let input = $("input[data-field-name='"+ $(this).attr("data-field-name") +"']");
			// If the value == data-other-value, unhide and empty out the text input
			if (this.value == $(this).attr("data-other-value")) {
				input.closest(".form-group").show();
				$(input).val(null);
			}
			// Otherwise, assign the same value to the (hidden) text input and hide it.
			else {
				$(input).val(this.value);
				input.closest(".form-group").hide();
			}
		});

		// We need to handle loading a value from the database, as well.
		let input = $("input[data-field-name='"+ $(this).attr("data-field-name") +"']");

		// If the text input has a value that's a valid select value, select it
		if (input.val() != null) {
			if ($(this).find("option[value='" + input.val() + "']").length > 0) {
				$(this).val(input.val());
				$(this).trigger("change");				
			}
			// otherwise, select "other"
			else {
				$(this).val($(this).attr("data-other-value"));
			}
		// If the input has no value, trigger a change to hide it.
		} else {
			$(this).trigger("change");
		}
	})
}

function DisableEmptyActionMenus() {
	var menus = $(".dropdown-menu");
	var buttons = $(".dropdown-toggle")
	menus.each(function(i) {
		var menu = $(menus[i]);
		var disabledOptions = 0;
		var options = menu.children(".dropdown-item");
		options.each(function(j) {
			var option = $(options[j]);
			if ((option.hasClass("d-none")) || (option.disabled)) {
				disabledOptions++;
			}
		});
		
		if (disabledOptions == options.length) {
			let message = menu.attr("data-noaction-message");
			$(buttons[i]).addClass("disabled");
			$(buttons[i]).prop("title", message??"You are not able to perform any actions for this item. Please contact staff for assistance.");
		}
	});
}