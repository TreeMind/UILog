define(['angular', 'ui.router', 'jsnlog', 'angular.cookies', 'app.uiLoggingConfig', 'jsnlogExt'],
function (angular) {

    //Module definition
    var module = angular.module('app.uiLogging', ['ngCookies', 'app.uiLoggingConfig', 'ui.router'])

    //$log service definition    
    .service('$log', function (logConfig) {

        // Create the required service instances
        var ngInjector = angular.injector(['ng']);
        var $timeout = ngInjector.get('$timeout');
        var $window = ngInjector.get('$window');

        // Create the Logger instance and Appender instance
        var logger = JL('Angular');
        var ajaxAppender = JL.createAjaxAppender("ajaxAppender");

        // This method is used to switch on/off the logging functionality
        var enable = function (flag) {
            JL.setOptions({
                'enabled': flag
            });
        };
        this.enable = enable;

        // The below variables are used to switch on/off each level of logging functionality
        this.enableLog = logConfig.enableLog;
        this.enableError = logConfig.enableError;
        this.enableWarn = logConfig.enableWarn;
        this.enableDebug = logConfig.enableDebug;
        this.enableInfo = logConfig.enableInfo;
        this.enablefatalException = logConfig.enablefatalException;

        // This method is used to reset the switch on/off flags
        var resetEnableOptions = function () {
            //alert("reset" + logConfig.enable);
            this.enable(logConfig.enable);
            this.enableLog = logConfig.enableLog;
            this.enableError = logConfig.enableError;
            this.enableWarn = logConfig.enableWarn;
            this.enableDebug = logConfig.enableDebug;
            this.enableInfo = logConfig.enableInfo;
            this.enablefatalException = logConfig.enablefatalException;
            return true;
        };
        this.resetEnableOptions = resetEnableOptions;

        // This method is used to return the request id
        var getRequestId = function () {
            var reqId = '';
            reqId = new Date().getTime();
            return reqId;
        };
        this.getRequestId = getRequestId;

        // This method is used to get the user info
        var getUserInfo = function () {
            var userInfo = '';
            var initInjector = angular.injector(['ngCookies']);
            var $cookies = initInjector.get('$cookies');
            if ($cookies.get(logConfig.userInfoField)) {
                userInfo = $cookies.get(logConfig.userInfoField);
            }

            return userInfo;
        };
        this.getUserInfo = getUserInfo;

        // This method is used to get the pixel info
        var getPixelInfo = function () {
            return window.outerWidth + "*" + window.outerHeight;
        };
        this.getPixelInfo = getPixelInfo;

        // This method will save the message into the buffer and it will send the log items to the server based on the sendflag
        // This method will send the log items to the server if the buffer size reaches the maximum buffer length
        // It returns the status & batch buffer
        var send = function (level, msg, sendFlag) {

            if (level == JL.getInfoLevel()) {
                logger.info(msg);
            }
            else if (level == JL.getDebugLevel()) {
                logger.debug(msg);
            }
            else if (level == JL.getWarnLevel()) {
                logger.warn(msg);
            }
            else if (level == JL.getErrorLevel()) {
                logger.error(msg);
            }
            else if (level == JL.getTraceLevel()) {
                logger.trace(msg);
            }
            if (sendFlag === true) {
                if (ajaxAppender.batchBuffer.length > 0) {
                    ajaxAppender.sendLogItemsAjax(ajaxAppender.batchBuffer);
                    ajaxAppender.batchBuffer.length = 0;
                }
            }
            else {
                var batchBufferLength = 0;
                for (var index in ajaxAppender.batchBuffer) {
                    batchBufferLength += ajaxAppender.batchBuffer[index].Message.length;
                }
                if (batchBufferLength > logConfig.maxbufferLength) {
                    ajaxAppender.sendLogItemsAjax(ajaxAppender.batchBuffer);
                    ajaxAppender.batchBuffer.length = 0;
                }
            }
            return { status: true, batchBuffer: ajaxAppender.batchBuffer };
        };
        this.send = send;

        // This method will be called from the methods log, info, warn, error & debug
        // This will check the msg & level whether those are valid or not
        // If the time is undefined then it will only push the log message into the buffer
        // If the time is 0 then it will send the log items which are in the buffer to the server immediately
        // If the time is 10 sec. then it will send the log items which are in the buffer to the server post 10 sec.
        var sendLog = function (level, msg, time) {

            var response = { status: null, batchBuffer: null };

            if (msg === '' || msg === null || msg === undefined) {
                response.status = false;
                return response;
            }
            if (level != JL.getInfoLevel() && level != JL.getDebugLevel() && level != JL.getWarnLevel() && level != JL.getErrorLevel() && level != JL.getTraceLevel()) {
                response.status = false;
                return response;
            }
            var sendFlag = true;
            if (time === undefined) {
                sendFlag = false;
                time = 0;
            }

            var msgLength = msg.length;
            if (msgLength > logConfig.maxMessageLength)
                msgLength = logConfig.maxMessageLength;

            msg = msg.toString().substring(0, msgLength);

            $timeout(send(level, msg, sendFlag), time);
            return { status: true, batchBuffer: ajaxAppender.batchBuffer };
        };
        this.sendLog = sendLog;

        // This method is used to push a trace message
        var log = function (msg, time) {
            if (logConfig.enableLog === false)
                return { status: false, batchBuffer: null };
            return this.sendLog(JL.getTraceLevel(), msg, time);
        };
        this.log = log;

        // This method is used to push a debug message
        var debug = function (msg, time) {
            if (logConfig.enableDebug === false)
                return { status: false, batchBuffer: null };
            return this.sendLog(JL.getDebugLevel(), msg, time);
        };
        this.debug = debug;

        // This method is used to push a info message
        var info = function (msg, time) {
            if (logConfig.enableInfo === false)
                return { status: false, batchBuffer: null };
            return sendLog(JL.getInfoLevel(), msg, time);
        };
        this.info = info;

        // This method is used to push a warning message
        var warn = function (msg, time) {
            if (logConfig.enableWarn === false)
                return { status: false, batchBuffer: null };
            return this.sendLog(JL.getWarnLevel(), msg, time);
        };
        this.warn = warn;

        // This method is used to push an error message
        var error = function (msg, time) {
            if (logConfig.enableError === false)
                return { status: false, batchBuffer: null };
            return this.sendLog(JL.getErrorLevel(), msg, time);
        };
        this.error = error;

        // This method is used to set the request id
        // This method is defined in jsnlog's library
        JL.setOptions({
            'requestId': this.getRequestId()
        });

        // This method is used to set the user info, pixel info & logging time out details
        // This method is defined in jsnlog's extended library.  This library is over written the some of the jsnlog's methods and parameters
        JL.setOptionsSub({
            'userInfo': this.getUserInfo(),
            'pixelInfo': this.getPixelInfo(),
            'loggingTimeout': logConfig.loggingTimeout
        });

        // This method is used to configure the appender
        ajaxAppender.setOptions({
            "batchSize": logConfig.batchSize,
            "beforeSend": JL.beforeSendLogToServer,
            'url': logConfig.apiUrl,
        });

        // This method is used to configure the logger
        logger.setOptions({
            "appenders": [ajaxAppender],
            "level": 1000
        });

        // This method will be called while the window is refreshed/closed
        // This method will send the pending log items which are already in the buffer
        var beforeunload = function (event) {
            var message = 'Are you want to close?';
            if (typeof event == 'undefined') {
                event = window.event;
            }
            if (event) {
                event.returnValue = message;
            }
            info('Browser is closed', 0);
            return message;
        };
        this.beforeunload = beforeunload;
        $window.onbeforeunload = beforeunload;
    })

    // This factory is overwritten on the angular's exceptionHandler
    // This factory will send the fatal exception message to the buffer
    .factory('$exceptionHandler', function (logConfig) {
        return function (exception, cause) {
            var msgLength = exception.length;
            if (msgLength > logConfig.maxMessageLength)
                msgLength = logConfig.maxMessageLength;
            exception = exception.toString().substring(0, msgLength);
            JL('Angular').fatalException(cause, exception);
            throw exception;
        };
    })

    // This factory defines an interceptor and it will be included in the httpprovider's interceptor bucket
    // This factory contains three methods request, response, responseError
    .factory('logToServerInterceptor', ['$q', 'logConfig', function ($q, logConfig) {

        // Creates a Logger instance
        var ajaxLogger = JL('Angular.Ajax');

        //Creates a Appender instance
        var ajaxAppender = JL.createAjaxAppender("ajaxAppender");

        ajaxAppender.setOptions({
            "beforeSend": JL.beforeSendLogToServer,
            'url': logConfig.apiUrl
        });
        ajaxLogger.setOptions({
            "appenders": [ajaxAppender]
        });

        var myInterceptor = {
            // This method will set the time before the ajax call is hit
            'request': function (config) {
                config.msBeforeAjaxCall = new Date().getTime();
                return config;
            },
            //This method will check whether the response is received within the warning time
            // If the response message is received after the warning time then it will push an warning message to the server immediately
            'response': function (response) {
                if (response.config.warningAfter) {
                    var msAfterAjaxCall = new Date().getTime();
                    var timeTakenInMs = msAfterAjaxCall - response.config.msBeforeAjaxCall;
                    if (timeTakenInMs > response.config.warningAfter) {
                        ajaxLogger.warn({ "timeTakenInMs": timeTakenInMs, config: response.config, data: response.data });
                    }
                }
                return response;
            },
            //This method will be called while an exception is occured during the ajax calls
            // This method will push an exception message to the server immediately
            'responseError': function (rejection) {
                var errorMessage = "timeout";
                if (rejection && rejection.status && rejection.data) {
                    errorMessage = rejection.data.ExceptionMessage;
                }
                ajaxLogger.fatalException({ errorMessage: errorMessage, status: rejection.status, config: rejection.config }, rejection.data);
                return $q.reject(rejection);
            }
        };
        return myInterceptor;
    }])

    // This method will be called while the state is changed
    // The switch on/off flags have been reset
    // Page level switch on/off option will be checked and the logging will be disabled if it doesn't require for the current state
    .run(function ($rootScope, $state, $log, logConfig) {
        //alert('run');

        /*  while changing the state, the session will be checked here */
        $rootScope.$on("$stateChangeStart", function (event, toState, toParams, fromState, fromParams) {

            $log.resetEnableOptions();

            for (var index in logConfig.exclude) {
                var file = logConfig.exclude[index].view;
                var patt = new RegExp(file);
                if (patt.test(toState.name)) {
                    $log.enable(false);
                }
            }
        });
    })

    // The above written interceptor factory is added to the httpprovider's interceptor bucket
    .config(['$httpProvider', function ($httpProvider) {
        $httpProvider.interceptors.push('logToServerInterceptor');
    }]);

    return module;
});

