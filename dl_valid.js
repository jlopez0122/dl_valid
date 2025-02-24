var GOOGLE_SHEET_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxEusNiK-vwWC_hVfWCH6EXyv81D5wyk6ex85y7FRy-D0NJYfQy8mxwZeM9aRdPXz41/exec";
window.dataLayer = window.dataLayer || [];
window.dataLayer.push({
    event: "page_view",
    page_path: "/madel",
    page_title: "Home Page"
});

var global_arr = [];

// Store previous findings in an object to prevent overwriting
var validationResultsStore = [];

// Override the push function to capture new dataLayer entries
const originalPush = window.dataLayer.push;
window.dataLayer.push = function () {
    originalPush.apply(this, arguments);
    console.log("New dataLayer entry detected:", arguments);
    validateDataLayer(); // Run the validation every time a new entry is pushed
};

// Function to validate the dataLayer
function validateDataLayer() {
    fetch(GOOGLE_SHEET_WEBHOOK_URL)
        .then(response => response.json())
        .then(expectedData => {
            // Run validation only on new data entries
            runValidation(expectedData);
        })
        .catch(error => console.error("❌ Error fetching Google Sheet data:", error));
}

function runValidation(expectedData) {
    let validationResults = [];
    
    for (let e = 0; e < expectedData.length; e++) {
        let exp_event = expectedData[e]['Event Name'];
        let exp_key = expectedData[e]["Key"];
        let exp_value = expectedData[e]["Expected Value"].toString();
        let matchFound = false;
        let actualValue = "N/A";

        // Validate the current dataLayer state
        for (let c = 0; c < window.dataLayer.length; c++) {
            let dlv_event = window.dataLayer[c]['event'];

            // Only compare if the events match
            if (dlv_event !== exp_event) continue;

            let dlv_key_exists = window.dataLayer[c].hasOwnProperty(exp_key);
            let dlv_val = dlv_key_exists ? window.dataLayer[c][exp_key] : "N/A";

            // Allow wildcard `.*` to match any value, but ONLY if the key exists
            let match = (exp_value === ".*") ? dlv_key_exists : (dlv_val === exp_value);

            // Save actual value for reporting
            if (dlv_key_exists) {
                actualValue = dlv_val;
            }

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

            matchFound = true;
        }

        // If no match found for this expected event, log a failed validation
        if (!matchFound) {
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
        }
    }

    // Store results to prevent overwriting on new pushes
    validationResultsStore = validationResultsStore.concat(validationResults);
    console.log("Validation results:", validationResults);
}

function sendValidationToGoogleSheet(validationResults) {
    fetch("https://script.google.com/macros/s/AKfycbwePQ68Tzot-o3G0k-WfWJp-9Pzwzzr31Hqqvp5WE-D-rHWdyMatjjQ_4QsukSXocGbWw/exec", {
        method: "POST",
        mode: "no-cors",  // Important: This bypasses CORS errors
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validationResults)
    })
    .then(() => console.log("✅ Request sent (response hidden due to no-cors mode)"))
    .catch(error => console.error("❌ Error sending request:", error));
}
