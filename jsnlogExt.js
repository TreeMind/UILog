define(['jsnlog'], function () {

    JL.userInfo = "";
    JL.pixelInfo = "";
    JL.loggingTimeout = 10000;

    var changeDateFormat = function (date) {

        var monthname = new Array([]);
        monthname[0] = "Jan";
        monthname[1] = "Feb";
        monthname[2] = "Mar";
        monthname[3] = "Apr";
        monthname[4] = "May";
        monthname[5] = "Jun";
        monthname[6] = "Jul";
        monthname[7] = "Aug";
        monthname[8] = "Sep";
        monthname[9] = "Oct";
        monthname[10] = "Nov";
        monthname[11] = "Dec";

        year = "" + date.getFullYear();
        month = "" + monthname[date.getMonth()];//(date.getMonth() + 1); if (month.length == 1) { month = "0" + month; }
        day = "" + date.getDate(); if (day.length == 1) { day = "0" + day; }
        hour = "" + date.getHours(); if (hour.length == 1) { hour = "0" + hour; }
        minute = "" + date.getMinutes(); if (minute.length == 1) { minute = "0" + minute; }
        second = "" + date.getSeconds(); if (second.length == 1) { second = "0" + second; }
        return day + "-" + month + "-" + year + " " + hour + ":" + minute + ":" + second;
    };
    JL.changeDateFormat = changeDateFormat;


    var beforeSendLogToServer = function (xhr) {
        // Replace send function with one that saves the message in the xhr, for
        // use when response indicates failure.
        xhr.originalSend = xhr.send;
        xhr.send = function (msg) {
            xhr.msg = msg; // Store message in xhr
            xhr.originalSend(msg);
        };
        // Set response handler that checks if response received (readyState == 4)
        // and response status is not 200 (OK). In that case, do something to deal with
        // failure to log the message.
        xhr.onreadystatechange = function () {
            if (xhr.readyState != 4) { return; }
            if (xhr.status == 200) { return; }
            console.log('Cannot log to server. Status: ' + xhr.status + '. Messsage: ' + xhr.msg);
        };
        // Handle timeouts
        xhr.timeout = JL.LoggingTimeout; // set timeout to 10 seconds
        xhr.ontimeout = function () {
            console.log('Cannot log to server. Timed out after ' + xhr.timeout + ' ms. Messsage: ' + xhr.msg);
        };
    };
    JL.beforeSendLogToServer = beforeSendLogToServer;

    function copyProperty(propertyName, from, to) {
        if (from[propertyName] === undefined) {
            return;
        }
        if (from[propertyName] === null) {
            delete to[propertyName];
            return;
        }
        to[propertyName] = from[propertyName];
    }
    function setOptionsSub(options) {
        copyProperty("userInfo", options, this);
        copyProperty("pixelInfo", options, this);
        copyProperty("loggingTimeout", options, this);
        return this;
    }
    JL.setOptionsSub = setOptionsSub;
    // ---------------------

    var LogItem = (function () {

        // l: level
        // m: message
        // n: logger name
        // t (timeStamp) is number of milliseconds since 1 January 1970 00:00:00 UTC
        //
        // Keeping the property names really short, because they will be sent in the
        // JSON payload to the server.
        function LogItem(l, m, n, t, s) {

            this.Level = l;
            this.Message = m;
            this.LoggerName = n;
            this.DateTime = t;
            this.Source = s;
        }
        return LogItem;
    })();
    JL.LogItem = LogItem;

    JL.Appender.prototype.log = function (level, msg, meta, callback, levelNbr, message, loggerName) {

        var logItem;

        if (!allow(this)) {
            return;
        }
        if (!allowMessage(this, message)) {
            return;
        }

        if (levelNbr < this.storeInBufferLevel) {
            // Ignore the log item completely
            return;
        }

        logItem = new LogItem(levelNbr, message, loggerName, JL.changeDateFormat(new Date()), window.location.hash);

        if (levelNbr < this.level) {
            // Store in the hold buffer. Do not send.
            if (this.bufferSize > 0) {
                this.buffer.push(logItem);

                // If we exceeded max buffer size, remove oldest item
                if (this.buffer.length > this.bufferSize) {
                    this.buffer.shift();
                }
            }

            return;
        }

        if (levelNbr < this.sendWithBufferLevel) {
            // Want to send the item, but not the contents of the buffer
            this.batchBuffer.push(logItem);
        } else {
            // Want to send both the item and the contents of the buffer.
            // Send contents of buffer first, because logically they happened first.
            if (this.buffer.length) {
                this.batchBuffer = this.batchBuffer.concat(this.buffer);
                this.buffer.length = 0;
            }
            this.batchBuffer.push(logItem);
        }

        if (this.batchBuffer.length >= this.batchSize) {
            this.sendBatch();
            return;
        }

    };


    JL.AjaxAppender.prototype.sendLogItemsAjax = function (logItems) {

        try {
            // Only determine the url right before you send a log request.
            // Do not set the url when constructing the appender.
            //
            // This is because the server side component sets defaultAjaxUrl
            // in a call to setOptions, AFTER the JL object and the default appender
            // have been created.
            var ajaxUrl = "/jsnlog.logger";

            // This evaluates to true if defaultAjaxUrl is null or undefined
            if ((JL.defaultAjaxUrl !== null)) {
                ajaxUrl = JL.defaultAjaxUrl;
            }

            if (this.url) {
                ajaxUrl = this.url;
            }

            var json = JSON.stringify({
                RequestId: JL.requestId,
                UserInfo: JL.userInfo,
                Pixel: JL.pixelInfo,
                LogItem: logItems
            });

            // Send the json to the server.
            // Note that there is no event handling here. If the send is not
            // successful, nothing can be done about it.
            var xhr = this.getXhr(ajaxUrl);

            // call beforeSend callback
            // first try the callback on the appender
            // then the global defaultBeforeSend callback
            if (typeof this.beforeSend === 'function') {
                this.beforeSend(xhr);
            } else if (typeof JL.defaultBeforeSend === 'function') {
                JL.defaultBeforeSend(xhr);
            }

            xhr.send(json);
        } catch (e) {

        }
    };

    /**
    Returns true if a log should go ahead.
    Does not check level.
    
    @param filters
    Filters that determine whether a log can go ahead.
    */

    function allow(filters) {
        // If enabled is not null or undefined, then if it is false, then return false
        // Note that undefined==null (!)
        if ((JL.enabled !== null)) {
            if (!JL.enabled) {
                return false;
            }
        }

        // If maxMessages is not null or undefined, then if it is 0, then return false.
        // Note that maxMessages contains number of messages that are still allowed to send.
        // It is decremented each time messages are sent. It can be negative when batch size > 1.
        // Note that undefined==null (!)
        if ((JL.maxMessages !== null)) {
            if (JL.maxMessages < 1) {
                return false;
            }
        }

        try {
            if (filters.userAgentRegex) {
                if (!new RegExp(filters.userAgentRegex).test(navigator.userAgent)) {
                    return false;
                }
            }
        } catch (e) {
        }

        try {
            if (filters.ipRegex && JL.clientIP) {
                if (!new RegExp(filters.ipRegex).test(JL.clientIP)) {
                    return false;
                }
            }
        } catch (e) {
        }

        return true;
    }

    /**
    Returns true if a log should go ahead, based on the message.
    
    @param filters
    Filters that determine whether a log can go ahead.
    
    @param message
    Message to be logged.
    */
    function allowMessage(filters, message) {
        try {
            if (filters.disallow) {
                if (new RegExp(filters.disallow).test(message)) {
                    return false;
                }
            }
        } catch (e) {
        }

        return true;
    }

});

