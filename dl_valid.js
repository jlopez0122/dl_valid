var GOOGLE_SHEET_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxEusNiK-vwWC_hVfWCH6EXyv81D5wyk6ex85y7FRy-D0NJYfQy8mxwZeM9aRdPXz41/exec";
var SENT_RESULTS = new Set(); // Store already sent validation results

window.dataLayer = window.dataLayer || [];

function validateDataLayer() {
    fetch(GOOGLE_SHEET_WEBHOOK_URL)
        .then(response => response.json())
        .then(expectedData => {
            runValidation(expectedData, window.dataLayer);
        })
        .catch(error => console.error("❌ Error fetching Google Sheet data:", error));
}

function runValidation(expectedData, dlEntries) {
    let validationResults = [];

    for (let e = 0; e < expectedData.length; e++) {
        let exp_event = expectedData[e]['Event Name'];
        let exp_key = expectedData[e]["Key"];
        let exp_value = expectedData[e]["Expected Value"].toString();
        let matchFound = false;
        let actualValue = "N/A";

        for (let c = 0; c < dlEntries.length; c++) {
            let dlv_event = dlEntries[c]['event'];

            if (dlv_event !== exp_event) continue;

            let dlv_key_exists = dlEntries[c].hasOwnProperty(exp_key);
            let dlv_val = dlv_key_exists ? dlEntries[c][exp_key] : "N/A";
            let match = (exp_value === ".*") ? dlv_key_exists : (dlv_val === exp_value);

            actualValue = dlv_key_exists ? dlv_val : "N/A";

            let resultKey = `${exp_event}|${exp_key}|${actualValue}|${match}`;
            if (!SENT_RESULTS.has(resultKey)) {
                validationResults.push({
                    "Event Name": exp_event,
                    "Key": exp_key,
                    "Expected Value": exp_value,
                    "Actual Value": actualValue,
                    "Is Match": match ? "Match" : "No Match"
                });

                sendValidationToGoogleSheet({
                    "Event Name": exp_event,
                    "Key": exp_key,
                    "Expected Value": exp_value,
                    "Actual Value": actualValue,
                    "Is Match": match ? "Match" : "No Match"
                });

                SENT_RESULTS.add(resultKey);
            }

            matchFound = true;
        }

        if (!matchFound) {
            let resultKey = `${exp_event}|${exp_key}|N/A|No Match`;
            if (!SENT_RESULTS.has(resultKey)) {
                validationResults.push({
                    "Event Name": exp_event,
                    "Key": exp_key,
                    "Expected Value": exp_value,
                    "Actual Value": "N/A",
                    "Is Match": "No Match"
                });

                sendValidationToGoogleSheet({
                    "Event Name": exp_event,
                    "Key": exp_key,
                    "Expected Value": exp_value,
                    "Actual Value": "N/A",
                    "Is Match": "No Match"
                });

                SENT_RESULTS.add(resultKey);
            }
        }
    }

    console.log("✅ Validation Results:", validationResults);
}

// Override dataLayer.push to review each new entry dynamically
const originalPush = window.dataLayer.push;
window.dataLayer.push = function () {
    let newEntries = Array.from(arguments);
    originalPush.apply(this, newEntries);
    console.log("🔍 New DataLayer Entries Captured:", newEntries);

    fetch(GOOGLE_SHEET_WEBHOOK_URL)
        .then(response => response.json())
        .then(expectedData => {
            runValidation(expectedData, newEntries);
        })
        .catch(error => console.error("❌ Error fetching Google Sheet data:", error));
};

function sendValidationToGoogleSheet(validationResults) {
    fetch("https://script.google.com/macros/s/AKfycbwePQ68Tzot-o3G0k-WfWJp-9Pzwzzr31Hqqvp5WE-D-rHWdyMatjjQ_4QsukSXocGbWw/exec", {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validationResults)
    })
    .then(() => console.log("✅ Request sent (response hidden due to no-cors mode)"))
    .catch(error => console.error("❌ Error sending request:", error));
}

// Run validation on all existing dataLayer entries at page load
validateDataLayer();
