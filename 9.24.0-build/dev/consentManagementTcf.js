"use strict";
(self["pbjsChunk"] = self["pbjsChunk"] || []).push([["consentManagementTcf"],{

/***/ "./modules/consentManagementTcf.js":
/*!*****************************************!*\
  !*** ./modules/consentManagementTcf.js ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* unused harmony exports userCMP, consentTimeout, gdprScope, staticConsentData, requestBidsHook, resetConsentData, setConsentConfig, enrichFPDHook, setOrtbAdditionalConsent */
/* harmony import */ var _src_prebidGlobal_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../src/prebidGlobal.js */ "./src/prebidGlobal.js");
/* harmony import */ var _src_utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../src/utils.js */ "./src/utils.js");
/* harmony import */ var _src_utils_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../src/utils.js */ "./node_modules/dset/dist/index.mjs");
/* harmony import */ var _src_config_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../src/config.js */ "./src/config.js");
/* harmony import */ var _src_adapterManager_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../src/adapterManager.js */ "./src/consentHandler.js");
/* harmony import */ var _src_polyfill_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../src/polyfill.js */ "./src/polyfill.js");
/* harmony import */ var _src_pbjsORTB_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../src/pbjsORTB.js */ "./src/pbjsORTB.js");
/* harmony import */ var _src_fpd_enrichment_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../src/fpd/enrichment.js */ "./src/fpd/enrichment.js");
/* harmony import */ var _libraries_cmp_cmpClient_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../libraries/cmp/cmpClient.js */ "./libraries/cmp/cmpClient.js");
/* harmony import */ var _libraries_consentManagement_cmUtils_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../libraries/consentManagement/cmUtils.js */ "./libraries/consentManagement/cmUtils.js");

/**
 * This module adds GDPR consentManagement support to prebid.js.  It interacts with
 * supported CMPs (Consent Management Platforms) to grab the user's consent information
 * and make it available for any GDPR supported adapters to read/pass this information to
 * their system.
 */









const DEFAULT_CMP = 'iab';
const DEFAULT_CONSENT_TIMEOUT = 10000;
const CMP_VERSION = 2;
let userCMP;
let consentTimeout;
let gdprScope;
let staticConsentData;
let dsaPlatform = false;
let actionTimeout;
let consentData;
let addedConsentHook = false;

// add new CMPs here, with their dedicated lookup function
const cmpCallMap = {
  'iab': lookupIabConsent,
  'static': lookupStaticConsentData
};

/**
 * This function reads the consent string from the config to obtain the consent information of the user.
 * @param {Object} options - An object containing the callbacks.
 * @param {function(Object): void} options.onSuccess - Acts as a success callback when the value is read from config; pass along consentObject from CMP.
 * @param {function(string, ...Object?): void} [options.onError] - Acts as an error callback while interacting with CMP; pass along an error message (string) and any extra error arguments (purely for logging). Optional.
 */
function lookupStaticConsentData(_ref) {
  let {
    onSuccess,
    onError
  } = _ref;
  processCmpData(staticConsentData, {
    onSuccess,
    onError
  });
}

/**
 * This function handles interacting with an IAB compliant CMP to obtain the consent information of the user.
 * Given the async nature of the CMP's API, we pass in acting success/error callback functions to exit this function
 * based on the appropriate result.
 * @param {Object} options - An object containing the callbacks.
 * @param {function(Object): void} options.onSuccess - Acts as a success callback when CMP returns a value; pass along consentObject from CMP.
 * @param {function(string, ...Object?): void} options.onError - Acts as an error callback while interacting with CMP; pass along an error message (string) and any extra error arguments (purely for logging).
 * @param {function(Object): void} options.onEvent - Acts as an event callback for processing TCF data events from CMP.
 */
function lookupIabConsent(_ref2) {
  let {
    onSuccess,
    onError,
    onEvent
  } = _ref2;
  function cmpResponseCallback(tcfData, success) {
    (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_0__.logInfo)('Received a response from CMP', tcfData);
    if (success) {
      onEvent(tcfData);
      if (tcfData.gdprApplies === false || tcfData.eventStatus === 'tcloaded' || tcfData.eventStatus === 'useractioncomplete') {
        processCmpData(tcfData, {
          onSuccess,
          onError
        });
      }
    } else {
      onError('CMP unable to register callback function.  Please check CMP setup.');
    }
  }
  const cmp = (0,_libraries_cmp_cmpClient_js__WEBPACK_IMPORTED_MODULE_1__.cmpClient)({
    apiName: '__tcfapi',
    apiVersion: CMP_VERSION,
    apiArgs: ['command', 'version', 'callback', 'parameter']
  });
  if (!cmp) {
    return onError('TCF2 CMP not found.');
  }
  if (cmp.isDirect) {
    (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_0__.logInfo)('Detected CMP API is directly accessible, calling it now...');
  } else {
    (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_0__.logInfo)('Detected CMP is outside the current iframe where Prebid.js is located, calling it now...');
  }
  cmp({
    command: 'addEventListener',
    callback: cmpResponseCallback
  });
}

/**
 * Look up consent data and store it in the `consentData` global as well as `adapterManager.js`' gdprDataHandler.
 *
 * @param cb A callback that takes: a boolean that is true if the auction should be canceled; an error message and extra
 * error arguments that will be undefined if there's no error.
 */
function loadConsentData(cb) {
  let isDone = false;
  let timer = null;
  let onTimeout, provisionalConsent;
  let cmpLoaded = false;
  function resetTimeout(timeout) {
    if (timer != null) {
      clearTimeout(timer);
    }
    if (!isDone && timeout != null) {
      if (timeout === 0) {
        onTimeout();
      } else {
        timer = setTimeout(onTimeout, timeout);
      }
    }
  }
  function done(consentData, shouldCancelAuction, errMsg) {
    resetTimeout(null);
    isDone = true;
    _src_adapterManager_js__WEBPACK_IMPORTED_MODULE_2__.gdprDataHandler.setConsentData(consentData);
    if (typeof cb === 'function') {
      for (var _len = arguments.length, extraArgs = new Array(_len > 3 ? _len - 3 : 0), _key = 3; _key < _len; _key++) {
        extraArgs[_key - 3] = arguments[_key];
      }
      cb(shouldCancelAuction, errMsg, ...extraArgs);
    }
  }
  if (!(0,_src_polyfill_js__WEBPACK_IMPORTED_MODULE_3__.includes)(Object.keys(cmpCallMap), userCMP)) {
    done(null, false, `CMP framework (${userCMP}) is not a supported framework.  Aborting consentManagement module and resuming auction.`);
    return;
  }
  const callbacks = {
    onSuccess: data => done(data, false),
    onError: function (msg) {
      for (var _len2 = arguments.length, extraArgs = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        extraArgs[_key2 - 1] = arguments[_key2];
      }
      done(null, true, msg, ...extraArgs);
    },
    onEvent: function (consentData) {
      provisionalConsent = consentData;
      if (cmpLoaded) return;
      cmpLoaded = true;
      if (actionTimeout != null) {
        resetTimeout(actionTimeout);
      }
    }
  };
  onTimeout = () => {
    const continueToAuction = data => {
      done(data, false, `${cmpLoaded ? 'Timeout waiting for user action on CMP' : 'CMP did not load'}, continuing auction...`);
    };
    processCmpData(provisionalConsent, {
      onSuccess: continueToAuction,
      onError: () => continueToAuction(storeConsentData(undefined))
    });
  };
  cmpCallMap[userCMP](callbacks);
  if (!(actionTimeout != null && cmpLoaded)) {
    resetTimeout(consentTimeout);
  }
}

/**
 * If consentManagement module is enabled (ie included in setConfig), this hook function will attempt to fetch the
 * user's encoded consent string from the supported CMP.  Once obtained, the module will store this
 * data as part of a gdprConsent object which gets transferred to adapterManager's gdprDataHandler object.
 * This information is later added into the bidRequest object for any supported adapters to read/pass along to their system.
 * @param {object} reqBidsConfigObj required; This is the same param that's used in pbjs.requestBids.
 * @param {function} fn required; The next function in the chain, used by hook.js
 */
const requestBidsHook = (0,_libraries_consentManagement_cmUtils_js__WEBPACK_IMPORTED_MODULE_4__.consentManagementHook)('gdpr', () => consentData, loadConsentData);

/**
 * This function checks the consent data provided by CMP to ensure it's in an expected state.
 * If it's bad, we call `onError`
 * If it's good, then we store the value and call `onSuccess`
 */
function processCmpData(consentObject, _ref3) {
  let {
    onSuccess,
    onError
  } = _ref3;
  function checkData() {
    // if CMP does not respond with a gdprApplies boolean, use defaultGdprScope (gdprScope)
    const gdprApplies = consentObject && typeof consentObject.gdprApplies === 'boolean' ? consentObject.gdprApplies : gdprScope;
    const tcString = consentObject && consentObject.tcString;
    return !!(typeof gdprApplies !== 'boolean' || gdprApplies === true && (!tcString || !(0,_src_utils_js__WEBPACK_IMPORTED_MODULE_0__.isStr)(tcString)));
  }
  if (checkData()) {
    onError(`CMP returned unexpected value during lookup process.`, consentObject);
  } else {
    onSuccess(storeConsentData(consentObject));
  }
}

/**
 * Stores CMP data locally in module to make information available in adaptermanager.js for later in the auction
 * @param {object} cmpConsentObject required; an object representing user's consent choices (can be undefined in certain use-cases for this function only)
 */
function storeConsentData(cmpConsentObject) {
  consentData = {
    consentString: cmpConsentObject ? cmpConsentObject.tcString : undefined,
    vendorData: cmpConsentObject || undefined,
    gdprApplies: cmpConsentObject && typeof cmpConsentObject.gdprApplies === 'boolean' ? cmpConsentObject.gdprApplies : gdprScope
  };
  if (cmpConsentObject && cmpConsentObject.addtlConsent && (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_0__.isStr)(cmpConsentObject.addtlConsent)) {
    consentData.addtlConsent = cmpConsentObject.addtlConsent;
  }
  consentData.apiVersion = CMP_VERSION;
  return consentData;
}

/**
 * Simply resets the module's consentData variable back to undefined, mainly for testing purposes
 */
function resetConsentData() {
  consentData = undefined;
  userCMP = undefined;
  consentTimeout = undefined;
  _src_adapterManager_js__WEBPACK_IMPORTED_MODULE_2__.gdprDataHandler.reset();
}

/**
 * A configuration function that initializes some module variables, as well as add a hook into the requestBids function
 * @param {{cmp:string, timeout:number, defaultGdprScope:boolean}} config required; consentManagement module config settings; cmp (string), timeout (int))
 */
function setConsentConfig(config) {
  // if `config.gdpr`, `config.usp` or `config.gpp` exist, assume new config format.
  // else for backward compatability, just use `config`
  config = config && (config.gdpr || config.usp || config.gpp ? config.gdpr : config);
  if (!config || typeof config !== 'object') {
    (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_0__.logWarn)('consentManagement (gdpr) config not defined, exiting consent manager');
    return;
  }
  if ((0,_src_utils_js__WEBPACK_IMPORTED_MODULE_0__.isStr)(config.cmpApi)) {
    userCMP = config.cmpApi;
  } else {
    userCMP = DEFAULT_CMP;
    (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_0__.logInfo)(`consentManagement config did not specify cmp.  Using system default setting (${DEFAULT_CMP}).`);
  }
  if ((0,_src_utils_js__WEBPACK_IMPORTED_MODULE_0__.isNumber)(config.timeout)) {
    consentTimeout = config.timeout;
  } else {
    consentTimeout = DEFAULT_CONSENT_TIMEOUT;
    (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_0__.logInfo)(`consentManagement config did not specify timeout.  Using system default setting (${DEFAULT_CONSENT_TIMEOUT}).`);
  }
  actionTimeout = (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_0__.isNumber)(config.actionTimeout) ? config.actionTimeout : null;

  // if true, then gdprApplies should be set to true
  gdprScope = config.defaultGdprScope === true;
  dsaPlatform = !!config.dsaPlatform;
  (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_0__.logInfo)('consentManagement module has been activated...');
  if (userCMP === 'static') {
    if ((0,_src_utils_js__WEBPACK_IMPORTED_MODULE_0__.isPlainObject)(config.consentData)) {
      staticConsentData = config.consentData;
      if (staticConsentData?.getTCData != null) {
        // accept static config with or without `getTCData` - see https://github.com/prebid/Prebid.js/issues/9581
        staticConsentData = staticConsentData.getTCData;
      }
      consentTimeout = 0;
    } else {
      (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_0__.logError)(`consentManagement config with cmpApi: 'static' did not specify consentData. No consents will be available to adapters.`);
    }
  }
  if (!addedConsentHook) {
    (0,_src_prebidGlobal_js__WEBPACK_IMPORTED_MODULE_5__.getGlobal)().requestBids.before(requestBidsHook, 50);
  }
  addedConsentHook = true;
  _src_adapterManager_js__WEBPACK_IMPORTED_MODULE_2__.gdprDataHandler.enable();
  loadConsentData(); // immediately look up consent data to make it available without requiring an auction
}
_src_config_js__WEBPACK_IMPORTED_MODULE_6__.config.getConfig('consentManagement', config => setConsentConfig(config.consentManagement));
function enrichFPDHook(next, fpd) {
  return next(fpd.then(ortb2 => {
    const consent = _src_adapterManager_js__WEBPACK_IMPORTED_MODULE_2__.gdprDataHandler.getConsentData();
    if (consent) {
      if (typeof consent.gdprApplies === 'boolean') {
        (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_7__.dset)(ortb2, 'regs.ext.gdpr', consent.gdprApplies ? 1 : 0);
      }
      (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_7__.dset)(ortb2, 'user.ext.consent', consent.consentString);
    }
    if (dsaPlatform) {
      (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_7__.dset)(ortb2, 'regs.ext.dsa.dsarequired', 3);
    }
    return ortb2;
  }));
}
_src_fpd_enrichment_js__WEBPACK_IMPORTED_MODULE_8__.enrichFPD.before(enrichFPDHook);
function setOrtbAdditionalConsent(ortbRequest, bidderRequest) {
  // this is not a standardized name for addtlConsent, so keep this as an ORTB library processor rather than an FPD enrichment
  const addtl = bidderRequest.gdprConsent?.addtlConsent;
  if (addtl && typeof addtl === 'string') {
    (0,_src_utils_js__WEBPACK_IMPORTED_MODULE_7__.dset)(ortbRequest, 'user.ext.ConsentedProvidersSettings.consented_providers', addtl);
  }
}
(0,_src_pbjsORTB_js__WEBPACK_IMPORTED_MODULE_9__.registerOrtbProcessor)({
  type: _src_pbjsORTB_js__WEBPACK_IMPORTED_MODULE_9__.REQUEST,
  name: 'gdprAddtlConsent',
  fn: setOrtbAdditionalConsent
});
(0,_src_prebidGlobal_js__WEBPACK_IMPORTED_MODULE_5__.registerModule)('consentManagementTcf');

/***/ })

},
/******/ __webpack_require__ => { // webpackRuntimeModules
/******/ var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
/******/ __webpack_require__.O(0, ["chunk-core","cmp","consentManagement","creative-renderer-display"], () => (__webpack_exec__("./modules/consentManagementTcf.js")));
/******/ var __webpack_exports__ = __webpack_require__.O();
/******/ }
]);
//# sourceMappingURL=consentManagementTcf.js.map