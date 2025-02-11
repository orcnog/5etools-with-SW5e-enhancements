"use strict";

window.addEventListener("load", () => doSw5ePageInit());

// const initialSw5eApiUrl = $('[name=sw5eapi]').val();
// const initial5eToolsJsonURL = $('[name=sw5eapi]').find(':selected').attr('data-destination');

var editLeft = ace.edit("panel_left", {
    wrap: true,
    showPrintMargin: false,
});
var editRight = ace.edit("panel_right", {
    wrap: true,
    showPrintMargin: false,
});
var editMerged = ace.edit("panel_output", {
    wrap: true,
    showPrintMargin: false,
});

// const ConverterUi = {};

ConverterUi.STORAGE_LEFT = "converterLeft";
ConverterUi.STORAGE_RIGHT = "converterRight";
ConverterUi.STORAGE_APISELECT = "apiSelection";
ConverterUi.STORAGE_APIURL = "apisourceURL";
ConverterUi.STORAGE_JSONURL = "jsondestinationURL";
ConverterUi.STORAGE_CTYPE = "conversionType";

const saveLeftDebounced = MiscUtil.debounce(() => StorageUtil.pSetForPage(ConverterUi.STORAGE_LEFT, editLeft.getValue()), 50);
const saveRightDebounced = MiscUtil.debounce(() => StorageUtil.pSetForPage(ConverterUi.STORAGE_RIGHT, editRight.getValue()), 50);
const saveApiSelect = MiscUtil.debounce(() => StorageUtil.pSetForPage(ConverterUi.STORAGE_APISELECT, $('[name=sw5eapi]').val()), 50);
const saveApiSourceURL = MiscUtil.debounce(() => StorageUtil.pSetForPage(ConverterUi.STORAGE_APIURL, $('[name=sourceURL]').val()), 50);
const saveJsonDestURL = MiscUtil.debounce(() => StorageUtil.pSetForPage(ConverterUi.STORAGE_JSONURL, $('[name=destinationURL]').val()), 50);
const saveConversionType = MiscUtil.debounce(() => StorageUtil.pSetForPage(ConverterUi.STORAGE_CTYPE, $('[name=conversiontype]').val()), 50);

async function doSw5ePageInit () {
    $('.sidemenu').append($('.sw5e-from-url-section'));

    const initialApiSelection = await StorageUtil.pGetForPage(ConverterUi.STORAGE_APISELECT);
    if (initialApiSelection) $('[name=sw5eapi]').val(initialApiSelection);
    $('[name=sw5eapi]').on('change', handle_sw5eapiURL_change);

    const initialSw5eApiUrl = await StorageUtil.pGetForPage(ConverterUi.STORAGE_APIURL);
    if (initialSw5eApiUrl) $('[name=sourceURL]').val(initialSw5eApiUrl);
    $('[name=sourceURL]').on('input', handle_custom_sourceURL);
    
    const initial5eToolsJsonURL = await StorageUtil.pGetForPage(ConverterUi.STORAGE_JSONURL);
    if (initial5eToolsJsonURL) $('[name=destinationURL]').val(initial5eToolsJsonURL);
    $('[name=destinationURL]').on('input', handle_destinationURL_input);

    const initialConverstionType = await StorageUtil.pGetForPage(ConverterUi.STORAGE_CTYPE);
    if (initialConverstionType) $('[name=conversiontype]').val(initialConverstionType);
    $('[name=conversiontype]').on('change', handle_conversiontype_change);
    $('#import_from_urls').on('click', handle_import_JSON_from_URLs);
    $('#convert_textareas').on('click', handle_convert_textareas_JSON);
    const prevLeftInput = await StorageUtil.pGetForPage(ConverterUi.STORAGE_LEFT);
    if (prevLeftInput) editLeft.setValue(prevLeftInput, -1);
    editLeft.on("change", () => saveLeftDebounced());
    const prevRightInput = await StorageUtil.pGetForPage(ConverterUi.STORAGE_RIGHT);
    if (prevRightInput) editRight.setValue(prevRightInput, -1);
    editRight.on("change", () => saveRightDebounced());
}

/**
 * @function
 * @description when the sw5eapi dropdown changes, copy the selected sw5eapi dropdown value
 * 	into the sourceURL input field and update and hide conversiontype dropdown.
 */
function handle_sw5eapiURL_change() {
    const sw5eapi = $('[name=sw5eapi]').val();
    const conversionType = $('[name=sw5eapi]').find(':selected').attr('data-conversiontype');
    if (sw5eapi !== 'none') {
        $('[name=sourceURL]').val(sw5eapi);
        $('.sw5e-conversion-type-selection').removeClass('expanded');
        $('[name=conversiontype]').val(conversionType);
    }
    // and if there's a local file associated with this convesion type (which there eventually ought to be), update the destination url value to match
    const destination = $('[name=sw5eapi]').find(':selected').attr('data-destination') || $('[name=destinationURL]').val();
    $('[name=destinationURL]').val(destination);
    // update session storage
    saveApiSelect();
    saveApiSourceURL();
    saveJsonDestURL();
    saveConversionType();
}

/**
 * @function
 * @description if the input field's value is customized, clear out the sw5eapi dropdown
 * 	and unhide conversiontype selection dropdown.
 */
function handle_custom_sourceURL() {
    $('[name=sw5eapi]').val('none');
    $('.sw5e-conversion-type-selection').addClass('expanded');
    saveApiSelect();
    saveApiSourceURL();
}

/**
 * @function
 * @description if the conversion type dropdown selection changes, make sure to update both dropdowns
 */
function handle_conversiontype_change() {
    const conversionType = $(this).val();
    $('[name=conversiontype]').val(conversionType);
    saveConversionType()
}

/**
 * @function
 * @description if the destination URL input field is updated, save it to session storage
 */
function handle_destinationURL_input() {
        saveJsonDestURL();
}

/**
 * @function
 * @description grab the JSON from the two provided URLs and copy it inot the "paste" textareas
 */
function handle_import_JSON_from_URLs() {
    thinking(true).then(()=>{
        const sourceURL = $('[name=sourceURL]').val();
        const destinationURL = $('[name=destinationURL]').val();
        get_JSON_from_URLs(sourceURL, destinationURL).then((srcAndDestArr) => {
            editLeft.setValue(stringify(srcAndDestArr[0]), -1)
            editRight.setValue(stringify(srcAndDestArr[1]), -1)
        }).finally(() => { thinking(false); });
    });
}

/**
 * @function
 * @description grab the JSON from the two static textareas and pass it thru the convertJSON function.
 */
function handle_convert_textareas_JSON() {
    thinking(true).then(()=>{
        const leftString = editLeft.getValue();
        const rightString = editRight.getValue();
        const conversionType = $('[name=conversiontype]').val();
        const leftObj = parse(leftString);
        const rightObj = parse(rightString);
        // Main function
        convertAndMerge(leftObj, rightObj, conversionType).then((result) => {
            const convertedAndMerged = result;
            const convertedMergedStringified = patchJsonResults(stringify(convertedAndMerged), conversionType);
            editMerged.setValue(convertedMergedStringified);
            editMerged.focus();
        }).finally(() => { thinking(false); });
    });
}

/**
 * @function
 * @description apply a (mostly) invisible modal to the window and change the mouse cursor to a timer/spinning icon
 * @param onOff {Boolean} optional toggle thinking treatment on or off. if undefined, it will just toggle to the opposite of current state.
 * @return {Promise}
 */
function thinking (onOff) {
    return new Promise(function(resolve, reject) {
        $('body').toggleClass('thinking', onOff);
        setTimeout(() => {resolve()}, 0);
    });
}

/**
 * @function
 * @description grab the JSON from the two provided URLs and return it as a .then()
 */
function get_JSON_from_URLs(sourceURL, destinationURL) {
    const getSrcJSON = $.getJSON(sourceURL).then((data) => {
        return data;
    });
    const getDestJSON = $.getJSON(destinationURL).then((data) => {
        return data;
    });
    return Promise.all([getSrcJSON, getDestJSON]).then((values) => {
        return values; // the final returned value of the get_JSON_from_URLS function, an array containing a src URL obj and a dest URL obj.
    });
}

/**
 * @function
 * @description Convert a parsed SW5e API object into a valid 5eTools Object, and then merge with existing 5eTools Object
 * @param {Object} srcObj source object in valid sw5eapi structure
 * @param {Object} destObj destination object in valid 5etools structure
 * @param {String} conversionType sw5eapi database name, ex: "enhancedItem"
 * @return {Promise} returns a promise resolving with the converted and merged object in valid 5etools structure
 */
function convertAndMerge(srcObj, destObj, conversionType) {
    return new Promise(function(resolve, reject) {
        const config = getConfig(conversionType);
        if (typeof config !== 'object' || typeof config.convertTo5eToolsObj !== 'function') {
            return null;
        }

        // Convert sw5eapi object into a 5etools object
        const convertedSrcObj = config.convertTo5eToolsObj(srcObj);

        // Merge the converted source object into the existing (provided) destination object
        const mergedObj = merge5eToolsObjects(destObj, convertedSrcObj, config);

        resolve(mergedObj);
    });
}

/**
 * @function
 * @description Patch a stringified object with manual updates, defined in the convert[Type].js file
 * @param {Object} srcJson source object stringified JSON
 * @param {String} conversionType sw5eapi database name, ex: "enhancedItem"
 * @return {String} hopefully a patched JSON string
 */
function patchJsonResults(srcJson, conversionType) {
    const config = getConfig(conversionType);
    if (typeof config !== 'object' || typeof config.patchManualChanges !== 'function') {
        return null;
    }
    // Patch the stringified JSON object with manual updates
    const patchedJson = config.patchManualChanges(srcJson);
    return patchedJson;
}

function getConfig(conversionType) {
    if (conversionType === 'archetype') {
        return archetypeConfig;
    } else if (conversionType === 'class') {
        return classConfig;
    } else if (conversionType === 'enhancedItem') {
        return equipmentConfig;
    } else if (conversionType === 'equipment') {
        return equipmentConfig;
    } else if (conversionType === 'feat') {
        return featConfig;
    } else if (conversionType === 'feature') {
        return featureConfig;
    } else if (conversionType === 'monster') {
        return monsterConfig;
    } else if (conversionType === 'power') {
        return powerConfig;
    } else if (conversionType === 'species') {
        return speciesConfig;
    } else {
        alert('Unknown conversion type');
    }
}
