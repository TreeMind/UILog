define(['angular'], function (angular) {
    var uiLoggingConfig = angular.module('app.uiLoggingConfig', []);

    //enable: This is used to enable/disable the logging functionality
    //enableLog: This is used to enable/disable the trace logging functionality
    //enableError: This is used to enable/disable the error logging functionality
    //enableWarn: This is used to enable/disable the warn logging functionality
    //enableDebug: This is used to enable/disable the debug logging functionality
    //enableInfo: This is used to enable/disable the info logging functionality 
    //userInfoField: Based on this field name, the user info will be fetched from the cookies
    //apiUrl: This is the web API url which is used to send the logs to the server
    //batchSize: This flag is used to set the count to logs can be stored in the buffer
    //maxMessageLength: This flag is used to set the maximum length of the message
    //maxbufferLength: This is used to set the maximum buffer length
    //exclude: This is used to disable the logging at page level        //[{ "view": "" }],
    //loggingTimeout: This is the timeout seconds for sending the logs to the server

    //var initInjector = angular.injector(['ng']);
    //var $http = initInjector.get('$http');
    //$http.get('wwwroot/core/constants.json').then(
    //    function (response) {
    //        uiLoggingConfig.value('logConfig', response.data);
    //    }
    //);
    uiLoggingConfig.value('logConfig', {
        "apiUrl": "http://b2ml07014.mindtree.com:9840/RI/api/UILogging/",
        "batchSize": 5,
        "enable": true,
        "enableDebug": true,
        "enableError": true,
        "enableInfo": true,
        "enableLog": true,
        "enableWarn": true,
        "exclude": [{ "view": "home" }],
        "loggingTimeout": 10000,
        "maxbufferLength": 102400,
        "maxMessageLength": 1024,
        "userInfoField": "username"
    });
    return uiLoggingConfig;
});

