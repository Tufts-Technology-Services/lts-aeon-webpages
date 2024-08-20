var aeonArchivalRequestModule = (function () {

    function submitArchivalRequestForm(sender, e) {
        var statusRoot;

        if (!e) {
            var e = window.event;
        }

        e.cancelBubble = true;

        if (e.stopPropagation) {
            e.stopPropagation();
        }

        if (e.preventDefault) {
            e.preventDefault();
        }

        var checkedCount = $("section[name='container-info'] input[type=checkbox]:checked").length;
        if (checkedCount == 0) {
            alert("You must select at least one container to request.");
            return;
        }

        statusRoot = $('#statusLine');

        // Clear previous status additions
        if (statusRoot) {
            statusRoot.children('br,span[name="statusMessage"]').remove();
        }

        // Clear previous status error class changes
        $('.validationError').addClass('valid');
        $('.validationError').removeClass('validationError');
        $.post('aeon.dll/ajax?query=ValidateForm&ApplyRequestLimits=false', $('#RequestForm').serialize(), function (data) {
            if (data instanceof Object && data.messages && data.errors) {
                if (data.messages.length > 0 || data.errors.length > 0) {
                    // Process messages
                    $.each(data.messages, function (index, message) {
                        if (statusRoot) {
                            // Create new status span to display
                            statusElement = $('<span></span>').attr('name', 'statusMessage').attr('role', 'alert').addClass('statusError alert alert-danger d-block').text(message);

                            statusRoot.append(statusElement);
                        }
                    });

                    // Process errors
                    $.each(data.errors, function (index, error) {
                        // Change class of label
                        labelElement = $('#' + error);
                        labelElement.removeClass('valid');
                        labelElement.addClass('validationError');
                    });
            
                    // Jump page to status element
                    $([document.documentElement, document.body]).animate({
                        scrollTop: statusRoot.offset().top
                    }, 0);
                    return false;
                } else {
                    var submitButton = document.createElement("input");
                    submitButton.type = "hidden";
                    submitButton.name = "SubmitButton";
                    submitButton.id = "SubmitButton";
                    submitButton.value = "Submit Information";

                    $('#RequestForm').append(submitButton);
                    $('#RequestForm').submit();

                    return true;
                }
            }
        });
    };

    //Public
    return {
        onDocumentReady: function () {
            var submitInformationInput = $('#buttonSubmitRequest');

            if (submitInformationInput.length == 0) {
                alert("Error: The Submit Request button does not have an ID.");
            } else {
                //Add the onclick handler to the submit request button
                //Validate in the browser before submitting the form    
                submitInformationInput.click(function (event) { 
                    if (document.getElementById("RequestForm").reportValidity()) {
                        return submitArchivalRequestForm(this, event);
                    }
                    return false;
                });
            }
        }
    };
})();

$(document).ready(function () {
    aeonArchivalRequestModule.onDocumentReady();

    $('button.checkAll').click(function (event) {
		event.preventDefault();
        document.getElementsByName("Request").forEach(c => {if (!c.disabled) {c.checked = true}});
    });

    $('button.checkNone').click(function (event) {
		event.preventDefault();
        document.getElementsByName("Request").forEach(c => {if (!c.disabled) {c.checked = false}});
    });
});