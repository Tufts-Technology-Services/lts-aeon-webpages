var appointmentsChanged = false;
const defaultAppointmentContext = "both"
var datesChecked = [];

var readingRooms = null;
var readingRoom = null;

var OnAppointmentEditForm = false;
var OnViewAppointmentsPage = false;
var RequestLinkAppt = "RequestLink";

window.addEventListener('load', async function() {
    document.getElementById("ReadingRoomID").innerHTML = "";
    document.getElementById("AppointmentDate").value = null;
    document.getElementById("Name").value = null;

    var rlAppt = document.getElementById("RequestLinkAppt");
    if (typeof(rlAppt) != 'undefined' && rlAppt != null)
    {
        RequestLinkAppt = "RequestLinkAppt";
    }

    // This code can run in several places: On request forms, on the Edit Appointment form, and on the ViewAppointments page.
    // A different set of fields is present on each
    let forms = document.getElementsByTagName("form");
    for (let form of forms) {
        if (form.name == "EditAppointment") {
            OnAppointmentEditForm = true;
        }
    }

    OnViewAppointmentsPage = document.getElementById("AppointmentID") == null;

    if((!OnViewAppointmentsPage && getComputedStyle(document.getElementById("AppointmentID")).position === "fixed") ||
        (document.getElementById("NewAppointment") != null && getComputedStyle(document.getElementById("NewAppointment")).position === "fixed") ||
        (document.getElementById("ReadingRoomID") != null && getComputedStyle(document.getElementById("ReadingRoomID")).position === "fixed")) {
		    console.log("The AppointmentID, NewAppointment, and/or ReadingRoomID elements have a fixed position and their visibility may not be accurately determined by appointments.js");
	}
   
    var site = document.getElementById("Site");
    if (site.tagName.toLowerCase() == "select") {
        document.getElementById("Site").onchange = async function() { GetReadingRooms(); };
    }



    document.getElementById("ReadingRoomID").onchange = function() {
        window.readingRoom = readingRooms.filter(obj => { return obj.ID === document.getElementById("ReadingRoomID").value })[0];
		
        SetAppointmentRequiredLabel();
		
        GetAppointments().then(async () => { await RefreshDatePicker(); }).then(() => {
            if (!(moment(document.getElementById("AppointmentDate").value).format("YYYY-MM-DD") in readingRoom.appointmentAvailability)) {
                document.getElementById("AppointmentDate").value = null;
            }
        });

    };

    document.getElementById("AppointmentDate").onchange = function() {
        FilterAppointmentLengthMenu();
    }

    document.getElementById("AppointmentLength").onchange = function() { UpdateAppointmentTimeSelect().then(() => { RecalculateAppointmentTimes(); }) };

    document.getElementById("AppointmentTime").onchange = function() {
        document.getElementById("AppointmentTime").setAttribute("data-persisted-value", document.getElementById("AppointmentTime").value);
        RecalculateAppointmentTimes(false);
    };

    if (OnViewAppointmentsPage) {
        document.getElementById("ScheduleNewAppointment").onclick = function() {
            var site = document.getElementById("Site");
            if (OnViewAppointmentsPage && site.tagName.toLowerCase() == "select" && site.selectedIndex == 0){
                site.selectedIndex = 1;
                site.onchange();
            }
        }
    }

    if (OnAppointmentEditForm) {
        GetReadingRooms();
    } else {

        document.getElementById(RequestLinkAppt).onchange = async function() { 
            await GetAppointments().then(() =>
            {
                GetReadingRooms();
            }); 
        };
        if (document.getElementById(RequestLinkAppt).value == "") {
            if (!OnViewAppointmentsPage) {
                document.getElementById("AppointmentID").innerHTML = "";
            }
        }

        if (document.getElementById("NewAppointment")) {
            document.getElementById("NewAppointment").onclick = async function() {
                    EnableField("AppointmentDate");
                    EnableField("AppointmentLength");
                    EnableField("AppointmentTime");
                    await RefreshDatePicker();
            };
        }

        var site = document.getElementById("Site");
        if (site.tagName.toLowerCase() == "select" && site.options.length < 2) {
            for (let el of document.getElementsByClassName("sites-enabled")) {
                el.classList.add("d-none");
            }
        }

        document.getElementById("CreateAppointmentButton").onclick = CreateAppointment;

        GetReadingRooms();
    }
});

function GetResearcherUsername(){
    var rl = document.getElementById(RequestLinkAppt);
    if (rl && rl.value) {
        return rl.value.slice(2)
    }
}

function DisableField(fieldname) {
    document.getElementById(fieldname).disabled = true;
}
function EnableField(fieldname) {
    document.getElementById(fieldname).disabled = false;
}

function SetAppointmentRequiredLabel() {
	let readingRoomSelect = document.getElementById("ReadingRoomID");
	let appointmentSelect = document.getElementById("AppointmentID");
	let appointmentRequiredSpan = document.getElementById("AppointmentRequired");
	
	let appointmentRequiredForReadingRoom = null;
	if (window.readingRoom) {
		appointmentRequiredForReadingRoom = (window.readingRoom.AppointmentRequired ?? "false").toLowerCase() === "true";
	}
	
	if (appointmentSelect != null) {
		if (appointmentRequiredForReadingRoom) {
			appointmentSelect.setAttribute('required', '');
		} else {
			appointmentSelect.removeAttribute('required', '');
		}
	}
	
	if (appointmentRequiredSpan != null) {
		if (appointmentRequiredForReadingRoom) {
			appointmentRequiredSpan.classList.remove("d-none");
		} else {
			appointmentRequiredSpan.classList.add("d-none");
		}
	}
	
	if (!(readingRoomSelect) || (readingRoomSelect.value == '')) {
		ShowMessage('');	//Clear out the notification message if there is not reading room selected
	} else if (appointmentRequiredForReadingRoom) {
		ShowMessage('An appointment is required for the selected reading room.');
	} else {
		ShowMessage('An appointment is not required for the selected reading room.');
	}
}

async function GetReadingRooms() {
    if (!OnAppointmentEditForm && !OnViewAppointmentsPage) {
        // Cache the current value, so we don't lose it when reloading the list
        if ($("#ReadingRoomID").val() != null) {
            $("#ReadingRoomID").attr("data-persisted-value", $("#ReadingRoomID").val());
        }

        // If there are multiple Sites to choose from, disable ReadingRooms until a Site is selected.
        if ($("#Site").prop("tagName").toLowerCase() == "select" && !$("#Site").val() && ($("#Site option[value!='']").length > 1)) {
            $("#ReadingRoomID").prop("disabled", true);
            $("#ReadingRoomID").empty();
            return;
        } else if (document.getElementById("ReadingRoomID") != null && document.getElementById("ReadingRoomID").offsetParent != null) {
            $("#ReadingRoomID").prop("disabled", false);
        }
    }

    let postData = {};

    if ($("#Site")) {
        postData.site = $("#Site").val();
    }
    
    if (GetResearcherUsername()) {
        postData.ResearcherUsername = GetResearcherUsername();
    }

    return new Promise((resolve, reject) => {
        $.ajax({
            type: "GET",
            url: "aeon.dll/ajax?query=GetReadingRooms",
            data: postData,
            success: function(response) {
                if (response.status == "success") {
                    PopulateReadingRooms(response.data).then(() => resolve(response.data));
                } else {
                    HandleError(response);
                    console.log(response.message);
                }
            },
            error: function() {
                HandleError("Server error. Please refresh the page and try again. If this error persists, please contact staff.");
                console.log("Server Error");
            }
        });
    });
}

async function PopulateReadingRooms(data) {

    window.readingRooms = data;

    if (!OnAppointmentEditForm) {
        let readingRoomSelect = document.getElementById("ReadingRoomID");
        readingRoomSelect.innerHTML = "";

        window.readingRooms.forEach(readingRoom => {
            if (readingRoom.OpenHours.length > 0) {
                AddOption(readingRoomSelect, readingRoom.ReadingRoomName, readingRoom.ID, false);
            }
        });

        if (readingRoomSelect.options.length < 1) {
            AddOption(readingRoomSelect, "No Reading Rooms available", null, true);
            readingRoomSelect.value = null;
            DisableField("AppointmentDate");
            DisableField("AppointmentLength");
            DisableField("AppointmentTime");
            DisableField("AvailableToProxies");
            DisableField("Name");
            DisableField("CreateAppointmentButton");
            return;
        }
        else {
            EnableField("AppointmentDate");
            EnableField("AppointmentLength");
            EnableField("AppointmentTime");
            EnableField("AvailableToProxies");
            EnableField("Name");
            EnableField("CreateAppointmentButton");
        }
        SelectPersistedValue($("#ReadingRoomID"));
    }
    window.readingRoom = readingRooms.filter(obj => { return obj.ID === document.getElementById("ReadingRoomID").value })[0];

    await GetAppointments();
    await RefreshDatePicker();
	SetAppointmentRequiredLabel();
}


// Destroys and re-creates the date picker. This should be used when we change reading rooms,
// to ensure previous closures, open hours, etc are not carried over.
async function RefreshDatePicker() {

    // reset the cache of date ranges whose availability has already been added
    datesChecked = [];

    // date range, based on lead days
    let rangeLow = moment().add(parseInt(readingRoom.AppointmentMinLeadDays), "days").toDate();
    let rangeHigh = moment().add(parseInt(readingRoom.AppointmentMaxLeadDays), "days").toDate();

    // days of week, based on open hours
    disabledDays = [
        !readingRoom.OpenHours.some((oh) => { return oh.DayOfWeek == 1; }),
        !readingRoom.OpenHours.some((oh) => { return oh.DayOfWeek == 2; }),
        !readingRoom.OpenHours.some((oh) => { return oh.DayOfWeek == 3; }),
        !readingRoom.OpenHours.some((oh) => { return oh.DayOfWeek == 4; }),
        !readingRoom.OpenHours.some((oh) => { return oh.DayOfWeek == 5; }),
        !readingRoom.OpenHours.some((oh) => { return oh.DayOfWeek == 6; }),
        !readingRoom.OpenHours.some((oh) => { return oh.DayOfWeek == 0; })
    ];

    // re-create the datePicker to clear out all previously-disabled days and dates
    datePickerController.destroyDatePicker("AppointmentDate");
    datePickerController.createDatePicker({
        formElements: { "AppointmentDate": "%m/%d/%Y" },
        noTodayButton: "true",
        positioned: "datePickerContainer",
        finalOpacity: 100,
        nopopup: "true",
        disabledDays: disabledDays,
        rangeLow: rangeLow,
        rangeHigh: rangeHigh,
        callbackFunctions: {
            "domcreate": [function() { document.getElementById("fd-AppointmentDate").setAttribute("aria-modal", "false") }],
            "datereturned": [FilterAppointmentLengthMenu],
            "redraw": [UpdateDisplayedAvailability]
        }
    });

    datePickerController.enable("AppointmentDate");

    let dp = datePickerController.datePickers()["AppointmentDate"];
    await UpdateDisplayedAvailability({firstDateDisplayed: dp.firstDateShown,lastDateDisplayed: dp.lastDateShown});
    
    BuildAppointmentLengthMenu();
}

// Create a menu with options for every possible appointment length, based on the reading room's properties.
// Some options may later be disabled based on specific availability
function BuildAppointmentLengthMenu() {
    let appointmentLengthSelect = document.getElementById("AppointmentLength");
    appointmentLengthSelect.innerHTML = "";
    if (!window.readingRoom) {
        AddOption(appointmentLengthSelect, "Please select a date", null, true);
    }
    else {
        for (let x = parseInt(readingRoom.MinAppointmentLength); x <= parseInt(readingRoom.MaxAppointmentLength); x += parseInt(readingRoom.AppointmentIncrement)) {
            let hours = Math.floor(x/60);
            let minutes = x%60;
            let timeString = "";
            if (hours == 1) {
                timeString = timeString + hours.toString() + " hour ";
            } else if (hours > 1) {
                timeString = timeString + hours.toString() + " hours ";
            }
            if (minutes > 0 ) {
                timeString = timeString + minutes.toString() + " minutes";
            }
            AddOption(appointmentLengthSelect, timeString, x, false);
        }
    }
    UpdateAppointmentTimeSelect();
}

// Disables any appointment length options which are not valid for the selected date.
async function FilterAppointmentLengthMenu() {
    let date = moment(document.getElementById("AppointmentDate").value, "MM/DD/YYYY")
    let appointmentLengthSelect = document.getElementById("AppointmentLength");

    await GetAvailability(date).then((availability) => {
        if (availability === undefined) {
            return;
        }
        let maxAppointmentLengthToday = Math.max(...availability.map(a => parseInt(a.MaxAppointmentLength)));
        for (let option of appointmentLengthSelect.options) {
            option.disabled = (parseInt(option.value) > parseInt(maxAppointmentLengthToday))
        };
        UpdateAppointmentTimeSelect();
    });
}


async function UpdateAppointmentTimeSelect() {

    let appointmentLengthSelect = document.getElementById("AppointmentLength");
    let appointmentTimeSelect = document.getElementById("AppointmentTime");

    // Get the currently-selected value, then clear out all values.
    appointmentTimeSelect.setAttribute("data-persisted-value", appointmentTimeSelect.value);

    if (datePickerController.getSelectedDate("AppointmentDate") == null) {
        appointmentTimeSelect.innerHTML = "";
        AddOption(appointmentTimeSelect, "Please select a valid appointment date", null, true);
        appointmentTimeSelect.value = null;
    }
    else {
        await GetAvailability(new Date(datePickerController.getSelectedDate("AppointmentDate"))).then((availability) => {
            appointmentTimeSelect.innerHTML = "";
            let minimumStartTime = moment().add(readingRoom.AppointmentMinLeadDays, 'd');
            availability.forEach(aa => {
                if (parseInt(appointmentLengthSelect.value) <= parseInt(aa.MaximumAppointmentLength)) {
                    let label = moment(aa["StartTime-ISO8601"]).format("h:mm a") + " - " + moment(aa["StartTime-ISO8601"]).add(parseInt(appointmentLengthSelect.value), "minutes").format("h:mm a");
                    if ( moment(aa["StartTime-ISO8601"]) >= minimumStartTime) {
                        AddOption(appointmentTimeSelect, label, aa["StartTime-ISO8601"]);
                    }
                }
            });
            appointmentTimeSelect.value = appointmentTimeSelect.getAttribute("data-persisted-value");
        });
    }
}

function RecalculateAppointmentTimes(announce = true) {

    var appointmentTimeSelect = document.getElementById("AppointmentTime");
    var appointmentLengthSelect = document.getElementById("AppointmentLength");
    var appointmentLength = parseInt(appointmentLengthSelect.value);

    if (OnAppointmentEditForm) {
        var startTime = moment(appointmentTimeSelect.value);
        var stopTime = moment(startTime).add(appointmentLength, "minutes");
        document.getElementById("StartTime").value = startTime.format("YYYY-MM-DDTHH:mm:ss.000");
        document.getElementById("StopTime").value = stopTime.format("YYYY-MM-DDTHH:mm:ss.000");
    }



    if (announce) {
        if (appointmentTimeSelect.value == "") {
            ShowMessage(`There are ${appointmentTimeSelect.options.length} available time slots for ${appointmentLengthSelect.options[appointmentLengthSelect.selectedIndex].text} on ${document.getElementById("AppointmentDate").value}`)
        } else {
            ShowMessage(`Selected appointment time has changed to ${appointmentTimeSelect.options[appointmentTimeSelect.selectedIndex].text} on ${document.getElementById("AppointmentDate").value}`)
        }

    }
}

function AddOption(select, label, value, disabled = false) {
    let opt = document.createElement("option");
    opt.value = value;
    opt.text = label;
    if (disabled == true) {
        opt.disabled = true;
    }
    select.appendChild(opt);
}

// Update disabled days based on appointment availability
async function UpdateDisplayedAvailability(args) {
    if (!window.readingRoom) { return; }

    firstDateDisplayed = args.firstDateDisplayed;
    lastDateDisplayed = args.lastDateDisplayed;
    if (datesChecked.some(dc => dc.firstDateDisplayed == firstDateDisplayed && dc.lastDateDisplayed == lastDateDisplayed)) {
        return;
    }
    datesChecked.push({ "firstDateDisplayed": firstDateDisplayed, "lastDateDisplayed": lastDateDisplayed })

    if (firstDateDisplayed != null) {
        var start = moment(firstDateDisplayed, "YYYYMMDD");
        var end = moment(lastDateDisplayed, "YYYYMMDD");

        await GetAvailabilities(start, end).then(() => {
            var disabledDates = {};
            for (let date of Object.keys(readingRoom.appointmentAvailability)) {
                if (readingRoom.appointmentAvailability[date].length == 0) {
                    disabledDates[moment(date, "YYYY-MM-DD").format("YYYYMMDD")] = 1;
                }
            }

            let focusDate = moment(lastDateDisplayed, "YYYYMMDD").toDate();
            datePickerController.addDisabledDates("AppointmentDate", disabledDates);

            let dp = datePickerController.datePickers()["AppointmentDate"];
            let selectedDate = datePickerController.getSelectedDate("AppointmentDate");
            //dp.date = selectedDate ?? focusDate;
            dp.date = focusDate;
            dp.updateTable();
        });

    }
}


function HandleError(errorResponse) {
    if (errorResponse.status == "fail") {
        ShowError(errorResponse.message);
    } else {
        ShowError("A server error occurred. Please refresh the page and try again. If this error persists, please contact staff.");
    }
}

function ShowError(message) {
    document.getElementById("SchedulerError").textContent = message;
}

function ShowMessage(message) {
    document.getElementById("SchedulerMessage").textContent = message;
}

async function GetAvailabilities(startDate, endDate, useCache = true) {

    if (readingRoom.appointmentAvailability === undefined || readingRoom.appointmentAvailability == null) {
        readingRoom.appointmentAvailability = {};
    }

    let startDateKey = moment(startDate).format("YYYY-MM-DD");
    let endDateKey = moment(endDate).format("YYYY-MM-DD");

    // Check each date in range to ensure it's cached.
    // If not, we'll just re-fetch the whole range.
    var cacheDate = moment(startDate);
    while (cacheDate < moment(endDate) && useCache == true) {
        var cacheDateKey = cacheDate.format("YYYY-MM-DD");
        if (!(cacheDateKey in readingRoom.appointmentAvailability)) {
            useCache = false;
            break;
        }
        cacheDate.add(1, "days");
    }

    if (useCache) {
        return readingRoom.appointmentAvailability;
    }

    let postData = {
        ReadingRoomID: $("#ReadingRoomID").val(),
        AppointmentStartDate: startDateKey,
        AppointmentEndDate: endDateKey
    };
    
    if (GetResearcherUsername()) {
        postData.ResearcherUsername = GetResearcherUsername();
    }

    await $.ajax({
        type: "GET",
        url: "aeon.dll/ajax?query=GetAppointmentAvailabilities",
        data: postData,
        success: function(response) {
            if (response.status == "success") {
                for(d = startDate; d <= endDate; d.add(1,'days')) {
                    let dateKey = d.format("YYYY-MM-DD")
                    readingRoom.appointmentAvailability[dateKey] = response.data[dateKey] ?? [];
                }
                AddExistingAppointmentAvailability();
            }
        },
        error: function() {
            HandleError("Server error. Please refresh the page and try again. If this error persists, please contact staff.");
            console.log("Server Error");
        }
    });

    return readingRoom.appointmentAvailability;
}

async function GetAvailability(date, useCache = true, getNextAvailable = false) {
    let dateKey = moment(date).format("YYYY-MM-DD")

    if (readingRoom.appointmentAvailability === undefined || readingRoom.appointmentAvailability == null) {
        readingRoom.appointmentAvailability = {};
    }

    if (useCache || !(dateKey in readingRoom.appointmentAvailability)) {
        var fetchData = {
            ReadingRoomID: document.getElementById("ReadingRoomID").value,
            AppointmentDate: dateKey,
            GetNextAvailable: getNextAvailable
        };

        if (OnAppointmentEditForm) {
            fetchData.CurrentAppointmentID = document.getElementById("AppointmentID").value
        };

            
        if (GetResearcherUsername()) {
            fetchData.ResearcherUsername = GetResearcherUsername();
        }

        await $.ajax({
            type: "GET",
            url: "aeon.dll/ajax?query=GetAppointmentAvailability",
            data: fetchData,
            success: function(response) {
                if (response.status == "success") {
                    readingRoom.appointmentAvailability[dateKey] = response.data;
                } else {
                    HandleError(response);
                    console.log(response.message);
                }
            },
            error: function() {
                HandleError("Server error. Please refresh the page and try again. If this error persists, please contact staff.");
                console.log("Server Error");
            }
        });
    }

    AddExistingAppointmentAvailability();

    return readingRoom.appointmentAvailability[dateKey]
}

function AddExistingAppointmentAvailability() {
    //When editing an appointment, its start and stop time may not appear in availabilities if there are no more seats available.
    //In this case, construct an availability for the current appointment.
    if (OnAppointmentEditForm) {
        let appt = readingRoom.appointments.find(a => a.AppointmentID == document.getElementById("AppointmentID").value);

        let dateKey = moment(appt.StartTime).format("YYYY-MM-DD");

        if (!(dateKey in readingRoom.appointmentAvailability)) {
            readingRoom.appointmentAvailability[dateKey] = [];
        }

        let apptLength = moment(appt.StopTime).diff(appt.StartTime, "minutes");

        var existingAvailability = readingRoom.appointmentAvailability[dateKey].filter(aa => aa["StartTime-ISO8601"] == appt.StartTime);

        if (existingAvailability.length == 1) {
            //If we find an availability with a matching starting time, modify the length if necessary.
            existingAvailability.MaximumAppointmentLength = Math.max(apptLength, existingAvailability.MaximumAppointmentLength).toString();
        }
        else {
            // otherwise, add a new availability
            let newAvailability = {};
            newAvailability["UTCStartTime"] = moment(appt.StartTime).toISOString().replace('Z', '');
            newAvailability["StartTime"] = moment(appt.StartTime).format("M/D/YYYY hh:mm:ss a");
            newAvailability["StartTime-ISO8601"] = appt.StartTime;
            newAvailability["MaximumAppointmentLength"] = apptLength.toString();
            newAvailability["SeatsAvailable"] = "1";
            readingRoom.appointmentAvailability[dateKey].push(newAvailability);
            readingRoom.appointmentAvailability[dateKey].sort((a, b) => {
                return moment(a["StartTime-ISO8601"]).diff(moment(b["StartTime-ISO8601"]), "minutes")
            });
        }
    }
}

function GetAvailabilityForTime(datetime) {
    let dateKey = moment(datetime).format("YYYY-MM-DD")
    if (!(dateKey in readingRoom.appointmentAvailability)) { return false; }

    let availability = readingRoom.appointmentAvailability[dateKey].filter(aa => {
        return aa["StartTime-ISO8601"] == moment(datetime).format("YYYY-MM-DDTHH:mm:ss.sss")
    });

    if (availability.length > 0) {
        return availability[0];
    }
    return null;
}


async function GetAppointments() {

    let requestLink = null;
    if ($("#" + RequestLinkAppt).length > 0) {
        requestLink = $("#" + RequestLinkAppt).val();

        // Disable and hide Appointment select/create if RequestLink is an Activity.
        if (requestLink[0] == 'E') {
            $(".appointments-enabled").addClass("d-none");
            $("#newAppointmentCollapse").addClass("d-none");
            if (!OnViewAppointmentsPage){
                $("#AppointmentID").prop("disabled", true);
                $("#AppointmentID").empty();
            }
            $("#NewAppointment").prop("disabled", true);
            return;
        } else if (requestLink[0] == 'R') {
            $(".appointments-enabled").removeClass("d-none");
            $("#newAppointmentCollapse").removeClass("d-none");
            if (document.getElementById("AppointmentID") != null && document.getElementById("AppointmentID").offsetParent != null) {
                $("#AppointmentID").prop("disabled", false);
            }

            if(document.getElementById("NewAppointment") != null && document.getElementById("NewAppointment").offsetParent != null) {
                $("#NewAppointment").prop("disabled", false);
            }
            
        }
    }

    // Disable Appointment select/create if no Reading Room is selected
    if (!$("#ReadingRoomID").val()) {
        if (!OnViewAppointmentsPage){
            $("#AppointmentID").prop("disabled", true);
            $("#AppointmentID").empty();
        }
        $("#NewAppointment").prop("disabled", true);
        
        return;
    }


    // Create data for the AJAX message
    let postData = {
        ReadingRoomID: $("#ReadingRoomID").val(),
        Context: defaultAppointmentContext
    };
    if (requestLink != null && requestLink[0] == 'R') {
        postData.ResearcherUsername = requestLink.slice(2);
        postData.Context = "researcher";
    }
    if ($("#TransactionNumber").val()) {
        postData.TransactionNumber = $("#TransactionNumber").val();
    }
    if (GetResearcherUsername()) {
        postData.ResearcherUsername = GetResearcherUsername();
    }

    return new Promise((resolve, reject) => {
        $.ajax({
            type: "GET",
            url: "aeon.dll/ajax?query=GetAppointments",
            data: postData,
            success: function(response) {
                if (response.status == "success") {
                    PopulateAppointments(response.data);
                    resolve(response.data);
                } else {
                    HandleError(response);
                    console.log(response.message);
                }
            },
            error: function() {
                HandleError("Server error. Please refresh the page and try again. If this error persists, please contact staff.");
                console.log("Server Error");
            }
        });
    });
}

function PopulateAppointments(appointments) {
    readingRoom.appointments = appointments;

    if (OnAppointmentEditForm) {

        let appointmentID = document.getElementById("AppointmentID").value;
        let appointment = readingRoom.appointments.find(appt => appt.AppointmentID == appointmentID)

        document.getElementById("AppointmentDate").value = moment(appointment.StartTime).format("MM/DD/YYYY");
        datePickerController.setDateFromInput("AppointmentDate");
        document.getElementById("Name").value = appointment.Name;
        document.getElementById("AvailableToProxies").checked = appointment.AvailableToProxies == "True";

        FilterAppointmentLengthMenu().then(async () => {
            document.getElementById("AppointmentLength").value = moment(appointment.StopTime).diff(moment(appointment.StartTime), "minutes");
            await UpdateAppointmentTimeSelect();
            document.getElementById("AppointmentTime").value = appointment.StartTime;
        });
    } else if (!OnViewAppointmentsPage) {
        let appointmentSelect = document.getElementById("AppointmentID");
        appointmentSelect.innerHTML = "";

        if (readingRoom.AppointmentRequired == "True"){
            AddOption(appointmentSelect, "You must select an appointment", "", false);
        }
        else {
            AddOption(appointmentSelect, "No Appointment", "", false);
        }

        appointments.forEach(appointment => {
            if (jQuery.isEmptyObject(appointment)) {
                return;
            } else {
                var name = "";
                if (appointment.Name) {
                    name = appointment.Name + ": ";
                }
                name = name + moment(appointment.StartTime).format('MM/DD/YYYY hh:mm a') + " - " + moment(appointment.StopTime).format('hh:mm a')
                AddOption(appointmentSelect, name, appointment.AppointmentID, false);
            }
        });

        SelectPersistedValue($("#AppointmentID"));
        
        if (appointmentSelect.offsetParent != null) {
            appointmentSelect.disabled = false;
        }

        if (document.getElementById("NewAppointment").offsetParent != null) {
            document.getElementById("NewAppointment").disabled = false;
        }
        
    }
}

function CreateAppointment() {

    if (document.getElementById(RequestLinkAppt).value == 'E') {
        ShowError("Cannot create an appointment for an activity.");
        return;
    }

    let appointment = {
        StartTime: moment(document.getElementById("AppointmentTime").value).format("YYYY-MM-DDTHH:mm:ss.sss"),
        StopTime: moment(document.getElementById("AppointmentTime").value).add(document.getElementById("AppointmentLength").value, "minutes").format("YYYY-MM-DDTHH:mm:ss.sss"),
        ReadingRoomID: document.getElementById("ReadingRoomID").value,
        AvailableToProxies: document.getElementById("AvailableToProxies").checked == true,
        Name: document.getElementById("Name").value,
        ResearcherUsername: document.getElementById(RequestLinkAppt).value.slice(2)
    }

    let [valid, message] = ValidateAppointment(appointment);

    if (!valid) {
        ShowError(message);
        return;
    } else {
        new Promise((resolve, reject) => {
            $.ajax({
                type: "POST",
                url: "aeon.dll/ajax?query=CreateAppointment",
                data: appointment,
                success: function(response) {
                    if (response.status == "success") {
                        //if we're on the View Appointments page, refresh the page to show the new appointment. 
                        if (OnViewAppointmentsPage) {
                            window.location.reload();
                        } else {
                            GetAvailability(appointment.StartTime, false)
                            .then(AppointmentCreated(response.data));
                        }
                    } else {
                        ShowError(response.message);
                        console.log(response.message);
                    }
                },
                error: function() {
                    HandleError("Server error. Please refresh the page and try again. If this error persists, please contact staff.");
                    console.log("Server Error");
                }
            });
        });
    }
}

function AppointmentCreated(newAppointment) {
    GetAppointments().then(success => {
        document.getElementById("AppointmentID").value = parseInt(newAppointment.AppointmentID);
        document.getElementById("AppointmentID").setAttribute("data-persisted-value", newAppointment.AppointmentID);
        document.getElementById("NewAppointment").click();
        document.getElementById("SchedulerError").innerHTML = "";
    });

}

function ValidateAppointment(newAppt) {
    let valid = true;
    let message = "";

    if (newAppt.StartTime == "Invalid date") {
        message += "Invalid start time.\n";
        valid = false;
    }

    if (newAppt.StopTime == "Invalid date") {
        message += "Invalid appointment length.\n";
        valid = false;
    }

    if (!valid) {
        return [valid, message];
    }

    for (i = 0; i < readingRoom.appointments.length; i++) {
        existingAppt = readingRoom.appointments[i];
        if (existingAppt.AppointmentID != newAppt.AppointmentID && existingAppt.StartTime < newAppt.StopTime && existingAppt.StopTime > newAppt.StartTime) {
            message += "Unable to schedule an appointment that intersects an existing appointment.\n"
            valid = false;
            break;
        }
    };

    let availability = GetAvailabilityForTime(newAppt.StartTime);
    if (availability == null || availability.length == 0) {
        valid = false;
        message += `${moment(newAppt.StartTime).toLocaleString()} is not an available appointment time.\n`
    } else {
        let maxEndTime = moment(newAppt.StartTime).add(availability.MaximumAppointmentLength, "m");
        if (maxEndTime < moment(newAppt.StopTime)) {
            valid = false;
            message += `An appointment that begins at ${moment(newAppt.StartTime).toLocaleString()} must end by ${maxEndTime.toLocaleString()}\n`;

        }
    }

    return [valid, message];
}