/** @jsx React.DOM */

/*
 * Create and return a React mixin which fetches data from url, getting all
 * .next pages. If successful, calls setState() with the .dataFieldName set to
 * the concatenated results and .successFieldName set to true.
 * If an error happens, calls setState() with .errorFieldName set to a
 * non-empty string.
 *
 * Use this with the Django REST Framework.
 *
 * The mixins work at ‘componentDidMount’ time, but don't provide a refresh()
 * method for you to call programmatically (and manually calling
 * componentDidMount() seems a bad idea).
 * To do manual refreshes, use compFetchRest() below.
 */
function getRestLoaderMixin(url, dataFieldName,
        successFieldName, errorFieldName) {
    return {
        componentDidMount: function() {
            compFetchRest.bind(this)(url, dataFieldName,
                    successFieldName, errorFieldName);
        }
    };
};


/*
 * Fetch data from Django REST Framework (and subsequent pages) and setState()
 * on the React Component. You must set ‘this’ to a React component when
 * running this function.
 * Similar to getRestLoaderMixin(), but you can call this repeatedly.
 * Could be better named.
 */
function compFetchRest(url, dataFieldName, successFieldName, errorFieldName) {
    var data = [];
    function fetch() {
        if (!url) {
            var newState = {};
            newState[dataFieldName] = data;
            newState[successFieldName] = true;
            this.setState(newState);
            return;
        }

        $.ajax({
            url: url,
            success: (function(newData) {
                data = data.concat(newData.results);
                url = newData.next;
                fetch.bind(this)();
            }).bind(this),
            error: (function(xhr, txtStatus, saveErr) {
                console.log('error', xhr, txtStatus, saveErr);
                var errTxt = 'Error';
                if (xhr.responseText) {
                    try {
                        // JSON response is an explanation of the problem.
                        // Anything else is probably a huge html page
                        // describing server misconfiguration.
                        errTxt += ': ' + JSON.stringify(
                            JSON.parse(xhr.responseText));
                    } catch (exc) {
                        // json parsing error
                    }
                }

                var newState = {};
                newState[errorFieldName] = errTxt;
                this.setState(newState);
            }).bind(this)
        });
    }
    fetch.bind(this)();
}

/*
 * Shallow clone a plain JS object.
 */
function clone(obj) {
    var result = {};
    for (var k in obj) {
        result[k] = obj[k];
    }
    return result;
}

/*
 * Return a string describing the error, from the args of jQuery's ajax.error
 * function.
 */
function getAjaxErr(xhr, txtStatus, saveErr) {
    console.log('error', xhr, txtStatus, saveErr);
    var errTxt = 'Error';
    if (xhr.responseText) {
        try {
            // JSON response is an explanation of the problem.
            // Anything else is probably a huge html page
            // describing server misconfiguration.
            errTxt += ': ' + JSON.stringify(JSON.parse(xhr.responseText));
        } catch (exc) {
            // json parsing error
        }
    }
    return errTxt;
}
