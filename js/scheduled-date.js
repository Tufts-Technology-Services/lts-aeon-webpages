window.addEventListener('load', function () {
    if (!this.document.getElementById("ScheduledDate"))
    {
        return;
    }
    // Retrieve closures from AJAX endpoint
    fetch('aeon.dll/ajax?query=ScheduledDate', {
        method: 'GET',
        cache: 'no-cache'
    })
    .then((response) => response.json())
    .then(data => {

        // Days of week
        disabledDays = [
            data["DefaultSchedule"].includes("Monday") ? 0 : 1,
            data["DefaultSchedule"].includes("Tuesday") ? 0 : 1,
            data["DefaultSchedule"].includes("Wednesday") ? 0 : 1,
            data["DefaultSchedule"].includes("Thursday") ? 0 : 1,
            data["DefaultSchedule"].includes("Friday") ? 0 : 1,
            data["DefaultSchedule"].includes("Saturday") ? 0 : 1,
            data["DefaultSchedule"].includes("Sunday") ? 0 : 1
        ]

        // Available date range
        let minDays = data["MinimumDays"];
        if (minDays < 0) {
            minDays = 0;
        }

        let maxDays = data["MaximumDays"];
        if (maxDays <= minDays || maxDays <= 0) {
            maxDays = null;
        }

        let today = new Date();
        let rangeLow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + minDays);
        let rangeHigh = new Date(today.getFullYear(), today.getMonth(), today.getDate() + maxDays);

        // Closures
        disabledDates = {}

        data["ScheduledClosures"].forEach(closure => {
            let date = new Date(closure.ClosureDate);
            let formattedDateString = date.toISOString().slice(0,10).replace(/-/g,"");
            if (closure.Recurring == "true") {
                formattedDateString = "****" + formattedDateString.slice(4);
            }
            disabledDates[formattedDateString] = 1;
        })

        datePickerController.setGlobalOptions({
            "nodrag":1
        });

        // Create date picker
        datePickerController.createDatePicker({
            formElements:{"ScheduledDate":"%m/%d/%Y"},
            noTodayButton: "true",
            positioned: "datePickerButton",
            finalOpacity: 100,
            disabledDays: disabledDays,
            rangeLow: rangeLow
        });
        datePickerController.setDisabledDates("ScheduledDate", disabledDates);
        if (maxDays) { 
            datePickerController.setRangeHigh("ScheduledDate", rangeHigh);
        }

        this.document.getElementById("datePickerButton").addEventListener("click", function(){datePickerController.show('ScheduledDate', true);})
       
        this.document.getElementById("ScheduledDate").addEventListener("change", function(){ ValidateDate(); })

        function ValidateDate() {
            var scheduledDateField = document.getElementById("ScheduledDate");
            var scheduledDate = new Date(scheduledDateField.value);
            if (isNaN(scheduledDate)){
                alert("Invalid date. Please enter the date using the mm/dd/yyyy format.");
                scheduledDateField.value = "";
                setTimeout(function(){scheduledDateField.focus();}, 0);
            } else if (!(datePickerController.dateValidForSelection("ScheduledDate", scheduledDate))) {
                alert("We are closed on " + scheduledDate.toDateString() + ". Please select another date.");
                scheduledDateField.value = "";
                setTimeout(function(){scheduledDateField.focus();}, 0);
            }
        }

    });
});

